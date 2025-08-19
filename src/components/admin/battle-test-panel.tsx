
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
import Image from 'next/image';
import { PowersSheet } from '@/components/dashboard/powers-sheet';
import { handlePowerActivation } from '@/lib/battle-logic';

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
    const [testStudents, setTestStudents] = useState<Student[]>([]);
    const [fallenStudentNames, setFallenStudentNames] = useState<string[]>([]);
    const [selectedStudentForPowers, setSelectedStudentForPowers] = useState<Student | null>(null);
    const [isPowersSheetOpen, setIsPowersSheetOpen] = useState(false);
    const [lastAnswerCorrect, setLastAnswerCorrect] = useState<{[key: string]: boolean | null}>({});

    const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
    
    useEffect(() => {
        const unsubscribe = onSnapshot(liveBattleRef, (doc) => {
            if (doc.exists()) {
                const newState = doc.data() as LiveBattleState;
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
        if (!liveState?.fallenPlayerUids) {
            setFallenStudentNames([]);
            return;
        }
        const names = testStudents
            .filter(s => liveState.fallenPlayerUids!.includes(s.uid))
            .map(s => s.characterName);
        setFallenStudentNames(names);
    }, [liveState?.fallenPlayerUids, testStudents]);

    useEffect(() => {
        if (!liveState || !adminUid) return;

        const powerActivationsRef = collection(db, 'admins', adminUid, 'testBattle/active-battle/powerActivations');
        const unsubscribe = onSnapshot(powerActivationsRef, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const activation = { id: change.doc.id, ...change.doc.data() };
                    // Use the centralized power handler
                    await handlePowerActivation(activation as any, adminUid, liveBattleRef, testStudents, testBattleData, true);
                }
            });
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveState, adminUid, testStudents]);


    const handleActivateTest = async () => {
        await setDoc(liveBattleRef, {
            battleId: testBattleData.id,
            status: 'WAITING',
            currentQuestionIndex: 0,
            totalDamage: 0,
            lastRoundDamage: 0,
            lastRoundBaseDamage: 0,
            lastRoundPowerDamage: 0,
            lastRoundPowersUsed: [],
            removedAnswerIndices: [],
            powerEventMessage: '',
            powerUsersThisRound: {},
            queuedPowers: [],
            fallenPlayerUids: [],
            empoweredMageUids: [],
            cosmicDivinationUses: 0,
            voteState: null,
        });
        toast({ title: 'Test Battle Activated' });
    };

    const handleStartRound = async () => {
        if (!liveState) return;
        await setDoc(liveBattleRef, { status: 'IN_PROGRESS' }, { merge: true });
    };

    const handleEndRoundAndShowResults = async () => {
        if (!liveState || liveState.status !== 'IN_PROGRESS') return;
        
        const timerEndsAt = new Date(Date.now() + 5000); // 5 sec timer for test
        await updateDoc(liveBattleRef, {
            status: 'ROUND_ENDING',
            timerEndsAt: timerEndsAt,
        });
    };

    const handleNextQuestion = async () => {
        if (!liveState || liveState.status !== 'SHOWING_RESULTS') return;
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
            timerEndsAt: null,
            lastRoundDamage: 0,
            lastRoundBaseDamage: 0,
            lastRoundPowerDamage: 0,
            lastRoundPowersUsed: [],
            removedAnswerIndices: [],
            powerEventMessage: '',
            targetedEvent: null,
            powerUsersThisRound: {},
            queuedPowers: [],
        });

        await batch.commit();
    };

    const handleEndTest = async () => {
        await deleteDoc(liveBattleRef);
        toast({ title: 'Test Battle Ended', description: 'The test session has been cleared.' });
    };
    
    const handleStudentAnswer = async (student: Student, isCorrect: boolean) => {
        if (!liveState || liveState.status !== 'IN_PROGRESS' || student.hp <= 0) return;
        
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

                                {testStudents.map(student => (
                                    <Card key={student.uid} className={student.hp <= 0 ? 'opacity-50' : ''}>
                                        <CardHeader>
                                            <CardTitle className="text-lg">{student.characterName} (HP: {student.hp}/{student.maxHp}, MP: {student.mp}/{student.maxMp})</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex flex-wrap gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleStudentAnswer(student, true)} disabled={student.hp <= 0 || !liveState || liveState.status !== 'IN_PROGRESS'}>Answer Correctly (A)</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleStudentAnswer(student, false)} disabled={student.hp <= 0 || !liveState || liveState.status !== 'IN_PROGRESS'}>Answer Incorrectly (B)</Button>
                                             <Button 
                                                size="sm" 
                                                variant="secondary"
                                                onClick={() => {
                                                    setSelectedStudentForPowers(student);
                                                    setIsPowersSheetOpen(true);
                                                }}
                                                disabled={student.hp <= 0 || !liveState || liveState.status !== 'IN_PROGRESS'}
                                            >
                                                Use Power
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                           
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-center">Simulated Student Live View</h3>
                                {!liveState && <div className="p-4 border rounded-md min-h-[300px] bg-muted/30 flex items-center justify-center"><p className="text-muted-foreground">Test not active.</p></div>}
                                
                                {liveState && liveState.status === 'WAITING' && (
                                     <div className="p-4 border rounded-md min-h-[300px] bg-muted/30 flex items-center justify-center flex-col gap-2">
                                         <p className="font-bold text-xl">{testBattleData.battleName}</p>
                                         <p>Waiting for battle to start...</p>
                                     </div>
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
                                            <h2 className="text-xl font-bold text-center">Question {liveState.currentQuestionIndex + 1}: {currentQuestion.questionText}</h2>
                                             
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
