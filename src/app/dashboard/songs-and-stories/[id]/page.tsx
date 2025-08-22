
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Star, Coins, CheckCircle, XCircle, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
    id: string;
    currentQuestionIndex: number;
    responses: {
        studentUid: string;
        characterName: string;
        answerIndex: number;
        isCorrect: boolean;
    }[];
}

interface SavedBattle {
    id: string;
    battleName: string;
    battleId: string;
    savedAt?: { seconds: number; nanoseconds: number; };
    startedAt?: { seconds: number; nanoseconds: number; };
    rewardsByStudent?: {
        [uid: string]: {
            xpGained: number;
            goldGained: number;
        }
    };
    powerLog?: PowerLogEntry[];
}

export default function BattleSummaryDetailPage() {
    const router = useRouter();
    const params = useParams();
    const savedBattleId = params.id as string;
    const { toast } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [summary, setSummary] = useState<SavedBattle | null>(null);
    const [allRounds, setAllRounds] = useState<RoundSnapshot[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const studentMetaRef = doc(db, 'students', currentUser.uid);
                const studentMetaSnap = await getDoc(studentMetaRef);
                if (studentMetaSnap.exists()) {
                    setTeacherUid(studentMetaSnap.data().teacherUid);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not identify your guild.' });
                    router.push('/dashboard');
                }
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router, toast]);

    useEffect(() => {
        if (!user || !teacherUid || !savedBattleId) return;

        const fetchSummaryData = async () => {
            setIsLoading(true);
            try {
                // Fetch the main summary document
                const summaryRef = doc(db, 'teachers', teacherUid, 'savedBattles', savedBattleId);
                const summarySnap = await getDoc(summaryRef);
                if (!summarySnap.exists()) {
                    toast({ variant: 'destructive', title: 'Not Found', description: 'This battle report could not be found.' });
                    router.push('/dashboard/songs-and-stories');
                    return;
                }
                const summaryData = { id: summarySnap.id, ...summarySnap.data() } as SavedBattle;
                setSummary(summaryData);
                
                // Fetch the original battle template to get the questions
                const battleTemplateRef = doc(db, 'teachers', teacherUid, 'bossBattles', summaryData.battleId);
                const battleTemplateSnap = await getDoc(battleTemplateRef);
                if (battleTemplateSnap.exists()) {
                    setQuestions(battleTemplateSnap.data().questions as Question[]);
                }
                
                // Fetch the `rounds` subcollection
                const roundsRef = collection(db, 'teachers', teacherUid, 'savedBattles', savedBattleId, 'rounds');
                const roundsQuery = query(roundsRef, orderBy('currentQuestionIndex'));
                const roundsSnapshot = await getDocs(roundsQuery);
                const roundsData = roundsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as RoundSnapshot);
                setAllRounds(roundsData);

            } catch (error) {
                console.error("Error fetching summary:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load the battle report.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummaryData();
    }, [user, teacherUid, savedBattleId, router, toast]);
    
    if (isLoading || !summary || !user) {
        return (
            <div className="flex flex-col min-h-screen bg-muted/40">
                 <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                    <Skeleton className="h-10 w-48" />
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </main>
            </div>
        )
    }
    
    const userRewards = summary.rewardsByStudent?.[user.uid] || { xpGained: 0, goldGained: 0 };
    const date = summary.startedAt ?? summary.savedAt;

    const battleLogByRound: { [round: number]: PowerLogEntry[] } = {};
    if (summary.powerLog) {
        summary.powerLog.forEach(log => {
            const roundKey = log.round - 1; // Align with 0-based index
            if (!battleLogByRound[roundKey]) {
                battleLogByRound[roundKey] = [];
            }
            battleLogByRound[roundKey].push(log);
        });
    }

    return (
        <div 
            className="flex flex-col min-h-screen bg-cover bg-center"
            style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-a832e841-3a85-4ec7-91a5-3a2168391745.jpg?alt=media&token=c5608d4b-d703-455b-8664-32b7194f4a38')`}}
        >
             <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                <Button variant="outline" onClick={() => router.push('/dashboard/songs-and-stories')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Battle Reports
                </Button>
            </header>
             <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
                <div className="w-full max-w-4xl space-y-6">
                    <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <CardTitle className="text-4xl font-headline">{summary.battleName}</CardTitle>
                            <CardDescription>
                                Battle concluded on {date ? format(new Date(date.seconds * 1000), 'PPPp') : 'Date unknown'}
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-2xl text-center">Spoils of War</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-lg">
                                <Star className="h-12 w-12 text-yellow-400 mb-2" />
                                <p className="text-3xl font-bold">{userRewards.xpGained}</p>
                                <p className="text-muted-foreground">Experience Gained</p>
                            </div>
                             <div className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-lg">
                                <Coins className="h-12 w-12 text-amber-500 mb-2" />
                                <p className="text-3xl font-bold">{userRewards.goldGained}</p>
                                <p className="text-muted-foreground">Gold Gained</p>
                            </div>
                        </CardContent>
                    </Card>
                    
                     <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-2xl text-center">Battle Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {allRounds.map((round) => {
                                    const studentResponse = round.responses.find(r => r.studentUid === user?.uid);
                                    if (!studentResponse) return null; // Skip rounds the student didn't answer in

                                    const question = questions[round.currentQuestionIndex];
                                    if (!question) return null; // Skip if question data isn't loaded yet

                                    return (
                                        <AccordionItem key={round.id} value={round.id}>
                                            <AccordionTrigger className="text-lg hover:no-underline">
                                                <div className="flex justify-between w-full pr-4 items-center">
                                                    <span className="text-left">Q{round.currentQuestionIndex + 1}: {question.questionText}</span>
                                                    {studentResponse.isCorrect ? <CheckCircle className="h-6 w-6 text-green-500 ml-2" /> : <XCircle className="h-6 w-6 text-red-500 ml-2" />}
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="p-4 bg-secondary/50 rounded-md">
                                                    <p className="font-semibold">You answered: <span className="font-normal">{question.answers[studentResponse.answerIndex]}</span></p>
                                                    <p className="font-semibold">Correct answer: <span className="font-normal">{question.answers[question.correctAnswerIndex]}</span></p>
                                                </div>
                                                {(battleLogByRound[round.currentQuestionIndex]) && (
                                                    <div className="mt-2 p-2 bg-blue-900/10 rounded-md">
                                                        <h4 className="font-semibold text-sm flex items-center gap-2"><ScrollText className="w-4 h-4"/> Powers Used This Round:</h4>
                                                        <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
                                                            {battleLogByRound[round.currentQuestionIndex].map((log, index) => (
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
                </div>
             </main>
        </div>
    );
}
