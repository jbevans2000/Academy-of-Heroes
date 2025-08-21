
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, getDocs, writeBatch, deleteDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, LayoutDashboard, HeartCrack, Star, Coins, ShieldCheck, Sparkles, ScrollText, Trash2, Loader2, Swords, Shield, Skull } from 'lucide-react';
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

interface RoundSnapshot {
  id: string; // The ID of the round document itself
  currentQuestionIndex: number;
  totalDamage?: number;
  totalBaseDamage?: number;
  totalPowerDamage?: number;
  responses: {
      studentUid: string;
      characterName: string;
      answerIndex: number;
      isCorrect: boolean;
  }[];
}

interface SavedBattle {
  id: string; // The unique ID of this summary document
  battleId: string; // The ID of the original battle template
  battleName: string;
  questions: Question[]; // This will now be populated from the original battle doc
  powerLog?: PowerLogEntry[];
  fallenAtEnd?: string[];
  status: 'WAITING' | 'BATTLE_ENDED';
}


export default function TeacherBattleSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const savedBattleId = params.id as string;

  const [summary, setSummary] = useState<SavedBattle | null>(null);
  const [allRounds, setAllRounds] = useState<RoundSnapshot[]>([]);
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
    if (!savedBattleId || !teacher) return;

    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const summaryRef = doc(db, 'teachers', teacher.uid, 'savedBattles', savedBattleId);
        const docSnap = await getDoc(summaryRef);

        if (!docSnap.exists() || docSnap.data().status !== 'BATTLE_ENDED') {
            toast({ title: "Summary Not Ready", description: "The battle has not concluded or the archive is missing. Redirecting...", variant: 'destructive' });
            router.push('/teacher/battles');
            return;
        }
        
        const battleData = { id: docSnap.id, ...docSnap.data() } as SavedBattle;
        
        // Fetch the original questions from the battle template
        const battleTemplateRef = doc(db, 'teachers', teacher.uid, 'bossBattles', battleData.battleId);
        const battleTemplateSnap = await getDoc(battleTemplateRef);
        
        if(battleTemplateSnap.exists()){
            battleData.questions = battleTemplateSnap.data().questions;
        }

        setSummary(battleData);
        
        const roundsRef = collection(summaryRef, 'rounds');
        const roundsQuery = query(roundsRef, orderBy('currentQuestionIndex'));
        const roundsSnap = await getDocs(roundsQuery);
        const roundsData = roundsSnap.docs.map(d => ({id: d.id, ...d.data()} as RoundSnapshot));
        setAllRounds(roundsData);

      } catch (error) {
         console.error("Error fetching summary:", error);
         toast({ title: "Error Loading Summary", description: "There was a problem loading the battle report.", variant: 'destructive' });
         router.push('/teacher/battles');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [savedBattleId, teacher, router, toast]);
  
  const handleCleanupBattle = async () => {
    if (!teacher) return;
    setIsCleaning(true);

    try {
        const summaryRef = doc(db, 'teachers', teacher.uid, 'savedBattles', savedBattleId);
        // Clean up subcollections first
        const roundsRef = collection(summaryRef, 'rounds');
        const roundsSnap = await getDocs(roundsRef);
        const batch = writeBatch(db);
        roundsSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        // Delete the main doc
        await deleteDoc(summaryRef);

        toast({
            title: 'Battle Archive Cleared!',
            description: 'The archived data for this battle has been removed.',
        });

        router.push('/teacher/battles');

    } catch (error) {
        console.error("Error cleaning up battle summary:", error);
        toast({
            variant: 'destructive',
            title: 'Cleanup Failed',
            description: 'There was an error deleting the battle archive. Please try again.',
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
    // This case should ideally be handled by the loading state and redirect logic
    return (
      <div className="flex min-h-screen w-full flex-col">
        <TeacherHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Summary Not Found</CardTitle>
              <CardDescription>The summary for this battle could not be loaded. It may have been cleaned up or no rounds were completed.</CardDescription>
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

  // Handle the edge case of a zero-round battle
    if (allRounds.length === 0) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-6xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/teacher/battles')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Battles
                        </Button>
                        <Card>
                            <CardHeader>
                                <CardTitle>Battle Concluded Prematurely</CardTitle>
                                <CardDescription>This battle session for "{summary.battleName}" ended before any rounds were completed.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={isCleaning}>
                                            {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                            Clear This Archive
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Clear This Battle Archive?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                            This will permanently delete this battle's saved data. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleCleanupBattle} disabled={isCleaning}>
                                                {isCleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Confirm & Clear
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        );
    }

  const finalRound = allRounds[allRounds.length - 1];
  const { totalDamage, totalBaseDamage, totalPowerDamage } = allRounds.reduce((acc, round) => {
    acc.totalDamage += round.totalDamage || 0;
    acc.totalBaseDamage += round.totalBaseDamage || 0;
    acc.totalPowerDamage += round.totalPowerDamage || 0;
    return acc;
  }, { totalDamage: 0, totalBaseDamage: 0, totalPowerDamage: 0 });

  const battleLogByRound: { [round: number]: PowerLogEntry[] } = {};
  if (summary.powerLog) {
      summary.powerLog.forEach(log => {
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
                        Clear This Archive
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear This Battle Archive?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This will permanently delete this battle's saved data. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCleanupBattle} disabled={isCleaning}>
                            {isCleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm & Clear
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
         
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl">Battle Summary: {summary.battleName}</CardTitle>
              <CardDescription>A complete report of the battle session.</CardDescription>
            </CardHeader>
          </Card>

           <Card>
                <CardHeader>
                    <CardTitle>Overall Battle Totals</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap justify-around items-center text-center gap-6">
                     <div className="flex flex-col items-center gap-2 p-2">
                        <Shield className="h-8 w-8 text-blue-500" />
                        <p className="text-2xl font-bold">{totalBaseDamage ?? 0}</p>
                        <p className="text-sm font-medium">Base Damage</p>
                    </div>
                     <div className="flex flex-col items-center gap-2 p-2">
                        <Sparkles className="h-8 w-8 text-purple-500" />
                        <p className="text-2xl font-bold">{totalPowerDamage ?? 0}</p>
                        <p className="text-sm font-medium">Power Damage</p>
                    </div>
                     <div className="flex flex-col items-center gap-2 p-2">
                        <HeartCrack className="h-8 w-8 text-red-600" />
                        <p className="text-3xl font-extrabold">{totalDamage ?? 0}</p>
                        <p className="text-sm font-medium">Total Damage Dealt</p>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                 <CardHeader>
                    <CardTitle>Round-by-Round Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {allRounds.map((roundData, index) => {
                            if (!roundData || !roundData.responses) return null;
                            const question = summary.questions[roundData.currentQuestionIndex];
                            if (!question) return null; // Add a check for the question
                            const correctCount = roundData.responses.filter(r => r.isCorrect).length;
                            const incorrectCount = roundData.responses.length - correctCount;

                            return (
                                <AccordionItem key={roundData.id} value={roundData.id}>
                                    <AccordionTrigger className="text-lg hover:no-underline">
                                        <div className="flex justify-between w-full pr-4">
                                            <span className="text-left">Q{roundData.currentQuestionIndex + 1}: {question.questionText}</span>
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
                                                    <span className="font-medium">{res.characterName}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span>{question.answers[res.answerIndex]}</span>
                                                        {res.isCorrect ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        {(battleLogByRound[roundData.currentQuestionIndex + 1]) && (
                                            <div className="mt-2 p-2 bg-blue-900/10 rounded-md">
                                                <h4 className="font-semibold text-sm">Powers Used:</h4>
                                                <ul className="text-xs text-muted-foreground list-disc list-inside">
                                                    {battleLogByRound[roundData.currentQuestionIndex + 1].map((log, logIndex) => (
                                                        <li key={logIndex}>
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

            {(summary.fallenAtEnd && summary.fallenAtEnd.length > 0) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Skull className="text-destructive"/> Fallen Heroes at Battle's End</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
                             {summary.fallenAtEnd.map((studentName, index) => (
                                <li key={index} className="font-semibold p-2 bg-secondary rounded-md text-center">{studentName}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

        </div>
      </main>
    </div>
  );
}
