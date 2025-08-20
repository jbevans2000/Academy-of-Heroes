
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, LayoutDashboard, HeartCrack, Star, Coins, ShieldCheck, Sparkles, ScrollText, Trash2, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
}

interface PowerLogEntry {
    round: number;
    casterName: string;
    powerName: string;
    description: string;
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
  battleLog?: PowerLogEntry[];
  rewards?: {
    [studentUid: string]: {
      xpGained: number;
      goldGained: number;
    }
  };
  totalDamageDealt?: number;
  totalBaseDamage?: number;
  totalPowerDamage?: number;
  fallenAtEnd?: string[];
}

export default function TeacherBattleSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const battleId = params.id as string;

  const [summary, setSummary] = useState<BattleSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [teacher, setTeacher] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        if (user) {
            setTeacher(user);
        } else {
            router.push('/teacher/login');
        }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!battleId || !teacher) return;

    const fetchSummary = async () => {
      setIsLoading(true);
      const summaryRef = doc(db, 'teachers', teacher.uid, 'battleSummaries', battleId);
      const docSnap = await getDoc(summaryRef);

      if (docSnap.exists()) {
        setSummary(docSnap.data() as BattleSummary);
      } else {
        console.error("No summary found for this battle.");
        toast({ title: "Summary Not Found", description: "This battle summary may have already been cleaned up. Redirecting to battles list."})
        router.push('/teacher/battles');
      }
      setIsLoading(false);
    };

    fetchSummary();
  }, [battleId, teacher, router, toast]);
  
  const handleCleanupBattle = async () => {
    if (!teacher) return;
    setIsCleaning(true);

    try {
        const batch = writeBatch(db);

        // Define paths
        const liveBattleRef = doc(db, 'teachers', teacher.uid, 'liveBattles', 'active-battle');
        const summaryRef = doc(db, 'teachers', teacher.uid, 'battleSummaries', battleId);

        // Clean up subcollections of live battle
        const subcollections = ['responses', 'powerActivations', 'battleLog', 'messages'];
        for (const sub of subcollections) {
            const subRef = collection(liveBattleRef, sub);
            const snapshot = await getDocs(subRef);
            snapshot.forEach(doc => batch.delete(doc.ref));
        }

        // Delete the main live battle document.
        batch.delete(liveBattleRef);

        // Delete the teacher's summary document.
        batch.delete(summaryRef);

        await batch.commit();

        toast({
            title: 'Battlefield Cleared!',
            description: 'All temporary battle data has been reset.',
        });

        router.push('/teacher/battles');

    } catch (error) {
        console.error("Error cleaning up battle data:", error);
        toast({
            variant: 'destructive',
            title: 'Cleanup Failed',
            description: 'There was an error resetting the battle data. Please try again.',
        });
    } finally {
        setIsCleaning(false);
    }
  };


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
              <CardDescription>The summary for this battle could not be loaded. It may have already been cleaned up.</CardDescription>
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
  
  const battleLogByRound: { [round: number]: PowerLogEntry[] } = {};
    if (summary.battleLog) {
        summary.battleLog.forEach(log => {
            if (!battleLogByRound[log.round]) {
                battleLogByRound[log.round] = [];
            }
            battleLogByRound[log.round].push(log);
        });
    }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
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
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isCleaning}>
                        {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Clear the Battlefield
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear the Battlefield?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this battle summary and all temporary live battle data, making the system ready for a new battle. This action cannot be undone. Student reports will be preserved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCleanupBattle}>Confirm & Clear Battlefield</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
         
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl">Battle Summary: {summary.battleName}</CardTitle>
              <CardDescription>A complete report of the battle. Clean up when you're done to prepare for the next battle.</CardDescription>
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
                                    {(battleLogByRound[parseInt(roundIndex) + 1]) && (
                                        <div className="mt-2 p-2 bg-blue-900/10 rounded-md">
                                            <h4 className="font-semibold text-sm">Powers Used:</h4>
                                            <ul className="text-xs text-muted-foreground list-disc list-inside">
                                                 {battleLogByRound[parseInt(roundIndex) + 1].map((log, index) => (
                                                    <li key={index}>
                                                        <span className="font-bold">{log.casterName}</span> used <span className="font-semibold text-primary">{log.powerName}</span>. Effect: {log.description}
                                                    </li>
                                                 ))}
                                            </ul>
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
                        <div className="flex flex-col items-center gap-2 text-red-800 p-2">
                            <HeartCrack className="h-8 w-8" />
                            <p className="text-xl font-bold">{summary.totalDamageDealt}</p>
                            <p className="text-sm font-medium">Total Damage Dealt</p>
                        </div>
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

            {(summary.battleLog && summary.battleLog.length > 0) && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ScrollText /> Power Usage Log</CardTitle>
                        <CardDescription>A record of all powers used during the battle, grouped by round.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full">
                            {Object.keys(battleLogByRound).map(roundNumber => (
                                <AccordionItem key={roundNumber} value={`round-${roundNumber}`}>
                                    <AccordionTrigger>Round {roundNumber}</AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-2 pl-4">
                                            {battleLogByRound[parseInt(roundNumber)].map((log, index) => (
                                                <li key={index} className="flex justify-between items-center p-2 rounded-md bg-secondary/50">
                                                    <div>
                                                        <span className="font-bold">{log.casterName}</span> used <span className="font-semibold text-primary">{log.powerName}</span>.
                                                        <p className="text-sm text-muted-foreground">Effect: {log.description}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            )}

        </div>
      </main>
    </div>
  );
}
