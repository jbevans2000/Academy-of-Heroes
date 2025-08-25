

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, getDocs, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, LayoutDashboard, HeartCrack, Sparkles, ScrollText, Trash2, Loader2, Swords, Shield, Skull, Download } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { logGameEvent } from '@/lib/gamelog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv } from '@/lib/utils';
import type { Student } from '@/lib/data';
import { cleanupLiveBattle } from '@/ai/flows/manage-battles';

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
  lastRoundDamage?: number;
  lastRoundBaseDamage?: number;
  lastRoundPowerDamage?: number;
  lastRoundPowersUsed?: string[];
  responses: {
      studentUid: string;
      characterName: string;
      answerIndex: number;
      isCorrect: boolean;
  }[];
}

interface SavedBattle {
  id: string;
  battleId: string; 
  battleName: string;
  questions: Question[]; 
  powerLog?: PowerLogEntry[];
  fallenAtEnd?: string[];
  status: 'WAITING' | 'BATTLE_ENDED';
}

interface ParticipantStats {
    characterName: string;
    correctAnswers: number;
    incorrectAnswers: number;
    powersUsed: number;
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
  const [allStudents, setAllStudents] = useState<Student[]>([]);
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

    const fetchFullSummary = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch the main summary document
            const summaryRef = doc(db, 'teachers', teacher.uid, 'savedBattles', savedBattleId);
            const summarySnap = await getDoc(summaryRef);
            
            if (!summarySnap.exists()) {
                toast({ title: "Summary Not Found", description: "This battle summary may have been cleaned up.", variant: "destructive" });
                router.push('/teacher/battles/summary');
                return;
            }

            const summaryData = { id: summarySnap.id, ...summarySnap.data() } as Omit<SavedBattle, 'questions'> & { battleId: string };
            
            // 2. Fetch the original battle to get the questions
            const battleTemplateRef = doc(db, 'teachers', teacher.uid, 'bossBattles', summaryData.battleId);
            const battleTemplateSnap = await getDoc(battleTemplateRef);
            const questions = battleTemplateSnap.exists() ? battleTemplateSnap.data().questions : [];
            
            setSummary({ ...summaryData, questions });

