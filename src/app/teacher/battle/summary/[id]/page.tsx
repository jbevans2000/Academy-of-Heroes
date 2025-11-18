
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, orderBy, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import type { Student } from '@/lib/data';
import { cn } from '@/lib/utils';


interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
  imageUrl?: string;
}

interface RoundSnapshot {
    id: string;
    currentQuestionIndex: number;
    responses: {
        studentUid: string;
        characterName: string;
        answerIndex: number;
        isCorrect: boolean;
    }[];
    lastRoundPowersUsed?: string[];
}

interface RewardBreakdown {
    xpFromAnswers: number;
    goldFromAnswers: number;
    xpFromPowers: number;
    goldFromPowers: number;
    xpFromParticipation: number;
    goldFromParticipation: number;
    xpFromDamageShare: number;
    hadFullParticipation: boolean;
    totalDamageDealt: number;
    martialSacrificeBonus: boolean;
    arcaneSacrificeBonus: boolean;
    divineSacrificeBonus: boolean;
}


interface PowerLogEntry {
    round: number;
    casterName: string;
    powerName: string;
    description: string;
}

interface SavedBattle {
  id: string; // The unique ID of this summary document
  battleId: string; // The ID of the original battle template
  battleName: string;
  powerLog?: PowerLogEntry[];
  totalDamage?: number;
  totalBaseDamage?: number;
  totalPowerDamage?: number;
  fallenAtEnd?: string[];
  participantUids: string[];
  rewardsByStudent?: {
    [uid: string]: {
        xpGained: number;
        goldGained: number;
        breakdown: RewardBreakdown;
    }
  };
  martialSacrificeCasterUid?: string;
  arcaneSacrificeCasterUid?: string;
  divineSacrificeCasterUid?: string;
}

