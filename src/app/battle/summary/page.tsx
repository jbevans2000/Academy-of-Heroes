
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onSnapshot, doc, getDoc, collection, query, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trophy, LayoutDashboard, HeartCrack, Star, Coins, ShieldCheck, Sparkles, Skull, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findTeacherForStudent } from '@/lib/utils';


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
  };
  fallenAtEnd?: string[]; // UIDs of players who were fallen at the end.
}

interface StudentRoundResponse {
    answerIndex: number;
}

export default function StudentBattleSummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [summary, setSummary] = useState<BattleSummary | null>(null);
  const [studentResponses, setStudentResponses] = useState<{ [roundIndex: string]: StudentRoundResponse }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [battleId, setBattleId] = useState<string | null>(null);

  // Get battleId from URL search parameter
  useEffect(() => {
    const idFromParams = searchParams.get('id');
    setBattleId(idFromParams);
  }, [searchParams]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            const foundTeacherUid = await findTeacherForStudent(currentUser.uid);
            if (foundTeacherUid) {
                setTeacherUid(foundTeacherUid);
            } else {
                router.push('/');
            }
        } else {
            router.push('/');
        }
    });
    return () => unsubscribe();
  }, [router]);
  
  // This effect now ONLY fetches the summary once based on the battleId from the search params.
  useEffect(() => {
    if (!user || !teacherUid || !battleId) {
      if(!battleId) {
          setIsLoading(false); // If there's no ID, stop loading.
      }
      return;
    }
    
    const fetchSummary = async () => {
        setIsLoading(true);
        const summaryRef = doc(db, 'teachers', teacherUid, 'battleSummaries', battleId);
        try {
            const summarySnap = await getDoc(summaryRef);
            if (summarySnap.exists()) {
                setSummary(summarySnap.data() as BattleSummary);

                // Fetch student's specific responses for this battle
                const responsesByRound: { [key: string]: StudentRoundResponse } = {};
                const questionsCount = summarySnap.data().questions.length;
                const allRoundsData = summarySnap.data().resultsByRound || {};
                
                Object.keys(allRoundsData).forEach(roundIndex => {
                    const roundData = allRoundsData[roundIndex];
                    const studentResponse = roundData.responses?.find((res: any) => res.studentUid === user.uid);
                    if (studentResponse) {
                        responsesByRound[roundIndex] = { answerIndex: studentResponse.answerIndex };
                    }
                });
                
                setStudentResponses(responsesByRound);

            } else {
                // Summary doc doesn't exist, which can happen after cleanup.
                console.log("Summary document not found for battleId:", battleId);
                toast({ title: 'Battle Complete', description: 'The results for this battle have been archived.' });
                router.push('/dashboard');
            }
        } catch (error) {
            console.error("Error fetching battle summary:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load battle summary.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchSummary();

  }, [user, teacherUid, battleId, toast, router]);


  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <div className="max-w-4xl w-full space-y-4 text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <h1 className="text-2xl font-bold">Awaiting Battle Report...</h1>
          <p className="text-muted-foreground">The Chronicler is tallying the results.</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    // This handles the case where there is no battleId in the URL
    // or the summary was cleaned up before the page could load.
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <div className="max-w-4xl w-full space-y-4 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">No Summary Available</h1>
          <p className="text-muted-foreground">Returning to your dashboard...</p>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </div>
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
  const wasFallenAtEnd = summary.fallenAtEnd?.includes(user!.uid) ?? false;


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
                        <div className="flex items-center justify-center gap-2">
                             <HeartCrack className="h-6 w-6 text-sky-400" />
                            <p className="text-lg font-bold">Your fellowship dealt a total of {summary.totalDamageDealt} damage to the boss!</p>
                        </div>
                    </div>
                )}
                {wasFallenAtEnd && (
                    <div className="p-4 rounded-md bg-gray-700 border border-gray-600 text-gray-300 flex items-center justify-center gap-2">
                         <Skull className="h-8 w-8 text-gray-400" />
                        <p className="text-xl font-bold">You were fallen at the end of the battle and did not receive any XP or Gold.</p>
                    </div>
                )}
                {userRewards && !wasFallenAtEnd && (
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