            // 3. Fetch the rounds subcollection
            const roundsRef = collection(db, 'teachers', teacher.uid, 'savedBattles', savedBattleId, 'rounds');
            const roundsQuery = query(roundsRef, orderBy('currentQuestionIndex'));
            const roundsSnapshot = await getDocs(roundsQuery);
            const roundsData = roundsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as RoundSnapshot);
            setAllRounds(roundsData);

            // 4. Fetch all students for mapping UIDs to names
            const studentsRef = collection(db, 'teachers', teacher.uid, 'students');
            const studentsSnapshot = await getDocs(studentsRef);
            setAllStudents(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));


        } catch (error) {
            console.error("Error fetching full battle summary:", error);
            toast({ title: "Error", description: "Failed to load the full battle report.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchFullSummary();

  }, [savedBattleId, teacher, router, toast]);

  
  const handleCleanupBattle = async () => {
    if (!teacher) return;
    setIsCleaning(true);

    try {
        await cleanupLiveBattle(teacher.uid);
        
        toast({
            title: 'Battlefield Cleared!',
            description: 'The temporary battle data has been removed.',
        });

        router.push('/teacher/dashboard');

    } catch (error) {
        console.error("Error cleaning up battle:", error);
        toast({
            variant: 'destructive',
            title: 'Cleanup Failed',
            description: 'There was an error clearing the battlefield. Please try the manual reset button on the dashboard.',
        });
    } finally {
        setIsCleaning(false);
    }
  };
  
  const handleDownloadCsv = () => {
    if (!summary || allRounds.length === 0) {
        toast({ variant: 'destructive', title: 'No Data', description: 'There is no data to download.' });
        return;
    }

    const headers = ['Round', 'Student Name', 'Character Name', 'Question', 'Student Answer', 'Correct Answer', 'Result'];
    const data: string[][] = [];

    allRounds.forEach(round => {
        const question = summary.questions[round.currentQuestionIndex];
        if (!question) return;

        round.responses.forEach(res => {
            const studentInfo = allStudents.find(s => s.uid === res.studentUid);
            const row = [
                String(round.currentQuestionIndex + 1),
                studentInfo?.studentName ?? 'Unknown',
                res.characterName,
                `"${question.questionText.replace(/"/g, '""')}"`,
                `"${question.answers[res.answerIndex].replace(/"/g, '""')}"`,
                `"${question.answers[question.correctAnswerIndex].replace(/"/g, '""')}"`,
                res.isCorrect ? 'Correct' : 'Incorrect',
            ];
            data.push(row);
        });
    });

    const filename = `battle_summary_${summary.battleName.replace(/ /g, '_')}.csv`;
    downloadCsv(data, headers, filename);
  };


  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <TeacherHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
             <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary mb-4" />
             <h1 className="text-3xl font-bold">The Oracle is consulting the chronicles...</h1>
             <p className="text-muted-foreground mt-2">Loading Battle Report</p>
          </div>
        </main>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <TeacherHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
             <Button variant="outline" onClick={() => router.push('/teacher/battles/summary')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Battle Archives
            </Button>
            <Card>
                <CardHeader>
                <CardTitle>Summary Not Found</CardTitle>
                <CardDescription>There is no Battle History to Display for this entry! It may have been deleted.</CardDescription>
                </CardHeader>
                <CardContent>
                <Button onClick={() => router.push('/teacher/battles')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Battle Creation
                </Button>
                </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

    if (allRounds.length === 0 && summary.status === 'BATTLE_ENDED') {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-6xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/teacher/battles/summary')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Battle Archives
                        </Button>
                        <Card>
                            <CardHeader>
                                <CardTitle>Battle Concluded Prematurely</CardTitle>
                                <CardDescription>This battle session for "{summary.battleName}" ended before any rounds were completed, so no detailed report is available.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="destructive" onClick={handleCleanupBattle} disabled={isCleaning}>
                                    {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Clear the Battlefield and Return to Dashboard
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        );
    }

  const { totalDamage, totalBaseDamage, totalPowerDamage } = allRounds.reduce((acc, round) => {
    acc.totalDamage += round.lastRoundDamage || 0;
    acc.totalBaseDamage += round.lastRoundBaseDamage || 0;
    acc.totalPowerDamage += round.lastRoundPowerDamage || 0;
    return acc;
  }, { totalDamage: 0, totalBaseDamage: 0, totalPowerDamage: 0 });

  const battleLogByRound: { [round: number]: PowerLogEntry[] } = {};
  if (summary.powerLog) {
      summary.powerLog.forEach(log => {
          const roundKey = log.round - 1; // Align with 0-based index of rounds
          if (!battleLogByRound[roundKey]) {
              battleLogByRound[roundKey] = [];
          }
          battleLogByRound[roundKey].push(log);
      });
  }
  
  const fallenHeroNames = (summary.fallenAtEnd || [])
  .map(uid => {
      const student = allStudents.find(s => s.uid === uid);
      return student ? student.characterName : null;
  })
  .filter(name => name !== null) as string[];

  const participantStats: { [uid: string]: ParticipantStats } = {};
    allRounds.forEach(round => {
        round.responses.forEach(res => {
            if (!participantStats[res.studentUid]) {
                participantStats[res.studentUid] = {
                    characterName: res.characterName,
                    correctAnswers: 0,
                    incorrectAnswers: 0,
                    powersUsed: 0,
                };
            }
            if (res.isCorrect) {
                participantStats[res.studentUid].correctAnswers++;
            } else {
                participantStats[res.studentUid].incorrectAnswers++;
            }
        });
    });

    if (summary.powerLog) {
        summary.powerLog.forEach(log => {
            const student = allStudents.find(s => s.characterName === log.casterName);
            if (student && participantStats[student.uid]) {
                participantStats[student.uid].powersUsed++;
            }
        });
    }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.push('/teacher/battles/summary')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Battle Archives
                </Button>
                <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Return to Podium
                </Button>
            </div>
             <div className="flex items-center gap-4">
                <Button variant="secondary" onClick={handleDownloadCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Full Report
                </Button>
            </div>
          </div>
         
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl">Battle Summary: {summary.battleName}</CardTitle>
              <CardDescription>A complete report of the battle session.</CardDescription>
            </CardHeader>
          </Card>
           <Card>
                <CardHeader>
                    <CardTitle>Round-by-Round Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {allRounds.map((roundData) => {
                            if (!roundData || !roundData.responses || !summary.questions) return null;
                            const question = summary.questions[roundData.currentQuestionIndex];
                            if (!question) return null;
                            const correctCount = roundData.responses.filter(r => r.isCorrect).length;
                            const incorrectCount = roundData.responses.length - correctCount;
                            const roundLog = battleLogByRound[roundData.currentQuestionIndex] || [];
                            const totalRoundDamage = roundData.lastRoundDamage || 0;

                            return (
                                <AccordionItem key={roundData.id} value={roundData.id}>
                                    <AccordionTrigger className="text-lg hover:no-underline">
                                        <div className="flex justify-between w-full pr-4 items-center">
                                            <span className="text-left font-semibold">Q{roundData.currentQuestionIndex + 1}: {question.questionText}</span>
                                            <div className="flex items-center gap-6">
                                                <div className="flex gap-4">
                                                    <span className="text-green-500 font-semibold">{correctCount} Correct</span>
                                                    <span className="text-red-500 font-semibold">{incorrectCount} Incorrect</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-red-600 font-bold">
                                                    <HeartCrack className="w-5 h-5"/>
                                                    <span>{totalRoundDamage} DMG</span>
                                                </div>
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
                                        {(roundLog.length > 0) && (
                                            <div className="mt-2 p-2 bg-blue-900/10 rounded-md">
                                                <h4 className="font-semibold text-sm flex items-center gap-2"><ScrollText className="w-4 h-4"/> Powers Used This Round:</h4>
                                                <ul className="text-xs text-muted-foreground list-disc list-inside mt-1 space-y-1">
                                                    {roundLog.map((log, index) => (
                                                        <li key={index}>
                                                          <span className="font-bold">{log.casterName}</span> used <span className="font-semibold text-primary">{log.powerName}</span>.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Participant Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Character</TableHead>
                                    <TableHead>Correct</TableHead>
                                    <TableHead>Incorrect</TableHead>
                                    <TableHead>Powers Used</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {Object.values(participantStats).map(stats => (
                                    <TableRow key={stats.characterName}>
                                        <TableCell className="font-medium">{stats.characterName}</TableCell>
                                        <TableCell className="text-green-600">{stats.correctAnswers}</TableCell>
                                        <TableCell className="text-red-600">{stats.incorrectAnswers}</TableCell>
                                        <TableCell className="text-blue-600">{stats.powersUsed}</TableCell>
                                    </TableRow>
                               ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {(summary.fallenAtEnd && summary.fallenAtEnd.length > 0) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Skull className="text-destructive"/> Fallen Heroes at Battle's End</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="grid grid-cols-2 gap-2">
                                {fallenHeroNames.map((name, idx) => (
                                        <li key={idx} className="font-semibold p-2 bg-secondary rounded-md text-center">
                                            {name}
                                        </li>
                                    )
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
             <div className="text-center pt-8">
                <Button size="lg" variant="destructive" onClick={handleCleanupBattle} disabled={isCleaning}>
                     {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                     Clear the Battlefield and Return to Dashboard
                </Button>
            </div>
        </div>
      </main>
    </div>
  );
}