export default function TeacherBattleSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const savedBattleId = params.id as string;

  const [summary, setSummary] = useState<SavedBattle | null>(null);
  const [allRounds, setAllRounds] = useState<RoundSnapshot[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
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
        const summarySnap = await getDoc(summaryRef);

        if (summarySnap.exists()) {
          const summaryData = { id: summarySnap.id, ...summarySnap.data() } as SavedBattle;
          setSummary(summaryData);
          
          const battleTemplateRef = doc(db, 'teachers', teacher.uid, 'bossBattles', summaryData.battleId);
          const battleTemplateSnap = await getDoc(battleTemplateRef);
          if (battleTemplateSnap.exists()) {
              setQuestions(battleTemplateSnap.data().questions as Question[]);
          }

          const roundsRef = collection(db, 'teachers', teacher.uid, 'savedBattles', savedBattleId, 'rounds');
          const roundsQuery = query(roundsRef, orderBy('currentQuestionIndex'));
          const roundsSnapshot = await getDocs(roundsQuery);
          setAllRounds(roundsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as RoundSnapshot));
          
          const studentsSnapshot = await getDocs(collection(db, 'teachers', teacher.uid, 'students'));
          setAllStudents(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));

        } else {
          toast({ title: "Summary Not Found", description: "This battle summary may have already been cleaned up."})
          router.push('/teacher/battles/summary');
        }
      } catch (error) {
        console.error("Error fetching summary data:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not load summary data." });
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
        
        // Also delete subcollections if they exist
        const roundsRef = collection(summaryRef, 'rounds');
        const roundsSnapshot = await getDocs(roundsRef);
        const batch = writeBatch(db);
        roundsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        batch.delete(summaryRef);

        await batch.commit();

        toast({
            title: 'Battle Archive Cleared!',
            description: 'The archived data for this battle has been removed.',
        });

        router.push('/teacher/battles/summary');

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

  const participantDetails = useMemo(() => {
    if (!summary || !allStudents.length) return [];
    
    return allStudents
        .filter(student => summary.participantUids.includes(student.uid))
        .map(student => ({
            ...student,
            rewards: summary.rewardsByStudent?.[student.uid] || { xpGained: 0, goldGained: 0 }
        }))
        .sort((a,b) => b.rewards.xpGained - a.rewards.xpGained);

  }, [summary, allStudents]);


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
              <Button onClick={() => router.push('/teacher/battles/summary')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Summaries
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  
  const battleLogByRound: { [round: number]: PowerLogEntry[] } = {};
    if (summary.powerLog) {
        summary.powerLog.forEach(log => {
            if (!battleLogByRound[log.round]) {
                battleLogByRound[log.round] = [];
            }
            battleLogByRound[log.round].push(log);
        });
    }

  const sacrificedUids = [
      summary.martialSacrificeCasterUid,
      summary.arcaneSacrificeCasterUid,
      summary.divineSacrificeCasterUid
  ].filter(Boolean) as string[];

  return (
    <div className="relative flex min-h-screen w-full flex-col">
        <div 
          className="absolute inset-0 -z-10"
          style={{
              backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FArchives.jpg?alt=media&token=1bbfbdcd-fb4a-4139-9a8d-44603c19a86c')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
              opacity: 0.25,
          }}
        />
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.push('/teacher/battles/summary')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to All Summaries
                </Button>
                <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Return to Podium
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
                        <AlertDialogAction onClick={handleCleanupBattle} disabled={isCleaning} className="bg-destructive hover:bg-destructive/90">
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
                        <Swords className="h-8 w-8 text-blue-500" />
                        <p className="text-2xl font-bold">{summary.totalBaseDamage ?? 0}</p>
                        <p className="text-sm font-medium">Base Damage</p>
                    </div>
                     <div className="flex flex-col items-center gap-2 p-2">
                        <Sparkles className="h-8 w-8 text-purple-500" />
                        <p className="text-2xl font-bold">{summary.totalPowerDamage ?? 0}</p>
                        <p className="text-sm font-medium">Power Damage</p>
                    </div>
                     <div className="flex flex-col items-center gap-2 p-2">
                        <HeartCrack className="h-8 w-8 text-red-600" />
                        <p className="text-3xl font-extrabold">{summary.totalDamage ?? 0}</p>
                        <p className="text-sm font-medium">Total Damage Dealt</p>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Participant Rewards & Status</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">XP Gained</TableHead>
                                <TableHead className="text-right">Gold Gained</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {participantDetails.map(student => {
                                const isFallen = summary.fallenAtEnd?.includes(student.uid);
                                const didSacrifice = sacrificedUids.includes(student.uid);
                                let statusIcon;
                                let statusText;
                                if (didSacrifice) {
                                    statusIcon = <Shield className="h-5 w-5 text-blue-500" />;
                                    statusText = 'Sacrificed';
                                } else if (isFallen) {
                                    statusIcon = <Skull className="h-5 w-5 text-red-600" />;
                                    statusText = 'Fallen';
                                } else {
                                    statusIcon = <CheckCircle className="h-5 w-5 text-green-600" />;
                                    statusText = 'Victorious';
                                }
                                
                                return (
                                    <TableRow key={student.uid}>
                                        <TableCell className="font-medium">{student.studentName} ({student.characterName})</TableCell>
                                        <TableCell className="font-semibold">
                                            <div className="flex items-center gap-2">
                                                {statusIcon}
                                                <span>{statusText}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-green-600">+{student.rewards.xpGained.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-semibold text-amber-600">+{student.rewards.goldGained.toLocaleString()}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            <Card>
                 <CardHeader>
                    <CardTitle>Round-by-Round Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {allRounds.map((round) => {
                            const question = questions[round.currentQuestionIndex];
                            if (!question) return null;
                            const correctCount = round.responses.filter(r => r.isCorrect).length;
                            const incorrectCount = round.responses.length - correctCount;

                            return (
                                <AccordionItem key={round.id} value={round.id}>
                                    <AccordionTrigger className="text-lg hover:no-underline">
                                        <div className="flex justify-between w-full pr-4">
                                            <div className="flex items-center gap-2 text-left">
                                                {question.imageUrl && <Image src={question.imageUrl} alt="Question visual" width={40} height={40} className="rounded-md" />}
                                                <span>Q{round.currentQuestionIndex + 1}: {question.questionText}</span>
                                            </div>
                                            <div className="flex gap-4">
                                                <span className="text-green-500 font-semibold">{correctCount} Correct</span>
                                                <span className="text-red-500 font-semibold">{incorrectCount} Incorrect</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-2 py-2 px-4 bg-secondary/50 rounded-md">
                                            {round.responses.map(res => (
                                                <li key={res.studentUid} className="flex items-center justify-between p-2 rounded bg-background">
                                                    <span className="font-medium">{res.characterName}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span>{question.answers[res.answerIndex]}</span>
                                                        {res.isCorrect ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        {(battleLogByRound[round.currentQuestionIndex + 1]) && (
                                            <div className="mt-2 p-2 bg-blue-900/10 rounded-md">
                                                <h4 className="font-semibold text-sm">Powers Used:</h4>
                                                <ul className="text-xs text-muted-foreground list-disc list-inside">
                                                    {battleLogByRound[round.currentQuestionIndex + 1].map((log, index) => (
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

            {(summary.powerLog && summary.powerLog.length > 0) && (
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
