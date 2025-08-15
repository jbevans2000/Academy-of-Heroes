
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, collection, query, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RoundResults, type Result } from '@/components/teacher/round-results';


interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'SHOWING_RESULTS';
  currentQuestionIndex: number;
}

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
}

interface Battle {
    id: string;
    battleName: string;
    questions: Question[];
}

interface StudentResponse {
    studentName: string;
    answerIndex: number;
}

export default function TeacherLiveBattlePage() {
  const params = useParams();
  const router = useRouter();
  const battleId = params.id as string;

  const [battle, setBattle] = useState<Battle | null>(null);
  const [liveState, setLiveState] = useState<LiveBattleState | null>(null);
  const [studentResponses, setStudentResponses] = useState<StudentResponse[]>([]);
  const [roundResults, setRoundResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndingRound, setIsEndingRound] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Fetch the static battle definition once
  useEffect(() => {
    if (!battleId) return;
    const fetchBattle = async () => {
      const docRef = doc(db, 'bossBattles', battleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBattle({ id: docSnap.id, ...docSnap.data() } as Battle);
      } else {
        // Handle battle not found
      }
    };
    fetchBattle();
  }, [battleId]);

  // Listen for real-time updates on the live battle state
  useEffect(() => {
    const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
    const unsubscribe = onSnapshot(liveBattleRef, (doc) => {
      if (doc.exists()) {
        const newState = doc.data() as LiveBattleState;
        // If the question index changes, clear old responses and results
        if (liveState && liveState.currentQuestionIndex !== newState.currentQuestionIndex) {
            setStudentResponses([]);
            setRoundResults([]);
        }
        setLiveState(newState);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [liveState]);

  // Listen for real-time student responses ONLY when the battle is in progress
  useEffect(() => {
    if (!liveState || liveState.status !== 'IN_PROGRESS') {
        if (liveState?.status !== 'SHOWING_RESULTS') {
            setStudentResponses([]); // Clear responses if not in progress or showing results
        }
        return;
    };

    const responsesRef = collection(db, `liveBattles/active-battle/responses`);
    const q = query(responsesRef);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const responses: StudentResponse[] = [];
        querySnapshot.forEach((doc) => {
            responses.push(doc.data() as StudentResponse);
        });
        setStudentResponses(responses);
    });

    return () => unsubscribe();
  }, [liveState?.status, liveState]);


  const handleEndRound = async () => {
    if (!battle || liveState === null) return;
    
    setIsEndingRound(true);

    try {
        const responsesRef = collection(db, `liveBattles/active-battle/responses`);
        const responsesSnapshot = await getDocs(responsesRef);
        const responsesData = responsesSnapshot.docs.map(doc => doc.data() as StudentResponse);
        
        const currentQuestion = battle.questions[liveState.currentQuestionIndex];
        const correctAnswerIndex = currentQuestion.correctAnswerIndex;

        const results: Result[] = responsesData.map(response => ({
            studentName: response.studentName,
            answer: currentQuestion.answers[response.answerIndex],
            isCorrect: response.answerIndex === correctAnswerIndex,
        }));
        setRoundResults(results);

        // Update the central battle state
        const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
        await updateDoc(liveBattleRef, { status: 'SHOWING_RESULTS' });
    } catch (error) {
        console.error("Error ending round:", error);
    } finally {
        setIsEndingRound(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!battle || liveState === null || liveState.currentQuestionIndex >= battle.questions.length - 1) return;

    setIsAdvancing(true);
    try {
        const batch = writeBatch(db);

        // 1. Clear previous responses
        const responsesRef = collection(db, `liveBattles/active-battle/responses`);
        const responsesSnapshot = await getDocs(responsesRef);
        responsesSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // 2. Update battle state to the next question
        const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
        batch.update(liveBattleRef, {
            status: 'IN_PROGRESS',
            currentQuestionIndex: liveState.currentQuestionIndex + 1,
        });

        await batch.commit();
        // Local state will update via the onSnapshot listener
    } catch (error) {
        console.error("Error advancing to next question:", error);
    } finally {
        setIsAdvancing(false);
    }
  };


  if (isLoading || !battle || !liveState) {
    return (
        <>
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    <Skeleton className="w-1/3 h-10" />
                    <Skeleton className="w-full h-64" />
                    <Skeleton className="w-full h-32" />
                </div>
            </main>
        </>
    );
  }

  const isRoundInProgress = liveState.status === 'IN_PROGRESS';
  const areResultsShowing = liveState.status === 'SHOWING_RESULTS';
  const isLastQuestion = liveState.currentQuestionIndex >= battle.questions.length - 1;


  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{battle.battleName}</CardTitle>
                    <CardDescription>Live Battle Control Panel</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Status: <span className="font-bold text-primary">{liveState.status.replace('_', ' ')}</span></p>
                    <p>Current Question: <span className="font-bold">{liveState.currentQuestionIndex + 1} / {battle.questions.length}</span></p>
                    
                    <div className="mt-6 p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg mb-2">Controls</h3>
                        <div className="flex gap-4">
                             <Button onClick={handleEndRound} disabled={!isRoundInProgress || isEndingRound}>
                                {isEndingRound ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                End Round
                             </Button>
                             <Button onClick={handleNextQuestion} disabled={!areResultsShowing || isLastQuestion || isAdvancing}>
                                {isAdvancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Next Question
                             </Button>
                             <Button variant="destructive">End Battle</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isRoundInProgress && (
                <Card>
                    <CardHeader>
                        <CardTitle>Live Student Responses ({studentResponses.length})</CardTitle>
                        <CardDescription>See which students have submitted their answer for the current question.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {studentResponses.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {studentResponses.map((response, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-secondary">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>{response.studentName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{response.studentName}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Waiting for students to answer...</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {areResultsShowing && (
                <RoundResults results={roundResults} />
            )}

        </div>
      </main>
    </div>
  );
}
