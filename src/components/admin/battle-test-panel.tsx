
'use client';

import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TestCharacterManager } from './test-character-manager';
import type { Student } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Swords, Play, Square, FastForward, StopCircle, Bot } from 'lucide-react';
import { RoundResults, type Result } from '@/components/teacher/round-results';


interface BossBattle {
    id: string;
    battleName: string;
    questions: any[];
}

interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'SHOWING_RESULTS' | 'BATTLE_ENDED';
  currentQuestionIndex: number;
}

export function BattleTestPanel({ adminUid }: { adminUid: string }) {
    const { toast } = useToast();
    const [battles, setBattles] = useState<BossBattle[]>([]);
    const [selectedBattle, setSelectedBattle] = useState<BossBattle | null>(null);
    const [liveState, setLiveState] = useState<LiveBattleState | null>(null);
    const [studentResponses, setStudentResponses] = useState<Result[]>([]);
    const [testStudents, setTestStudents] = useState<Student[]>([]);
    const [activeTestStudent, setActiveTestStudent] = useState<Student | null>(null);
    
    // Fetch available boss battles from the admin's teacher account
    useEffect(() => {
        const fetchBattles = async () => {
            try {
                const battlesRef = collection(db, 'teachers', adminUid, 'bossBattles');
                const snapshot = await getDocs(battlesRef);
                const battlesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BossBattle));
                setBattles(battlesData);
            } catch (error) {
                console.error("Error fetching battles for admin test panel:", error);
            }
        };
        fetchBattles();
    }, [adminUid]);

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
        if (!liveState || (liveState.status !== 'IN_PROGRESS')) {
            setStudentResponses([]);
            return;
        }
        const responsesRef = collection(db, 'admins', adminUid, `testBattle/active-battle/responses`);
        const unsubscribe = onSnapshot(responsesRef, (querySnapshot) => {
            const responses: Result[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                responses.push({
                    studentName: data.characterName, // Use character name for display
                    answer: data.answer,
                    isCorrect: data.isCorrect,
                });
            });
            setStudentResponses(responses);
        });
        return () => unsubscribe();
    }, [liveState, adminUid]);

    const handleActivateTest = async () => {
        if (!selectedBattle) {
            toast({ variant: 'destructive', title: 'No Battle Selected' });
            return;
        }
        const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
        await setDoc(liveBattleRef, {
            battleId: selectedBattle.id,
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
        if (!liveState || !selectedBattle) return;
        const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
        
        // In a real scenario, you would calculate damage here. For the test panel, we just show results.
        const responsesRef = collection(db, 'admins', adminUid, `testBattle/active-battle/responses`);
        const responsesSnapshot = await getDocs(responsesRef);
        const correctAnswers = responsesSnapshot.docs.filter(doc => doc.data().isCorrect).length;
        
        await setDoc(liveBattleRef, { 
            status: 'SHOWING_RESULTS',
            lastRoundDamage: correctAnswers, // Simple damage calculation for test
            totalDamage: (liveState as any).totalDamage + correctAnswers,
        }, { merge: true });
    };

    const handleNextQuestion = async () => {
        if (!liveState || !selectedBattle) return;
        if (liveState.currentQuestionIndex >= selectedBattle.questions.length - 1) {
            handleEndTest();
            return;
        }
        const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
        // Clear old responses before next question
        const responsesRef = collection(db, 'admins', adminUid, `testBattle/active-battle/responses`);
        const snapshot = await getDocs(responsesRef);
        snapshot.forEach(doc => deleteDoc(doc.ref));

        await setDoc(liveBattleRef, {
            status: 'IN_PROGRESS',
            currentQuestionIndex: liveState.currentQuestionIndex + 1,
        }, { merge: true });
    };

    const handleEndTest = async () => {
        const liveBattleRef = doc(db, 'admins', adminUid, 'testBattle', 'active-battle');
        await deleteDoc(liveBattleRef);
        toast({ title: 'Test Battle Ended', description: 'The test session has been cleared.' });
    };
    
    const handleStudentAnswer = async (answerIndex: number) => {
        if (!liveState || !selectedBattle || !activeTestStudent || liveState.status !== 'IN_PROGRESS') return;
        
        const responseRef = doc(db, 'admins', adminUid, `testBattle/active-battle/responses`, activeTestStudent.uid);
        const currentQuestion = selectedBattle.questions[liveState.currentQuestionIndex];
        const isCorrect = answerIndex === currentQuestion.correctAnswerIndex;

        await setDoc(responseRef, {
            studentName: activeTestStudent.studentName,
            characterName: activeTestStudent.characterName,
            answer: currentQuestion.answers[answerIndex],
            answerIndex,
            isCorrect,
            submittedAt: new Date(),
        });
    };

    const renderStudentView = () => {
        if (!liveState || !selectedBattle) return <p className="text-muted-foreground">Test not active.</p>;
        const currentQuestion = selectedBattle.questions[liveState.currentQuestionIndex];

        switch(liveState.status) {
            case 'WAITING':
                return <p>Waiting for battle to start...</p>
            case 'IN_PROGRESS':
                return (
                    <div className="space-y-4">
                        <h4 className="font-bold">{currentQuestion.questionText}</h4>
                        <div className="grid grid-cols-2 gap-2">
                           {currentQuestion.answers.map((answer: string, index: number) => (
                               <Button key={index} variant="outline" onClick={() => handleStudentAnswer(index)} disabled={!activeTestStudent}>
                                   {answer}
                               </Button>
                           ))}
                        </div>
                    </div>
                )
            case 'SHOWING_RESULTS':
                 return <p>Round over! Waiting for next question...</p>
            default:
                return null;
        }
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
                                <div className="space-y-2">
                                    <Label>Select Battle to Test</Label>
                                    <Select onValueChange={(value) => setSelectedBattle(battles.find(b => b.id === value) || null)}>
                                        <SelectTrigger><SelectValue placeholder="Choose a battle..." /></SelectTrigger>
                                        <SelectContent>
                                            {battles.map(b => <SelectItem key={b.id} value={b.id}>{b.battleName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={handleActivateTest} disabled={!selectedBattle || !!liveState}><Play className="mr-2 h-4 w-4" />Activate Test</Button>
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
                                <div className="space-y-2">
                                    <Label>Impersonate Student</Label>
                                     <Select onValueChange={(value) => setActiveTestStudent(testStudents.find(ts => ts.uid === value) || null)}>
                                        <SelectTrigger><SelectValue placeholder="Select a test character..." /></SelectTrigger>
                                        <SelectContent>
                                            {testStudents.map(ts => <SelectItem key={ts.uid} value={ts.uid}>{ts.characterName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="p-4 border rounded-md min-h-[200px]">
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
