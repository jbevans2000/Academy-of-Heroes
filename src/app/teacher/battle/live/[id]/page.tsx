
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, collection, query, updateDoc, getDocs, writeBatch, serverTimestamp, setDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Download, Timer, HeartCrack } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RoundResults, type Result } from '@/components/teacher/round-results';
import { downloadCsv } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { calculateLevel, calculateHpGain, calculateMpGain } from '@/lib/game-mechanics';
import type { Student } from '@/lib/data';


interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'ROUND_ENDING' | 'SHOWING_RESULTS' | 'BATTLE_ENDED';
  currentQuestionIndex: number;
  timerEndsAt?: { seconds: number; nanoseconds: number; };
  lastRoundDamage?: number;
  totalDamage?: number;
}

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
  damage: number;
}

interface Battle {
    id: string;
    battleName: string;
    questions: Question[];
}

interface StudentResponse {
    studentName: string;
    characterName: string;
    answer: string;
    answerIndex: number;
    isCorrect: boolean;
}

function CountdownTimer({ expiryTimestamp }: { expiryTimestamp: Date }) {
    const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.round((expiryTimestamp.getTime() - new Date().getTime()) / 1000)));

    useEffect(() => {
        const interval = setInterval(() => {
            const newTimeLeft = Math.max(0, Math.round((expiryTimestamp.getTime() - new Date().getTime()) / 1000));
            setTimeLeft(newTimeLeft);
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTimestamp]);

    return (
        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700">
            <Timer className="h-12 w-12 text-yellow-500 mb-2" />
            <p className="text-4xl font-bold text-yellow-700 dark:text-yellow-300">{timeLeft}</p>
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Round ending...</p>
        </div>
    );
}


export default function TeacherLiveBattlePage() {
  const params = useParams();
  const router = useRouter();
  const battleId = params.id as string;

  const [battle, setBattle] = useState<Battle | null>(null);
  const [liveState, setLiveState] = useState<LiveBattleState | null>(null);
  const [studentResponses, setStudentResponses] = useState<Result[]>([]);
  const [roundResults, setRoundResults] = useState<Result[]>([]);
  const [allRoundsData, setAllRoundsData] = useState<any>({});
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
    setIsLoading(true);
    const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
    const unsubscribe = onSnapshot(liveBattleRef, (doc) => {
      if (doc.exists()) {
        const newState = doc.data() as LiveBattleState;
        setLiveState(newState);

        if (newState.status === 'BATTLE_ENDED') {
            router.push(`/teacher/battle/summary/${battleId}`);
        }
      } else {
        // If the document doesn't exist, it could mean the battle has ended and been cleaned up.
        // Or it hasn't started. The redirect logic in `handleEndBattle` should handle this.
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening for live battle state:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [battleId, router]);

  // Listen for real-time student responses for the current question
  useEffect(() => {
    // When the question changes, always clear the previous round's live responses.
    setStudentResponses([]);
    
    if (!liveState || (liveState.status !== 'IN_PROGRESS' && liveState.status !== 'ROUND_ENDING')) {
      return;
    }
    
    const responsesRef = collection(db, `liveBattles/active-battle/responses`);
    const q = query(responsesRef);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const responses: Result[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as StudentResponse;
        responses.push({
          studentName: data.studentName,
          answer: data.answer,
          isCorrect: data.isCorrect,
        });
      });
      setStudentResponses(responses);
    }, (error) => {
      console.error("Error listening for student responses:", error);
    });

    return () => unsubscribe();
  }, [liveState?.status, liveState?.currentQuestionIndex]);


  const calculateAndSetResults = useCallback(async () => {
    if (!battle || !liveState || liveState.status !== 'ROUND_ENDING' || isEndingRound) return;

    setIsEndingRound(true);
    
    try {
        const batch = writeBatch(db);
        const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
        
        const responsesRef = collection(db, `liveBattles/active-battle/responses`);
        const responsesSnapshot = await getDocs(responsesRef);
        const responsesData = responsesSnapshot.docs.map(doc => ({ uid: doc.id, ...(doc.data() as StudentResponse) }));
        
        const currentQuestion = battle.questions[liveState.currentQuestionIndex];
        const damage = currentQuestion.damage || 0;

        const results: Result[] = responsesData.map(response => ({
            studentName: response.studentName,
            answer: response.answer,
            isCorrect: response.isCorrect,
        }));
        setRoundResults(results);

        // Apply damage for incorrect answers in a batch
        if (damage > 0) {
            for (const response of responsesData) {
                if (!response.isCorrect) {
                    const studentRef = doc(db, 'students', response.uid);
                    batch.update(studentRef, { hp: increment(-damage) });
                }
            }
        }

        const roundDamage = results.filter(r => r.isCorrect).length;

        // Store this round's data for the final summary
        const newAllRoundsData = {
            ...allRoundsData,
            [liveState.currentQuestionIndex]: {
                questionText: currentQuestion.questionText,
                responses: responsesData.map(r => ({
                    studentUid: r.uid,
                    studentName: r.studentName,
                    answerIndex: r.answerIndex,
                    isCorrect: r.isCorrect,
                }))
            }
        };
        setAllRoundsData(newAllRoundsData);

        // Update the live battle state
        batch.update(liveBattleRef, { 
            status: 'SHOWING_RESULTS', 
            timerEndsAt: null,
            lastRoundDamage: roundDamage,
            totalDamage: increment(roundDamage)
        });

        // Commit all database changes at once
        await batch.commit();

    } catch (error) {
        console.error("Error calculating results and applying damage:", error);
    } finally {
        setIsEndingRound(false);
    }
  }, [battle, liveState, isEndingRound, allRoundsData]);

  // Effect to handle timer expiration
  useEffect(() => {
      if (liveState?.status !== 'ROUND_ENDING' || !liveState.timerEndsAt) return;

      const expiryDate = new Date(liveState.timerEndsAt.seconds * 1000);
      const now = new Date();
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();

      const timer = setTimeout(() => {
          calculateAndSetResults();
      }, timeUntilExpiry > 0 ? timeUntilExpiry : 0);
      
      return () => clearTimeout(timer);
  }, [liveState?.status, liveState?.timerEndsAt, calculateAndSetResults]);

  const handleEndRound = async () => {
    if (!battle || liveState === null || isEndingRound) return;
    
    setIsEndingRound(true);

    try {
        const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
        const timerEndsAt = new Date(Date.now() + 10000);
        await updateDoc(liveBattleRef, { 
            status: 'ROUND_ENDING',
            timerEndsAt: timerEndsAt,
        });
    } catch (error) {
        console.error("Error starting round end timer:", error);
    } finally {
        setIsEndingRound(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!battle || liveState === null || liveState.currentQuestionIndex >= battle.questions.length - 1) return;

    setIsAdvancing(true);
    try {
        const batch = writeBatch(db);

        const responsesRef = collection(db, `liveBattles/active-battle/responses`);
        const responsesSnapshot = await getDocs(responsesRef);
        responsesSnapshot.forEach(doc => batch.delete(doc.ref));
        
        const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
        batch.update(liveBattleRef, {
            status: 'IN_PROGRESS',
            currentQuestionIndex: liveState.currentQuestionIndex + 1,
            timerEndsAt: null,
            lastRoundDamage: 0
        });

        await batch.commit();
        setRoundResults([]);
    } catch (error) {
        console.error("Error advancing to next question:", error);
    } finally {
        setIsAdvancing(false);
    }
  };

  const handleEndBattle = async () => {
      if (!liveState || !battle) return;

      const batch = writeBatch(db);
      const liveBattleRef = doc(db, 'liveBattles', 'active-battle');

      // 1. Get the final total damage from the live state
      const finalStateDoc = await getDoc(liveBattleRef);
      const totalDamage = finalStateDoc.data()?.totalDamage || 0;

      // 2. Calculate final rewards
      const rewardsByStudent: { [uid: string]: { xpGained: number, goldGained: number } } = {};
      Object.values(allRoundsData).forEach((round: any) => {
          round.responses.forEach((res: any) => {
              if (res.isCorrect) {
                  if (!rewardsByStudent[res.studentUid]) {
                      rewardsByStudent[res.studentUid] = { xpGained: 0, goldGained: 0 };
                  }
                  rewardsByStudent[res.studentUid].xpGained += 5;
                  rewardsByStudent[res.studentUid].goldGained += 10;
              }
          });
      });

      // 3. Batch update student documents with rewards and level ups
      for (const uid in rewardsByStudent) {
          const studentRef = doc(db, 'students', uid);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
              const studentData = studentSnap.data() as Student;
              const { xpGained, goldGained } = rewardsByStudent[uid];

              const currentXp = studentData.xp || 0;
              const newXp = currentXp + xpGained;
              const currentLevel = studentData.level || 1;
              const newLevel = calculateLevel(newXp);
              
              const updates: Partial<Student> = {
                  xp: newXp,
                  gold: (studentData.gold || 0) + goldGained,
              };

              if (newLevel > currentLevel) {
                  updates.level = newLevel;
                  const levelsGained = newLevel - currentLevel;
                  updates.hp = studentData.hp + calculateHpGain(studentData.class, levelsGained);
                  updates.mp = studentData.mp + calculateMpGain(studentData.class, levelsGained);
              }
              batch.update(studentRef, updates);
          }
      }

      // 4. Save battle summary
      const summaryRef = doc(db, `battleSummaries`, battleId);
      batch.set(summaryRef, {
          battleId: battleId,
          battleName: battle?.battleName,
          questions: battle?.questions,
          resultsByRound: allRoundsData,
          totalDamageDealt: totalDamage,
          rewards: rewardsByStudent,
          endedAt: serverTimestamp(),
      });

      // 5. Update live battle state to BATTLE_ENDED
      batch.update(liveBattleRef, { status: 'BATTLE_ENDED' });

      // 6. Commit all batched writes
      await batch.commit();
      
      // 7. Redirect teacher to the summary page.
      router.push(`/teacher/battle/summary/${battleId}`);

      // 8. After a short delay, delete the live battle document
      setTimeout(async () => {
        await deleteDoc(doc(db, 'liveBattles', 'active-battle'));
      }, 5000); 
  };
  
  const handleExport = () => {
    if (!battle || roundResults.length === 0 || !liveState) return;
    const questionText = battle.questions[liveState.currentQuestionIndex].questionText;
    const headers = ['Student Name', 'Answer', 'Correct'];
    const data = roundResults.map(r => [r.studentName, r.answer, r.isCorrect ? 'Yes' : 'No']);
    downloadCsv(data, headers, `battle_results_q${liveState.currentQuestionIndex + 1}.csv`);
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
  const isRoundEnding = liveState.status === 'ROUND_ENDING';
  const areResultsShowing = liveState.status === 'SHOWING_RESULTS';
  const isLastQuestion = liveState.currentQuestionIndex >= battle.questions.length - 1;
  const expiryTimestamp = liveState.timerEndsAt ? new Date(liveState.timerEndsAt.seconds * 1000) : null;


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
                    <p>Total Damage Dealt So Far: <span className="font-bold text-red-500">{liveState.totalDamage || 0}</span></p>

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
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" disabled={isAdvancing || isEndingRound}>End Battle</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action will end the battle for all participants, award final XP/Gold, and take you to the summary page. You cannot undo this.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleEndBattle}>Yes, End Battle</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isRoundEnding && expiryTimestamp && (
                <Card>
                    <CardHeader>
                        <CardTitle>Ending Round...</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CountdownTimer expiryTimestamp={expiryTimestamp} />
                    </CardContent>
                </Card>
            )}

            {(isRoundInProgress || isRoundEnding) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Live Student Responses ({studentResponses.length})</CardTitle>
                        <CardDescription>See which students have submitted their answer for the current question.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <RoundResults results={studentResponses} />
                    </CardContent>
                </Card>
            )}

            {areResultsShowing && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Round Results</CardTitle>
                            <CardDescription>Review of student answers for the last question.</CardDescription>
                        </div>
                        <Button onClick={handleExport} variant="outline" size="sm" disabled={roundResults.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Export to CSV
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <RoundResults results={roundResults} />
                        {liveState.lastRoundDamage !== undefined && liveState.lastRoundDamage > 0 && (
                             <div className="mt-4 p-4 rounded-md bg-sky-900/70 border border-sky-700 text-sky-200 flex items-center justify-center gap-4">
                                <HeartCrack className="h-8 w-8 text-sky-400" />
                                <p className="text-lg font-bold">Total Damage Dealt This Round: {liveState.lastRoundDamage}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

        </div>
      </main>
    </div>
  );
}
