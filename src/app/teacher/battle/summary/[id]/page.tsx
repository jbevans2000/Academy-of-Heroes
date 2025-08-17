
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, LayoutDashboard, HeartCrack, Star, Coins, ShieldCheck, Sparkles } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// HARDCODED TEACHER UID
const TEACHER_UID = 'ICKWJ5MQl0SHFzzaSXqPuGS3NHr2';

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
}

interface BattleSummary {
  battleName: string;
  questions: Question[];
  resultsByRound: {
    [roundIndex: string]: {
      questionText: string;
      responses: {
        studentUid: string;
        studentName: string;
        answerIndex: number;
        isCorrect: boolean;
      }[];
      powersUsed?: string[];
    };
  };
  rewards?: {
    [studentUid: string]: {
      xpGained: number;
      goldGained: number;
    }
  };
  totalDamageDealt?: number;
  totalBaseDamage?: number;
  totalPowerDamage?: number;
}

export default function TeacherBattleSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const battleId = params.id as string;

  const [summary, setSummary] = useState<BattleSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!battleId) return;

    const fetchSummary = async () => {
      setIsLoading(true);
      const summaryRef = doc(db, 'teachers', TEACHER_UID, 'battleSummaries', battleId);
      const docSnap = await getDoc(summaryRef);

      if (docSnap.exists()) {
        setSummary(docSnap.data() as BattleSummary);
      } else {
        console.error("No summary found for this battle.");
        // Handle not found
      }
      setIsLoading(false);
    };

    fetchSummary();
  }, [battleId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <TeacherHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <TeacherHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Summary Not Found</CardTitle>
              <CardDescription>The summary for this battle could not be loaded.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/teacher/battles')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Battles
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const roundKeys = Object.keys(summary.resultsByRound);
  const totalCorrect = roundKeys.reduce((acc, key) => acc + summary.resultsByRound[key].responses.filter(r => r.isCorrect).length, 0);
  const totalIncorrect = roundKeys.reduce((acc, key) => acc + summary.resultsByRound[key].responses.filter(r => !r.isCorrect).length, 0);

  const totalXpAwarded = summary.rewards ? Object.values(summary.rewards).reduce((acc, reward) => acc + reward.xpGained, 0) : 0;
  const totalGoldAwarded = summary.rewards ? Object.values(summary.rewards).reduce((acc, reward) => acc + reward.goldGained, 0) : 0;
  
  const allPowersUsed = roundKeys.flatMap(key => summary.resultsByRound[key].powersUsed || []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
             <Button variant="outline" onClick={() => router.push('/teacher/battles')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Battles
              </Button>
              <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
          </div>
         
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl">Battle Summary: {summary.battleName}</CardTitle>
              <CardDescription>A complete report of the battle.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {roundKeys.map((roundIndex) => {
                        const roundData = summary.resultsByRound[roundIndex];
                        const question = summary.questions[parseInt(roundIndex)];
                        const correctCount = roundData.responses.filter(r => r.isCorrect).length;
                        const incorrectCount = roundData.responses.length - correctCount;

                        return (
                            <AccordionItem key={roundIndex} value={`item-${roundIndex}`}>
                                <AccordionTrigger className="text-lg hover:no-underline">
                                    <div className="flex justify-between w-full pr-4">
                                        <span>Question {parseInt(roundIndex) + 1}: {roundData.questionText}</span>
                                        <div className="flex gap-4">
                                            <span className="text-green-500 font-semibold">{correctCount} Correct</span>
                                            <span className="text-red-500 font-semibold">{incorrectCount} Incorrect</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-2 py-2 px-4 bg-secondary/50 rounded-md">
                                        {roundData.responses.map(res => (
                                            <li key={res.studentUid} className="flex items-center justify-between p-2 rounded bg-background">
                                                <span className="font-medium">{res.studentName}</span>
                                                <div className="flex items-center gap-2">
                                                    <span>{question.answers[res.answerIndex]}</span>
                                                    {res.isCorrect ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    {(roundData.powersUsed && roundData.powersUsed.length > 0) && (
                                        <div className="mt-2 p-2 bg-blue-900/10 rounded-md">
                                            <h4 className="font-semibold text-sm">Powers Used:</h4>
                                            <p className="text-xs text-muted-foreground">{roundData.powersUsed.join(', ')}</p>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </CardContent>
          </Card>

           <Card>
                <CardHeader>
                    <CardTitle>Overall Battle Totals</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap justify-around items-center text-center gap-4">
                    <div className="flex flex-col items-center gap-2 text-green-600 p-2">
                        <CheckCircle className="h-8 w-8" />
                        <p className="text-xl font-bold">{totalCorrect}</p>
                        <p className="text-sm font-medium">Total Correct Answers</p>
                    </div>
                     <div className="flex flex-col items-center gap-2 text-red-600 p-2">
                        <XCircle className="h-8 w-8" />
                        <p className="text-xl font-bold">{totalIncorrect}</p>
                        <p className="text-sm font-medium">Total Incorrect Answers</p>
                    </div>
                    {summary.totalDamageDealt !== undefined && (
                        <>
                         <div className="flex flex-col items-center gap-2 text-sky-600 p-2">
                            <ShieldCheck className="h-8 w-8" />
                            <p className="text-xl font-bold">{summary.totalBaseDamage ?? 0}</p>
                            <p className="text-sm font-medium">Total Base Damage</p>
                        </div>
                         <div className="flex flex-col items-center gap-2 text-purple-600 p-2">
                            <Sparkles className="h-8 w-8" />
                            <p className="text-xl font-bold">{summary.totalPowerDamage ?? 0}</p>
                            <p className="text-sm font-medium">Total Power Damage</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 text-red-800 p-2">
                            <HeartCrack className="h-8 w-8" />
                            <p className="text-xl font-bold">{summary.totalDamageDealt}</p>
                            <p className="text-sm font-medium">Total Damage Dealt</p>
                        </div>
                        </>
                    )}
                    {summary.rewards && (
                       <>
                         <div className="flex flex-col items-center gap-2 text-yellow-500 p-2">
                           <Star className="h-8 w-8" />
                           <p className="text-xl font-bold">{totalXpAwarded}</p>
                           <p className="text-sm font-medium">Total XP Awarded</p>
                         </div>
                         <div className="flex flex-col items-center gap-2 text-amber-600 p-2">
                           <Coins className="h-8 w-8" />
                           <p className="text-xl font-bold">{totalGoldAwarded}</p>
                           <p className="text-sm font-medium">Total Gold Awarded</p>
                         </div>
                       </>
                    )}
                </CardContent>
            </Card>

            {allPowersUsed.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Powers Used During Battle</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{allPowersUsed.join(', ')}</p>
                    </CardContent>
                </Card>
            )}

        </div>
      </main>
    </div>
  );
}
