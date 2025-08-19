
'use client';

import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TestCharacterManager } from './test-character-manager';
import type { Student } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, writeBatch, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Swords, Play, Square, FastForward, StopCircle, Bot, Loader2, Skull, Timer, Lightbulb, HeartCrack, CheckCircle, Video } from 'lucide-react';
import { RoundResults, type Result } from '@/components/teacher/round-results';
import Image from 'next/image';
import { PowersSheet } from '@/components/dashboard/powers-sheet';

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
  damage: number;
}

interface BossBattle {
    id: string;
    battleName: string;
    questions: Question[];
    bossImageUrl?: string;
    videoUrl?: string;
}

interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'ROUND_ENDING' | 'SHOWING_RESULTS' | 'BATTLE_ENDED';
  currentQuestionIndex: number;
  timerEndsAt?: { seconds: number; nanoseconds: number; };
  lastRoundDamage?: number;
  totalDamage?: number;
  powerEventMessage?: string;
  targetedEvent?: { targetUid: string, message: string } | null;
  fallenPlayerUids?: string[];
  [key: string]: any; 
}

const testBattleData: BossBattle = {
    id: 'static-test-battle',
    battleName: 'The Unflappable Test Golem',
    bossImageUrl: 'https://placehold.co/600x400.png',
    videoUrl: '',
    questions: [
        { questionText: 'Question 1', answers: ['Correct Answer', 'Incorrect Answer', 'Incorrect Answer', 'Incorrect Answer'], correctAnswerIndex: 0, damage: 1 },
        { questionText: 'Question 2', answers: ['Correct Answer', 'Incorrect Answer', 'Incorrect Answer', 'Incorrect Answer'], correctAnswerIndex: 0, damage: 1 },
        { questionText: 'Question 3', answers: ['Correct Answer', 'Incorrect Answer', 'Incorrect Answer', 'Incorrect Answer'], correctAnswerIndex: 0, damage: 1 },
        { questionText: 'Question 4', answers: ['Correct Answer', 'Incorrect Answer', 'Incorrect Answer', 'Incorrect Answer'], correctAnswerIndex: 0, damage: 1 },
        { questionText: 'Question 5', answers: ['Correct Answer', 'Incorrect Answer', 'Incorrect Answer', 'Incorrect Answer'], correctAnswerIndex: 0, damage: 1 },
    ]
};


