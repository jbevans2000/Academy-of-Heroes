
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Star, Coins, CheckCircle, XCircle, ScrollText, HeartCrack, Sparkles, ShieldCheck, UserCheck, BarChart, Dices, Trophy, Heart, Wand2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
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
            breakdown: RewardBreakdown;
        }
    };
    powerLog?: any[];
    totalDamage?: number;
    totalBaseDamage?: number;
    totalPowerDamage?: number;
    martialSacrificeCasterUid?: string | null;
    arcaneSacrificeCasterUid?: string | null;
    divineSacrificeCasterUid?: string | null;
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
    
    const userRewards = summary.rewardsByStudent?.[user.uid];
    const breakdown = userRewards?.breakdown;
    const date = summary.startedAt ?? summary.savedAt;

    const madeSacrifice = summary.martialSacrificeCasterUid === user.uid ||
                          summary.arcaneSacrificeCasterUid === user.uid ||
                          summary.divineSacrificeCasterUid === user.uid;

    return (
        <div 
            className="flex flex-col min-h-screen bg-cover bg-center"
            style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-a832e841-3a85-4ec7-91a5-3a2168391745.jpg?alt=media&token=c5608d4b-d703-455b-8664-32b7194f4a38')`}}
        >
             <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                <Button variant="outline" onClick={() => window.location.href = '/dashboard/songs-and-stories'}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Songs & Stories
                </Button>
            </header>
             <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
                <div className="w-full max-w-4xl space-y-6">
                    <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <Trophy className="h-12 w-12 mx-auto text-yellow-400"/>
                            <CardTitle className="text-4xl font-headline">{summary.battleName}</CardTitle>
                            <CardDescription>
                                Battle concluded on {date ? format(new Date(date.seconds * 1000), 'PPPp') : 'Date unknown'}
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl text-center">Your Battle Report</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-secondary rounded-lg">
                                    <p className="text-sm font-medium text-muted-foreground">TOTAL XP GAINED</p>
                                    <p className="text-4xl font-bold flex items-center justify-center gap-2"><Star className="h-8 w-8 text-yellow-400" /> {userRewards?.xpGained || 0}</p>
                                </div>
                                <div className="p-4 bg-secondary rounded-lg">
                                    <p className="text-sm font-medium text-muted-foreground">TOTAL GOLD GAINED</p>
                                    <p className="text-4xl font-bold flex items-center justify-center gap-2"><Coins className="h-8 w-8 text-amber-500" /> {userRewards?.goldGained || 0}</p>
                                </div>
                            </div>

                            {madeSacrifice && (
                                <div className="p-4 rounded-lg bg-purple-100 dark:bg-purple-900/50 border border-purple-500 text-center">
                                    <Shield className="h-8 w-8 mx-auto text-purple-600 dark:text-purple-300 mb-2"/>
                                    <h4 className="font-bold text-lg text-purple-800 dark:text-purple-200">A Hero's Sacrifice</h4>
                                    <p className="text-purple-700 dark:text-purple-300">You sacrificed your personal rewards to grant your allies a powerful bonus. Your guild will remember your selflessness!</p>
                                </div>
                            )}

                            {breakdown && (
                                <div className="p-4 border rounded-lg space-y-3">
                                    <h4 className="font-semibold text-lg text-center">Reward Breakdown</h4>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Correct Answers</span>
                                        <span className="font-semibold">+{breakdown.xpFromAnswers} XP, +{breakdown.goldFromAnswers} Gold</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-500" />Powers Used</span>
                                        <span className="font-semibold">+{breakdown.xpFromPowers} XP, +{breakdown.goldFromPowers} Gold</span>
                                    </div>
                                     {breakdown.hadFullParticipation && (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <span className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-purple-500" />Full Participation Bonus</span>
                                                <span className="font-semibold">+{breakdown.xpFromParticipation} XP, +{breakdown.goldFromParticipation} Gold</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="flex items-center gap-2"><BarChart className="h-5 w-5 text-orange-500" />Damage Share Bonus</span>
                                                <span className="font-semibold">+{breakdown.xpFromDamageShare} XP</span>
                                            </div>
                                        </>
                                     )}
                                    {breakdown.martialSacrificeBonus && <div className="flex justify-between items-center text-amber-600"><span className="flex items-center gap-2"><Shield className="h-5 w-5" />Martial Sacrifice Bonus</span><span className="font-semibold">+25% XP/Gold</span></div>}
                                    {breakdown.arcaneSacrificeBonus && <div className="flex justify-between items-center text-blue-600"><span className="flex items-center gap-2"><Wand2 className="h-5 w-5" />Arcane Sacrifice Bonus</span><span className="font-semibold">+25% XP</span></div>}
                                    {breakdown.divineSacrificeBonus && <div className="flex justify-between items-center text-green-600"><span className="flex items-center gap-2"><Heart className="h-5 w-5" />Divine Sacrifice Bonus</span><span className="font-semibold">+25% XP</span></div>}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-2xl text-center">Your Battle Performance</CardTitle>
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
                                                {(round.lastRoundPowersUsed && round.lastRoundPowersUsed.length > 0) && (
                                                    <div className="mt-2 p-2 bg-blue-900/10 rounded-md">
                                                        <h4 className="font-semibold text-sm flex items-center gap-2"><ScrollText className="w-4 h-4"/> Party Powers Used This Round:</h4>
                                                        <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                                                            {round.lastRoundPowersUsed.map((power, index) => (
                                                                <li key={index}>{power}</li>
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
