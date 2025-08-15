
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, collection, query, getDocs, where, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trophy, LayoutDashboard } from 'lucide-react';

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
}

interface BattleSummary {
  battleId: string;
  battleName: string;
  questions: Question[];
}

interface StudentRoundResponse {
    answerIndex: number;
}

export default function StudentBattleSummaryPage() {
  const router = useRouter();
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
            // 1. Get the active battle to find the battleId
            const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
            const liveBattleSnap = await getDoc(liveBattleRef);
            if (!liveBattleSnap.exists()) {
                console.error("Live battle not found.");
                setIsLoading(false);
                return;
            }
            const battleId = liveBattleSnap.data().battleId;

            // 2. Fetch the battle summary using the battleId
            const summaryRef = doc(db, 'battleSummaries', battleId);
            const summarySnap = await getDoc(summaryRef);
            if (summarySnap.exists()) {
                setSummary(summarySnap.data() as BattleSummary);
            } else {
                 console.error("Summary not found.");
                 setIsLoading(false);
                 return;
            }
            
            // 3. Fetch the specific student's responses for all rounds
            const responsesRef = collection(db, `liveBattles/active-battle/studentResponses/${user.uid}/rounds`);
            const responsesSnap = await getDocs(responsesRef);
            const responsesData: { [key: string]: StudentRoundResponse } = {};
            responsesSnap.forEach(doc => {
                responsesData[doc.id] = doc.data() as StudentRoundResponse;
            });
            setStudentResponses(responsesData);

        } catch (error) {
            console.error("Error fetching summary data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchSummaryAndResponses();

  }, [user]);

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
             <CardContent>
                <p className="text-2xl font-bold">You answered <span className="text-primary">{totalCorrect}</span> out of <span className="text-primary">{summary.questions.length}</span> questions correctly.</p>
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