export function BattleTestPanel({ adminUid }: { adminUid: string }) {
    const { toast } = useToast();
    const [liveState, setLiveState] = useState<LiveBattleState | null>(null);
    const [studentResponses, setStudentResponses] = useState<Result[]>([]);
    const [testStudents, setTestStudents] = useState<Student[]>([]);
    const [fallenStudentNames, setFallenStudentNames] = useState<string[]>([]);
    const [selectedStudentForPowers, setSelectedStudentForPowers] = useState<Student | null>(null);
    const [isPowersSheetOpen, setIsPowersSheetOpen] = useState(false);
    const [lastAnswerCorrect, setLastAnswerCorrect] = useState<{[key: string]: boolean | null}>({});

    const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
    
    // Listen to live test battle state
    useEffect(() => {
        const unsubscribe = onSnapshot(liveBattleRef, (doc) => {
            if (doc.exists()) {
                const newState = doc.data() as LiveBattleState;
                // If question changes, reset answer correctness
                if (liveState && newState.currentQuestionIndex !== liveState.currentQuestionIndex) {
                    setLastAnswerCorrect({});
                }
                setLiveState(newState);
            } else {
                setLiveState(null);
            }
        });
        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adminUid]);

    useEffect(() => {
        if (!liveState || (liveState.status !== 'IN_PROGRESS' && liveState.status !== 'ROUND_ENDING')) {
            setStudentResponses([]);
            return;
        }
        const responsesRef = collection(db, 'admins', adminUid, `testBattle/active-battle/responses`);
        const unsubscribe = onSnapshot(responsesRef, (querySnapshot) => {
            const responses: Result[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                responses.push({
                    studentName: data.characterName,
                    answer: data.answer,
                    isCorrect: data.isCorrect,
                });
            });
            setStudentResponses(responses);
        });
        return () => unsubscribe();
    }, [liveState, adminUid]);

    useEffect(() => {
        if (!liveState?.fallenPlayerUids) {
            setFallenStudentNames([]);
            return;
        }
        const names = testStudents
            .filter(s => liveState.fallenPlayerUids!.includes(s.uid))
            .map(s => s.characterName);
        setFallenStudentNames(names);
    }, [liveState?.fallenPlayerUids, testStudents]);

    // This effect handles the power logic by listening to a temporary collection.
    useEffect(() => {
        if (!liveState || !adminUid) return;

        const powerActivationsRef = collection(db, 'admins', adminUid, 'testBattle/active-battle/powerActivations');
        const unsubscribe = onSnapshot(powerActivationsRef, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const activation = change.doc.data();
                    const caster = testStudents.find(s => s.uid === activation.studentUid);
                    
                    if (!caster || caster.mp < activation.powerMpCost) return;

                    const batch = writeBatch(db);
                    const casterRef = doc(db, 'admins', adminUid, 'testStudents', caster.uid);
                    
                    batch.update(casterRef, { mp: increment(-activation.powerMpCost) });

                    let publicMessage = `${caster.characterName} used ${activation.powerName}!`;
                    let targetedEvent = null;

                    if (activation.powerName === 'Nature’s Guidance') {
                        const indices = testBattleData.questions[liveState.currentQuestionIndex].answers
                            .map((_, i) => i)
                            .filter(i => i !== testBattleData.questions[liveState.currentQuestionIndex].correctAnswerIndex);
                        batch.update(liveBattleRef, { removedAnswerIndices: arrayUnion(indices[0]) });
                    }
                    if (activation.powerName === 'Enduring Spirit' && activation.targets?.length > 0) {
                        const targetUid = activation.targets[0];
                        const targetRef = doc(db, 'admins', adminUid, 'testStudents', targetUid);
                         batch.update(targetRef, { hp: 5 }); // Revive with 5 HP
                         batch.update(liveBattleRef, { fallenPlayerUids: arrayRemove(targetUid) });
                         const targetStudent = testStudents.find(s => s.uid === targetUid);
                         publicMessage = `${caster.characterName} revived ${targetStudent?.characterName || 'an ally'}!`;
                         targetedEvent = { targetUid: targetUid, message: `${caster.characterName} revived you!` };
                    }

                    batch.update(liveBattleRef, { powerEventMessage: publicMessage, targetedEvent: targetedEvent });
                    await batch.commit();

                    await deleteDoc(change.doc.ref);
                    
                    setTimeout(() => updateDoc(liveBattleRef, { powerEventMessage: '', targetedEvent: null }), 5000);
                }
            });
        });

        return () => unsubscribe();
    }, [liveState, adminUid, testStudents]);


    const handleActivateTest = async () => {
        const battleDocRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
        await setDoc(battleDocRef, {
            battleId: testBattleData.id,
            status: 'WAITING',
            currentQuestionIndex: 0,
            totalDamage: 0,
        });
        toast({ title: 'Test Battle Activated' });
    };

    const handleStartRound = async () => {
        if (!liveState) return;
        await setDoc(liveBattleRef, { status: 'IN_PROGRESS', fallenPlayerUids: [] }, { merge: true });
    };

    const handleEndRoundAndShowResults = async () => {
        if (!liveState) return;
        const responsesRef = collection(db, 'admins', adminUid, `testBattle/active-battle/responses`);
        const responsesSnapshot = await getDocs(responsesRef);
        const correctAnswers = responsesSnapshot.docs.filter(doc => doc.data().isCorrect).length;
        
        const batch = writeBatch(db);
        const fallenUids: string[] = liveState.fallenPlayerUids || [];
        responsesSnapshot.docs.forEach(docSnap => {
            if (!docSnap.data().isCorrect) {
                const studentRef = doc(db, 'admins', adminUid, 'testStudents', docSnap.id);
                batch.update(studentRef, { hp: increment(-testBattleData.questions[liveState.currentQuestionIndex].damage) });
                
                const studentData = testStudents.find(s => s.uid === docSnap.id);
                if (studentData && studentData.hp - testBattleData.questions[liveState.currentQuestionIndex].damage <= 0) {
                    fallenUids.push(studentData.uid);
                }
            }
        });

        await batch.commit();

        await setDoc(liveBattleRef, { 
            status: 'SHOWING_RESULTS',
            lastRoundDamage: correctAnswers, 
            totalDamage: (liveState.totalDamage || 0) + correctAnswers,
            fallenPlayerUids: fallenUids,
        }, { merge: true });
    };

    const handleNextQuestion = async () => {
        if (!liveState) return;
        if (liveState.currentQuestionIndex >= testBattleData.questions.length - 1) {
            handleEndTest();
            return;
        }
        
        const batch = writeBatch(db);
        const responsesRef = collection(db, 'admins', adminUid, `testBattle/active-battle/responses`);
        const snapshot = await getDocs(responsesRef);
        snapshot.forEach(doc => batch.delete(doc.ref));

        batch.update(liveBattleRef, {
            status: 'IN_PROGRESS',
            currentQuestionIndex: liveState.currentQuestionIndex + 1,
            removedAnswerIndices: [],
            powerEventMessage: '',
        });

        await batch.commit();
    };

    const handleEndTest = async () => {
        await deleteDoc(liveBattleRef);
        toast({ title: 'Test Battle Ended', description: 'The test session has been cleared.' });
    };
    
    const handleStudentAnswer = async (student: Student, isCorrect: boolean) => {
        if (!liveState || liveState.status !== 'IN_PROGRESS') return;
        
        const responseRef = doc(db, 'admins', adminUid, `testBattle/active-battle/responses`, student.uid);
        const currentQuestion = testBattleData.questions[liveState.currentQuestionIndex];
        const answerIndex = isCorrect ? 0 : 1;

        setLastAnswerCorrect(prev => ({...prev, [student.uid]: isCorrect}));

        await setDoc(responseRef, {
            studentName: student.studentName,
            characterName: student.characterName,
            answer: currentQuestion.answers[answerIndex],
            answerIndex,
            isCorrect,
            submittedAt: new Date(),
        });
    };

    const currentQuestion = liveState ? testBattleData.questions[liveState.currentQuestionIndex] : null;

    return (
        <>
            {selectedStudentForPowers && (
                <PowersSheet
                    isOpen={isPowersSheetOpen}
                    onOpenChange={setIsPowersSheetOpen}
                    student={selectedStudentForPowers}
                    isBattleView={true}
                    teacherUid={adminUid}
                    battleId="active-battle"
                />
            )}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bot /> Admin Testing Environment</CardTitle>
                    <CardDescription>Manage test characters and run isolated boss battle simulations.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Step 1: Manage Test Characters</AccordionTrigger>
                            <AccordionContent>
                                <TestCharacterManager adminUid={adminUid} testStudents={testStudents} setTestStudents={setTestStudents} />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Step 2: Run Boss Battle Simulation</AccordionTrigger>
                            <AccordionContent className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                            {/* Left Column: Teacher Controls & Student Actions */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Teacher Controls</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-wrap gap-2">
                                        <Button onClick={handleActivateTest} disabled={!!liveState}><Play className="mr-2 h-4 w-4" />Activate</Button>
                                        <Button onClick={handleStartRound} disabled={!liveState || liveState.status !== 'WAITING'}><Square className="mr-2 h-4 w-4" />Start Round</Button>
                                        <Button onClick={handleEndRoundAndShowResults} disabled={!liveState || liveState.status !== 'IN_PROGRESS'}>End Round</Button>
                                        <Button onClick={handleNextQuestion} disabled={!liveState || liveState.status !== 'SHOWING_RESULTS'}><FastForward className="mr-2 h-4 w-4" />Next</Button>
                                        <Button onClick={handleEndTest} disabled={!liveState} variant="destructive"><StopCircle className="mr-2 h-4 w-4" />End Test</Button>
                                    </CardContent>
                                </Card>

                                {liveState && liveState.status === 'IN_PROGRESS' && testStudents.map(student => (
                                    <Card key={student.uid} className={student.hp <= 0 ? 'opacity-50' : ''}>
                                        <CardHeader>
                                            <CardTitle className="text-lg">{student.characterName} (HP: {student.hp}/{student.maxHp}, MP: {student.mp}/{student.maxMp})</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex flex-wrap gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleStudentAnswer(student, true)} disabled={student.hp <= 0}>Answer Correctly (A)</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleStudentAnswer(student, false)} disabled={student.hp <= 0}>Answer Incorrectly (B)</Button>
                                             <Button 
                                                size="sm" 
                                                variant="secondary"
                                                onClick={() => {
                                                    setSelectedStudentForPowers(student);
                                                    setIsPowersSheetOpen(true);
                                                }}
                                                disabled={student.hp <= 0}
                                            >
                                                Use Power
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                                {liveState && (liveState.status !== 'IN_PROGRESS') && (
                                     <Card>
                                        <CardHeader><CardTitle>Responses</CardTitle></CardHeader>
                                        <CardContent>
                                            <RoundResults results={studentResponses} />
                                        </CardContent>
                                     </Card>
                                )}
                            </div>

                            {/* Right Column: Simulated Live View */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-center">Simulated Student Live View</h3>
                                {!liveState && <div className="p-4 border rounded-md min-h-[300px] bg-muted/30 flex items-center justify-center"><p className="text-muted-foreground">Test not active.</p></div>}
                                
                                {liveState && liveState.status === 'WAITING' && (
                                     <div className="p-4 border rounded-md min-h-[300px] bg-muted/30 flex items-center justify-center"><p>Waiting for battle to start...</p></div>
                                )}
                                
                                {liveState && (liveState.status === 'IN_PROGRESS' || liveState.status === 'ROUND_ENDING') && currentQuestion && (
                                    <Card className="bg-gray-900 text-card-foreground border-gray-700">
                                        <CardContent className="p-6 relative">
                                            {liveState.powerEventMessage && 
                                                <div className="text-center p-2 rounded-lg bg-purple-900/80 border border-purple-700 mb-4 animate-in fade-in-50 flex items-center justify-center gap-2">
                                                    <Lightbulb className="h-6 w-6 text-purple-300" />
                                                    <p className="text-lg font-bold text-white">{liveState.powerEventMessage}</p>
                                                </div>
                                            }
                                            {liveState.targetedEvent && (
                                                 <div className="text-center p-2 rounded-lg bg-green-900/80 border border-green-700 mb-4 animate-in fade-in-50 flex items-center justify-center gap-2">
                                                    <p className="text-lg font-bold text-white">Targeted message for {testStudents.find(s => s.uid === liveState.targetedEvent?.targetUid)?.characterName}: {liveState.targetedEvent.message}</p>
                                                </div>
                                            )}
                                            <h2 className="text-xl font-bold text-center">Question {liveState.currentQuestionIndex + 1} is active.</h2>
                                             
                                             {fallenStudentNames.length > 0 && (
                                                <div className="mt-4">
                                                    <h4 className="font-bold flex items-center gap-2"><Skull className="text-destructive"/> Fallen Heroes</h4>
                                                    <p>{fallenStudentNames.join(', ')}</p>
                                                </div>
                                             )}
                                        </CardContent>
                                    </Card>
                                )}
                                
                                {liveState && liveState.status === 'SHOWING_RESULTS' && (
                                    <div className="p-4 border rounded-md bg-muted/30 space-y-4">
                                        <h3 className="text-xl font-bold text-center">Round Over!</h3>
                                        <div className="p-4 rounded-md bg-sky-900/70 border border-sky-700 text-sky-200 flex items-center justify-center gap-4">
                                            <Swords className="h-10 w-10 text-sky-400" />
                                            <p className="text-xl font-bold">Party dealt {liveState.lastRoundDamage} damage!</p>
                                        </div>
                                         <div className="space-y-2">
                                            {Object.entries(lastAnswerCorrect).map(([uid, isCorrect]) => (
                                                isCorrect === false && (
                                                    <div key={uid} className="p-2 rounded-md bg-red-900/70 border border-red-700 text-red-200 flex items-center justify-center gap-2">
                                                        <HeartCrack className="h-5 w-5 text-red-400" />
                                                        <p className="font-bold">{testStudents.find(s=>s.uid===uid)?.characterName} took {currentQuestion?.damage} damage!</p>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                        <p className="text-muted-foreground text-center">Waiting for next question...</p>
                                    </div>
                                )}
                            </div>
                           
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </>
    )
}
