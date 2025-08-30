
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, updateDoc, writeBatch, increment, deleteDoc, runTransaction } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Swords, CheckCircle, XCircle, Trophy, Loader2, Shield, ArrowLeft, Hourglass, Info } from 'lucide-react';
import type { Student } from '@/lib/data';
import type { DuelQuestion, DuelQuestionSection, DuelSettings } from '@/lib/duels';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logGameEvent } from '@/lib/gamelog';
import { calculateLevel } from '@/lib/game-mechanics';
import { getDuelSettings, updateDuelSettings } from '@/ai/flows/manage-duels';
import { format } from 'date-fns';
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


interface DuelState {
    status: 'pending' | 'active' | 'declined' | 'finished' | 'abandoned';
    challengerUid: string;
    opponentUid: string;
    challengerName: string;
    opponentName: string;
    questions?: DuelQuestion[];
    answers?: { [uid: string]: number[] }; // { studentUid: [answerForQ1, answerForQ2, ...] }
    currentQuestionIndex: number;
    winnerUid?: string;
    isDraw?: boolean;
    cost?: number;
}

const DuelPlayerCard = ({ player, answers, isCurrentUser }: { player: Student | null, answers: number[], isCurrentUser: boolean }) => {
    if (!player) return <Skeleton className="h-24 w-full" />;
    return (
        <Card className={cn("text-center", isCurrentUser && "border-primary ring-2 ring-primary")}>
            <CardHeader className="p-2">
                 <Image src={player.avatarUrl} alt={player.characterName} width={100} height={100} className="mx-auto rounded-full border-4" />
                 <CardTitle>{player.characterName}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex justify-center gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={cn(
                        "h-6 w-6 rounded-full border-2",
                        answers[i] === undefined ? 'bg-muted' : answers[i] === 1 ? 'bg-green-500' : 'bg-red-500'
                    )} />
                ))}
            </CardContent>
        </Card>
    );
};

