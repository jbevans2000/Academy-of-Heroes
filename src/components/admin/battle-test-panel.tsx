
'use client';

import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TestCharacterManager } from './test-character-manager';
import type { Student } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Swords, Play, Square, FastForward, StopCircle, Bot } from 'lucide-react';
import { RoundResults, type Result } from '@/components/teacher/round-results';


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
}

interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'ROUND_ENDING' | 'SHOWING_RESULTS' | 'BATTLE_ENDED';
  currentQuestionIndex: number;
  [key: string]: any; // Allow other properties
}

// Static, hardcoded Test Battle for reliability
const testBattleData: BossBattle = {
    id: 'static-test-battle',
    battleName: 'The Unflappable Test Golem',
    questions: [
        { questionText: 'Is the sky blue?', answers: ['Yes', 'No', 'Sometimes', 'Maybe'], correctAnswerIndex: 0, damage: 1 },
        { questionText: 'What is 2 + 2?', answers: ['3', '4', '5', '6'], correctAnswerIndex: 1, damage: 1 },
        { questionText: 'Which class heals?', answers: ['Mage', 'Guardian', 'Healer', 'Warrior'], correctAnswerIndex: 2, damage: 1 },
        { questionText: 'Which class uses a sword and shield?', answers: ['Mage', 'Guardian', 'Healer', 'Rogue'], correctAnswerIndex: 1, damage: 1 },
        { questionText: 'Which class uses arcane magic?', answers: ['Mage', 'Guardian', 'Healer', 'Bard'], correctAnswerIndex: 0, damage: 1 },
    ]
};


export function BattleTestPanel({ adminUid }: { adminUid: string }) {
    const { toast } = useToast();
    const [liveState, setLiveState] = useState<LiveBattleState | null>(null);
    const [studentResponses, setStudentResponses] = useState<Result[]>([]);
    const [testStudents, setTestStudents] = useState<Student[]>([]);
    
    // Listen to live test battle state
    useEffect(() => {
        const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
        const unsubscribe = onSnapshot(liveBattleRef, (doc) => {
            if (doc.exists()) {
                setLiveState(doc.data() as LiveBattleState);
            } else {
                setLiveState(null);
            }
        });
        return () => unsubscribe();
    }, [adminUid]);
    
     // Listen to live student responses
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

    const handleActivateTest = async () => {
        const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
        await setDoc(liveBattleRef, {
            battleId: testBattleData.id,
            battleName: testBattleData.battleName,
            questions: testBattleData.questions,
            status: 'WAITING',
            currentQuestionIndex: 0,
            totalDamage: 0,
        });
        toast({ title: 'Test Battle Activated' });
    };

    const handleStartRound = async () => {
        if (!liveState) return;
        const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
        await setDoc(liveBattleRef, { status: 'IN_PROGRESS' }, { merge: true });
    };

    const handleEndRoundAndShowResults = async () => {
        if (!liveState) return;
        const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
        
        const responsesRef = collection(db, 'admins', adminUid, `testBattle/active-battle/responses`);
        const responsesSnapshot = await getDocs(responsesRef);
        const correctAnswers = responsesSnapshot.docs.filter(doc => doc.data().isCorrect).length;
        
        await setDoc(liveBattleRef, { 
            status: 'SHOWING_RESULTS',
            lastRoundDamage: correctAnswers, 
            totalDamage: (liveState.totalDamage || 0) + correctAnswers,
        }, { merge: true });
    };

    const handleNextQuestion = async () => {
        if (!liveState) return;
        if (liveState.currentQuestionIndex >= testBattleData.questions.length - 1) {
            handleEndTest();
            return;
        }
        
        const batch = writeBatch(db);
        const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');

        const responsesRef = collection(db, 'admins', adminUid, `testBattle/active-battle/responses`);
        const snapshot = await getDocs(responsesRef);
        snapshot.forEach(doc => batch.delete(doc.ref));

        batch.update(liveBattleRef, {
            status: 'IN_PROGRESS',
            currentQuestionIndex: liveState.currentQuestionIndex + 1,
        });

        await batch.commit();
    };

    const handleEndTest = async () => {
        const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
        await deleteDoc(liveBattleRef);
        toast({ title: 'Test Battle Ended', description: 'The test session has been cleared.' });
    };
    
    const handleStudentAnswer = async (student: Student, answerIndex: number) => {
        if (!liveState || liveState.status !== 'IN_PROGRESS') return;
        
        const responseRef = doc(db, 'admins', adminUid, `testBattle/active-battle/responses`, student.uid);
        const currentQuestion = testBattleData.questions[liveState.currentQuestionIndex];
        const isCorrect = answerIndex === currentQuestion.correctAnswerIndex;

        await setDoc(responseRef, {
            studentName: student.studentName,
            characterName: student.characterName,
            answer: currentQuestion.answers[answerIndex],
            answerIndex,
            isCorrect,
            submittedAt: new Date(),
        });
    };

    const renderStudentView = () => {
        if (!liveState) {
            return (
                <div className="flex items-center justify-center h-full">
                     <p className="text-muted-foreground text-center">Test not active. Click "Activate Test" to begin.</p>
                </div>
            );
        }

        const currentQuestion = testBattleData.questions[liveState.currentQuestionIndex];

        if (liveState.status === 'WAITING') {
            return <div className="flex items-center justify-center h-full"><p>Waiting for battle to start...</p></div>
        }
        if (liveState.status === 'SHOWING_RESULTS') {
            return <div className="flex items-center justify-center h-full"><p>Round over! Waiting for next question...</p></div>
        }
        
        if (liveState.status === 'IN_PROGRESS') {
             return (
                <div className="space-y-6">
                    <h4 className="font-bold text-center text-lg">{currentQuestion.questionText}</h4>
                    {testStudents.map(student => (
                         <div key={student.uid} className="p-2 border rounded-md">
                             <p className="font-bold text-center">{student.characterName}</p>
                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
                                {currentQuestion.answers.map((answer, index) => (
                                    <Button key={index} size="sm" variant="outline" onClick={() => handleStudentAnswer(student, index)}>
                                        {String.fromCharCode(65 + index)}
                                    </Button>
                                ))}
                             </div>
                         </div>
                    ))}
                </div>
            )
        }

        return null;
    }


    return (
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
                        <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                           {/* Teacher Control View */}
                           <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Teacher Control Panel</h3>
                                <div>
                                    <Label>Battle</Label>
                                    <p className="font-bold text-primary">{testBattleData.battleName}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={handleActivateTest} disabled={!!liveState}><Play className="mr-2 h-4 w-4" />Activate Test</Button>
                                    <Button onClick={handleStartRound} disabled={!liveState || liveState.status !== 'WAITING'}><Square className="mr-2 h-4 w-4" />Start Round</Button>
                                    <Button onClick={handleEndRoundAndShowResults} disabled={!liveState || liveState.status !== 'IN_PROGRESS'}>End Round</Button>
                                    <Button onClick={handleNextQuestion} disabled={!liveState || liveState.status !== 'SHOWING_RESULTS'}><FastForward className="mr-2 h-4 w-4" />Next Question</Button>
                                    <Button onClick={handleEndTest} disabled={!liveState} variant="destructive"><StopCircle className="mr-2 h-4 w-4" />End Test</Button>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Live Responses:</h4>
                                    <RoundResults results={studentResponses} />
                                </div>
                           </div>
                           
                           {/* Student Simulator View */}
                           <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Student Simulator</h3>
                                <div className="p-4 border rounded-md min-h-[300px] bg-muted/30">
                                    {renderStudentView()}
                                </div>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    )
}

    