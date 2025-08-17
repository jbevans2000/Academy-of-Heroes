
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, collection, query, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trophy, LayoutDashboard, HeartCrack, Star, Coins, ShieldCheck, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// HARDCODED TEACHER UID
const TEACHER_UID = 'ICKWJ5MQl0SHFzzaSXqPuGS3NHr2';

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
}

interface BattleSummary {
  battleId: string;
  battleName: string;
  questions: Question[];
  totalDamageDealt?: number;
  totalBaseDamage?: number;
  totalPowerDamage?: number;
  rewards?: {
    [studentUid: string]: {
      xpGained: number;
      goldGained: number;
    }
  }
}

interface StudentRoundResponse {
    answerIndex: number;
}

export default function StudentBattleSummaryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<BattleSummary | null>(null);
  const [studentResponses, setStudentResponses] = useState<{ [roundIndex: string]: StudentRoundResponse }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            router.push('/');
        }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchSummaryAndResponses = async () => {
        setIsLoading(true);
        try {
            let battleId: string | null = null;

            // 1. Try to get the battleId from the (now temporary) live battle doc
            const liveBattleRef = doc(db, 'teachers', TEACHER_UID, 'liveBattles', 'active-battle');
            const liveBattleSnap = await getDoc(liveBattleRef);

            if (liveBattleSnap.exists() && liveBattleSnap.data().battleId) {
                battleId = liveBattleSnap.data().battleId;
            } else {
                // 2. If it doesn't exist (because it was cleaned up), fetch the most recent summary.
                // This is a robust fallback.
                console.log("Live battle doc not found, fetching most recent summary as a fallback.");
                const summariesQuery = query(
                    collection(db, 'teachers', TEACHER_UID, 'battleSummaries'), 
                    orderBy('endedAt', 'desc'), 
                    limit(1)
                );
                const recentSummarySnap = await getDocs(summariesQuery);
                if (!recentSummarySnap.empty) {
                    battleId = recentSummarySnap.docs[0].id;
                }
            }
            
            if (!battleId) {
                 console.log("No active or summarized battle found. Not redirecting.");
                 // Don't redirect, just show the "not available" message by letting summary stay null.
            } else {
              // 3. Fetch the battle summary using the determined battleId
              const summaryRef = doc(db, 'teachers', TEACHER_UID, 'battleSummaries', battleId);
              const summarySnap = await getDoc(summaryRef);
              if (summarySnap.exists()) {
                  setSummary(summarySnap.data() as BattleSummary);
              } else {
                   console.log("Summary not found for the given battleId.");
                   // Let summary stay null to show "not available"
              }
              
              // 4. Fetch the specific student's responses for all rounds for that battle
              const responsesRef = collection(db, 'teachers', TEACHER_UID, `liveBattles/active-battle/studentResponses/${user.uid}/rounds`);
              const responsesSnap = await getDocs(responsesRef);
              const responsesData: { [key: string]: StudentRoundResponse } = {};
              responsesSnap.forEach(doc => {
                  responsesData[doc.id] = doc.data() as StudentRoundResponse;
              });
              setStudentResponses(responsesData);
            }

        } catch (error) {
            console.error("Error fetching summary data:", error);
            toast({ title: "Error", description: "Could not load the battle summary." });
        } finally {
            setIsLoading(false);
        }
    };

    fetchSummaryAndResponses();

  }, [user, router, toast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <div className="max-w-4xl w-full space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Summary Not Available</CardTitle>
            <CardDescription>The summary for the battle has not been generated yet or could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  let totalCorrect = 0;
  summary.questions.forEach((q, index) => {
    const studentResponse = studentResponses[index];
    if (studentResponse && studentResponse.answerIndex === q.correctAnswerIndex) {
        totalCorrect++;
    }
  });

  const userRewards = user && summary.rewards ? summary.rewards[user.uid] : null;


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="shadow-lg text-center">
            <CardHeader>
              <Trophy className="h-16 w-16 mx-auto text-yellow-500" />
              <CardTitle className="text-4xl">Battle Complete!</CardTitle>
              <CardDescription className="text-lg">Here is a summary of your performance against {summary.battleName}.</CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
                <p className="text-2xl font-bold">You answered <span className="text-primary">{totalCorrect}</span> out of <span className="text-primary">{summary.questions.length}</span> questions correctly.</p>
                {summary.totalDamageDealt !== undefined && (
                     <div className="p-4 rounded-md bg-sky-900/70 border border-sky-700 text-sky-200">
                        <div className="flex items-center justify-center gap-4 text-center">
                            <div className="flex-1">
                                <p className="text-sm font-bold uppercase text-sky-300">Base Damage</p>
                                <p className="text-2xl font-bold">{summary.totalBaseDamage ?? 0}</p>
                            </div>
                            <div className="text-2xl font-bold">+</div>
                            <div className="flex-1">
                                <p className="text-sm font-bold uppercase text-sky-300">Power Damage</p>
                                <p className="text-2xl font-bold">{summary.totalPowerDamage ?? 0}</p>
                            </div>
                            <div className="text-2xl font-bold">=</div>
                             <div className="flex-1">
                                <p className="text-sm font-bold uppercase text-sky-300">Total Damage</p>
                                <p className="text-3xl font-extrabold text-white">{summary.totalDamageDealt}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-2">
                             <HeartCrack className="h-6 w-6 text-sky-400" />
                            <p className="text-lg font-bold">Your party dealt a total of {summary.totalDamageDealt} damage to the boss!</p>
                        </div>
                    </div>
                )}
                {userRewards && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div className="p-4 rounded-md bg-yellow-800/70 border border-yellow-600 text-yellow-200 flex items-center justify-center gap-4">
                            <Star className="h-10 w-10 text-yellow-400" />
                            <p className="text-xl font-bold">You earned {userRewards.xpGained} XP!</p>
                        </div>
                         <div className="p-4 rounded-md bg-amber-800/70 border border-amber-600 text-amber-200 flex items-center justify-center gap-4">
                            <Coins className="h-10 w-10 text-amber-400" />
                            <p className="text-xl font-bold">You earned {userRewards.goldGained} Gold!</p>
                        </div>
                    </div>
                )}
             </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle>Your Answers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {summary.questions.map((q, index) => {
                    const studentResponse = studentResponses[index];
                    const wasCorrect = studentResponse && studentResponse.answerIndex === q.correctAnswerIndex;

                    return (
                        <div key={index} className="p-4 border rounded-lg">
                            <p className="font-semibold text-lg">{index + 1}. {q.questionText}</p>
                            <div className="mt-2 pl-4">
                               {studentResponse ? (
                                 <>
                                    <div className={`flex items-center gap-2 ${wasCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                        {wasCorrect ? <CheckCircle className="h-5 w-5"/> : <XCircle className="h-5 w-5"/>}
                                        <span>Your Answer: {q.answers[studentResponse.answerIndex]}</span>
                                    </div>
                                    {!wasCorrect && (
                                        <div className="flex items-center gap-2 mt-1 text-blue-600">
                                            <CheckCircle className="h-5 w-5 opacity-0"/>
                                            <span>Correct Answer: {q.answers[q.correctAnswerIndex]}</span>
                                        </div>
                                    )}
                                 </>
                               ) : (
                                <p className="text-muted-foreground">You did not answer this question.</p>
                               )}
                            </div>
                        </div>
                    )
                })}
            </CardContent>
          </Card>
           <div className="text-center">
             <Button size="lg" onClick={() => router.push('/dashboard')}>
                <LayoutDashboard className="mr-2 h-5 w-5" /> Return to Dashboard
              </Button>
           </div>
        </div>
      </main>
    </div>
  );
}