export default function DuelPage() {
    const router = useRouter();
    const params = useParams();
    const duelId = params.id as string;
    const { toast } = useToast();
    
    const [user, setUser] = useState<User | null>(null);
    const [duel, setDuel] = useState<DuelState | null>(null);
    const [challenger, setChallenger] = useState<Student | null>(null);
    const [opponent, setOpponent] = useState<Student | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [duelSettings, setDuelSettings] = useState<DuelSettings | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);

    // New state for decline dialog
    const [showDeclinedDialog, setShowDeclinedDialog] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, currentUser => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router]);

    // Fetch teacher UID
    useEffect(() => {
        if (!user) return;
        const getTeacher = async () => {
            const studentMetaRef = doc(db, 'students', user.uid);
            const studentMetaSnap = await getDoc(studentMetaRef);
            if (studentMetaSnap.exists()) {
                const uid = studentMetaSnap.data().teacherUid;
                setTeacherUid(uid);
                const settings = await getDuelSettings(uid);
                setDuelSettings(settings);
            }
        }
        getTeacher();
    }, [user]);

    const setPlayerDuelStatus = async (batch: any, playerUids: string[], inDuel: boolean) => {
        if (!teacherUid) return;
        playerUids.forEach(uid => {
            const playerRef = doc(db, 'teachers', teacherUid, 'students', uid);
            batch.update(playerRef, { inDuel });
        });
    };

    // Set up duel listener
    useEffect(() => {
        if (!teacherUid || !duelId) return;
        
        const duelRef = doc(db, 'teachers', teacherUid, 'duels', duelId);
        const unsubscribe = onSnapshot(duelRef, async (docSnap) => {
            if (docSnap.exists()) {
                const duelData = docSnap.data() as DuelState;
                const prevStatus = duel?.status;

                // Handle status changes
                if (prevStatus !== 'active' && duelData.status === 'active') {
                    
                    try {
                        await runTransaction(db, async (transaction) => {
                            const challengerRef = doc(db, 'teachers', teacherUid, 'students', duelData.challengerUid);
                            const opponentRef = doc(db, 'teachers', teacherUid, 'students', duelData.opponentUid);
                            
                            const challengerDoc = await transaction.get(challengerRef);
                            const opponentDoc = await transaction.get(opponentRef);

                            if (!challengerDoc.exists() || !opponentDoc.exists()) {
                                throw new Error("A duelist could not be found.");
                            }

                            const challengerData = challengerDoc.data();
                            const opponentData = opponentDoc.data();

                            const cost = duelData.cost || 0;
                            
                            if (cost > 0) {
                                transaction.update(challengerRef, { gold: Math.max(0, challengerData.gold - cost) });
                                transaction.update(opponentRef, { gold: Math.max(0, opponentData.gold - cost) });
                            }
                            
                            // Set inDuel status
                            transaction.update(challengerRef, { inDuel: true });
                            transaction.update(opponentRef, { inDuel: true });

                            if (!duelData.questions || duelData.questions.length === 0) {
                                const activeSectionsSnapshot = await getDocs(query(collection(db, 'teachers', teacherUid, 'duelQuestionSections'), where('isActive', '==', true)));
                                const allQuestions: DuelQuestion[] = [];
                                for (const sectionDoc of activeSectionsSnapshot.docs) {
                                    const questionsSnapshot = await getDocs(collection(sectionDoc.ref, 'questions'));
                                    questionsSnapshot.forEach(qDoc => allQuestions.push({id: qDoc.id, ...qDoc.data()} as DuelQuestion));
                                }
                                
                                const shuffled = allQuestions.sort(() => 0.5 - Math.random());
                                const selectedQuestions = shuffled.slice(0, 10);
                                
                                transaction.update(duelRef, { 
                                    questions: selectedQuestions.map(q => ({...q, id: q.id})),
                                    currentQuestionIndex: 0,
                                    answers: { [duelData.challengerUid]: [], [duelData.opponentUid]: [] }
                                });
                            }
                        });
                    } catch (e) {
                         console.error("Duel start transaction failed: ", e);
                         toast({ variant: "destructive", title: "Error Starting Duel", description: "Could not deduct gold and start the duel." });
                    }

                } else if (prevStatus !== 'finished' && duelData.status === 'finished') {
                    const batch = writeBatch(db);
                    await setPlayerDuelStatus(batch, [duelData.challengerUid, duelData.opponentUid], false);
                    await batch.commit();
                } else if (prevStatus !== 'declined' && duelData.status === 'declined') {
                    if (user?.uid === duelData.challengerUid) {
                        setShowDeclinedDialog(true);
                    }
                    await deleteDoc(duelRef);

                } else if (prevStatus !== 'abandoned' && duelData.status === 'abandoned') {
                    const batch = writeBatch(db);
                    await setPlayerDuelStatus(batch, [duelData.challengerUid, duelData.opponentUid], false);
                    await batch.commit();
                    toast({
                        variant: 'destructive',
                        title: 'Duel Ended',
                        description: 'Your opponent has left the duel.',
                    });
                    router.push('/dashboard');
                }

                setDuel(duelData);

            }
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teacherUid, duelId, router, toast]);

    // Fetch player data once duel is loaded
    useEffect(() => {
        if (!duel || !teacherUid) return;
        const fetchPlayers = async () => {
            const challengerRef = doc(db, 'teachers', teacherUid, 'students', duel.challengerUid);
            const opponentRef = doc(db, 'teachers', teacherUid, 'students', duel.opponentUid);
            const [challengerSnap, opponentSnap] = await Promise.all([getDoc(challengerRef), getDoc(opponentRef)]);
            if (challengerSnap.exists()) setChallenger(challengerSnap.data() as Student);
            if (opponentSnap.exists()) setOpponent(opponentSnap.data() as Student);
            setIsLoading(false);
        };
        fetchPlayers();
    }, [duel, teacherUid]);
    
    // Check if current user has answered this question
    useEffect(() => {
        if (user && duel?.answers && duel.answers[user.uid] && duel.answers[user.uid].length > duel.currentQuestionIndex) {
            setHasAnswered(true);
        } else {
            setHasAnswered(false);
        }
        setSelectedAnswer(null);
    }, [user, duel]);
    
    const handleSubmitAnswer = async () => {
        if (selectedAnswer === null || !user || !duel || hasAnswered || !teacherUid || !duelSettings) return;
        
        const duelRef = doc(db, 'teachers', teacherUid, 'duels', duelId);
        const currentQuestion = duel.questions![duel.currentQuestionIndex];
        const isCorrect = selectedAnswer === currentQuestion.correctAnswerIndex;

        const newAnswers = [...(duel.answers![user.uid] || [])];
        newAnswers[duel.currentQuestionIndex] = isCorrect ? 1 : 0;
        
        const batch = writeBatch(db);
        batch.update(duelRef, { [`answers.${user.uid}`]: newAnswers });
        
        const otherPlayerUid = user.uid === duel.challengerUid ? duel.opponentUid : duel.challengerUid;
        if (duel.answers![otherPlayerUid].length > duel.currentQuestionIndex) {
             if (duel.currentQuestionIndex >= 9) { // Last question
                
                await runTransaction(db, async (transaction) => {
                    const winnerRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
                    const loserRef = doc(db, 'teachers', teacherUid, 'students', otherPlayerUid);

                    const winnerDoc = await transaction.get(winnerRef);
                    const loserDoc = await transaction.get(loserRef);

                    if (!winnerDoc.exists() || !loserDoc.exists()) {
                        throw new Error("Student data not found for reward calculation.");
                    }
                    const winnerData = winnerDoc.data();
                    const loserData = loserDoc.data();

                    const userScore = newAnswers.filter(a => a === 1).length;
                    const opponentScore = duel.answers![otherPlayerUid].filter(a => a === 1).length;
                    
                    let winnerUid = '';
                    let loserUid = '';
                    let isDraw = false;

                    if (userScore > opponentScore) {
                        winnerUid = user.uid;
                        loserUid = otherPlayerUid;
                    } else if (opponentScore > userScore) {
                        winnerUid = otherPlayerUid;
                        loserUid = user.uid;
                    } else {
                        isDraw = true;
                        if (Math.random() < 0.5) {
                            winnerUid = user.uid;
                            loserUid = otherPlayerUid;
                        } else {
                            winnerUid = otherPlayerUid;
                            loserUid = user.uid;
                        }
                    }
                    
                    const winnerName = winnerUid === duel.challengerUid ? duel.challengerName : duel.opponentName;
                    const loserName = loserUid === duel.challengerUid ? duel.challengerName : duel.opponentName;

                    const today = format(new Date(), 'yyyy-MM-dd');
                    const duelCost = duel.cost || 0;
                    
                    if (isDraw) {
                         const winnerFinalGold = (winnerData.gold || 0) + duelSettings.rewardGold;
                         transaction.update(winnerRef, {
                            xp: (winnerData.xp || 0) + duelSettings.rewardXp,
                            gold: Math.max(0, winnerFinalGold), 
                            lastDuelDate: today,
                            duelsCompletedToday: increment(1)
                        });
                         const loserFinalGold = (loserData.gold || 0) + duelCost;
                         transaction.update(loserRef, {
                            gold: Math.max(0, loserFinalGold),
                            lastDuelDate: today,
                            duelsCompletedToday: increment(1)
                        });
                    } else {
                         const winnerFinalGold = (winnerData.gold || 0) + duelSettings.rewardGold;
                         transaction.update(winnerRef, {
                            xp: (winnerData.xp || 0) + duelSettings.rewardXp,
                            gold: Math.max(0, winnerFinalGold),
                            lastDuelDate: today,
                            duelsCompletedToday: increment(1)
                        });
                        const refundAmount = Math.floor(duelCost / 2);
                        const loserFinalGold = (loserData.gold || 0) + refundAmount;
                         transaction.update(loserRef, {
                            gold: Math.max(0, loserFinalGold),
                            lastDuelDate: today,
                            duelsCompletedToday: increment(1)
                        });
                    }
                    
                    transaction.update(duelRef, { status: 'finished', winnerUid, isDraw });

                    await logGameEvent(teacherUid, 'DUEL', `${winnerName} ${isDraw ? 'won a tie-breaker against' : 'defeated'} ${loserName} in a duel.`);
                });
                return;

            } else {
                batch.update(duelRef, { currentQuestionIndex: duel.currentQuestionIndex + 1 });
            }
        }
        
        await batch.commit();
    };

    const handleEndDuel = async () => {
        if (!duel || !teacherUid || !duelSettings) return;
        
        const opponentUid = user?.uid === duel.challengerUid ? duel.opponentUid : duel.challengerUid;
        if (!opponentUid) return;

        setIsLeaving(true);
        try {
            await runTransaction(db, async (transaction) => {
                const duelRef = doc(db, 'teachers', teacherUid, 'duels', duelId);
                const leaverRef = doc(db, 'teachers', teacherUid, 'students', user!.uid);
                const winnerRef = doc(db, 'teachers', teacherUid, 'students', opponentUid);
                
                const winnerDoc = await transaction.get(winnerRef);
                if (!winnerDoc.exists()) throw new Error("Winner not found");
                const winnerData = winnerDoc.data();
                
                const finalXp = (winnerData.xp || 0) + duelSettings.rewardXp;
                const finalGold = (winnerData.gold || 0) + duelSettings.rewardGold + (duel.cost || 0);

                transaction.update(duelRef, { status: 'finished', winnerUid: opponentUid });
                transaction.update(leaverRef, { inDuel: false });
                transaction.update(winnerRef, { 
                    inDuel: false,
                    xp: finalXp,
                    gold: Math.max(0, finalGold)
                });
            });

            toast({
                title: 'Duel Forfeited',
                description: 'You have left the duel. Your opponent has been declared the winner.',
            });
            router.push('/dashboard');
        } catch (error) {
            console.error("Error ending duel:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not end the duel. Please try again.',
            });
            setIsLeaving(false);
        }
    };
    
    const currentUserAnswers = user && duel?.answers ? (duel.answers[user.uid] || []) : [];
    const opponentUid = user?.uid === duel?.challengerUid ? duel?.opponentUid : duel?.challengerUid;
    const opponentAnswers = opponentUid && duel?.answers ? (duel.answers[opponentUid] || []) : [];
    
    if (isLoading || !duel) {
        return <div className="flex h-screen items-center justify-center bg-gray-900"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }

    if (showDeclinedDialog) {
        return (
            <AlertDialog open={true} onOpenChange={() => router.push('/dashboard')}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Challenge Declined</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your challenge to {duel.opponentName} was declined. You were not charged the Arena Fee.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => router.push('/dashboard')}>Return to Dashboard</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )
    }

    if (duel.status === 'pending') {
        return (
             <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
                <Card className="text-center p-8 bg-card/80 backdrop-blur-sm">
                    <Hourglass className="h-16 w-16 mx-auto text-primary animate-spin" />
                    <CardTitle className="text-4xl mt-4">Duel Pending...</CardTitle>
                    <CardDescription>Waiting for {duel.challengerUid === user?.uid ? duel.opponentName : duel.challengerName} to respond to your challenge.</CardDescription>
                </Card>
            </div>
        )
    }

    if (duel.status === 'finished') {
        const winnerMessage = duel.winnerUid === user?.uid ? 'You are victorious!' : 'You have been defeated!';
        
        let rewardsMessage = '';
        
        if (duel.isDraw) {
            if (duel.winnerUid === user?.uid) {
                rewardsMessage = `You won the tie-breaker and have been awarded ${duelSettings?.rewardXp} XP and ${duelSettings?.rewardGold} Gold!`;
            } else {
                rewardsMessage = `You lost the tie-breaker, but your entry fee of ${duelSettings?.duelCost} Gold has been fully refunded.`;
            }
        } else if (duel.winnerUid === user?.uid && duelSettings) {
            rewardsMessage = `You have been awarded ${duelSettings.rewardXp} XP and ${duelSettings.rewardGold} Gold!`;
        } else {
             rewardsMessage = `Your entry fee of ${Math.floor((duel.cost || 0) / 2)} Gold has been refunded for finishing the duel.`;
        }

        return (
            <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
                <Card className="text-center p-8 bg-card/80 backdrop-blur-sm">
                    <Trophy className="h-16 w-16 mx-auto text-yellow-400" />
                    <CardTitle className="text-4xl mt-4">{winnerMessage}</CardTitle>
                    <CardDescription>{rewardsMessage}</CardDescription>
                    {duel.isDraw && (
                        <p className="text-muted-foreground mt-2">(The duel was a tie! The winner was chosen by a flip of a coin.)</p>
                    )}
                    <CardContent>
                        <Button className="mt-4" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (duel.status === 'active' && (!duel.questions || duel.questions.length === 0)) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
                <Card className="text-center p-8 bg-card/80 backdrop-blur-sm">
                    <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
                    <CardTitle className="text-4xl mt-4">Preparing the Arena...</CardTitle>
                    <CardDescription>Questions are being selected for your duel.</CardDescription>
                </Card>
            </div>
        )
    }
    
    const currentQuestion = duel.questions ? duel.questions[duel.currentQuestionIndex] : null;


    return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-900 p-4 text-white">
             <div className="absolute top-4 left-4 z-10">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isLeaving}>
                            {isLeaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
                            End Duel and Return to Dashboard
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to end the duel?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You will forfeit the match and your entry fee. Your opponent will be declared the winner and receive the full reward.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleEndDuel} className="bg-destructive hover:bg-destructive/90">
                                Forfeit Duel
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="w-full max-w-4xl">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <DuelPlayerCard player={challenger} answers={duel.answers?.[duel.challengerUid] || []} isCurrentUser={user?.uid === challenger?.uid} />
                    <DuelPlayerCard player={opponent} answers={duel.answers?.[duel.opponentUid] || []} isCurrentUser={user?.uid === opponent?.uid} />
                </div>
                
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader className="text-center">
                        <CardTitle>Question {duel.currentQuestionIndex + 1} / 10</CardTitle>
                        <h2 className="text-2xl font-bold text-white pt-2">{currentQuestion?.text}</h2>
                    </CardHeader>
                    <CardContent>
                        {hasAnswered ? (
                            <div className="text-center text-white font-bold text-lg p-4 bg-black/30 rounded-md">
                                Your answer is locked in! Waiting for your opponent...
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    {currentQuestion?.answers.map((answer, index) => (
                                        <Button
                                            key={index}
                                            variant={selectedAnswer === index ? 'default' : 'outline'}
                                            onClick={() => setSelectedAnswer(index)}
                                            className="h-auto py-4"
                                        >
                                            {answer}
                                        </Button>
                                    ))}
                                </div>
                                <div className="text-center mt-4">
                                     <Button onClick={handleSubmitAnswer} disabled={selectedAnswer === null}>Submit</Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
