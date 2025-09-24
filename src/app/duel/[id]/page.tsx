
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, updateDoc, writeBatch, increment, deleteDoc, runTransaction, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Swords, CheckCircle, XCircle, Trophy, Loader2, Shield, ArrowLeft, Hourglass, Info, VolumeX, Volume1, Volume2 as VolumeIcon } from 'lucide-react';
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
import { royaltyFreeTracks } from '@/lib/music';
import { Slider } from '@/components/ui/slider';


interface DuelState {
    status: 'pending' | 'active' | 'round_result' | 'finished' | 'abandoned' | 'sudden_death';
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
    costsDeducted?: boolean; 
    timerEndsAt?: Timestamp;
    resultEndsAt?: Timestamp | null; // For the 5-second result screen
}

const DuelPlayerCard = ({ player, answers, isCurrentUser, questionCount, isSuddenDeath, numNormalQuestions }: { 
    player: Student | null, 
    answers: number[], 
    isCurrentUser: boolean, 
    questionCount: number,
    isSuddenDeath: boolean,
    numNormalQuestions: number,
}) => {
    if (!player) return <Skeleton className="h-24 w-full" />;
    
    const answerIndexOffset = isSuddenDeath ? numNormalQuestions : 0;

    return (
        <Card className={cn("text-center bg-card/50", isCurrentUser && "border-primary ring-2 ring-primary")}>
            <CardHeader className="p-2">
                 <div className="relative w-24 h-24 mx-auto rounded-full">
                    <Image src={player.avatarUrl} alt={player.characterName} fill className="object-contain rounded-full" />
                 </div>
                 <CardTitle>{player.characterName}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex justify-center gap-2">
                {Array.from({ length: questionCount }).map((_, i) => {
                    const answerForThisCircle = answers[i + answerIndexOffset];
                    return (
                        <div key={i} className={cn(
                            "h-6 w-6 rounded-full border-2",
                            answerForThisCircle === undefined ? 'bg-muted' : answerForThisCircle === 1 ? 'bg-green-500' : 'bg-red-500'
                        )} />
                    );
                })}
            </CardContent>
        </Card>
    );
};

const CountdownTimer = ({ expiryTimestamp }: { expiryTimestamp: Timestamp | undefined }) => {
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        if (!expiryTimestamp) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const ends = expiryTimestamp.toDate().getTime();
            const secondsLeft = Math.round(Math.max(0, (ends - now) / 1000));
            setTimeLeft(secondsLeft);
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTimestamp]);
    
    const isUrgent = timeLeft <= 10 && timeLeft > 0;

    if (isUrgent) {
        return (
             <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in-50 pointer-events-none">
                <div className="text-center animate-pulse">
                    <p className="text-9xl font-bold font-mono text-destructive drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">{timeLeft}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center gap-2 text-2xl font-bold font-mono text-yellow-400">
            <Hourglass className="h-6 w-6" />
            <span>{timeLeft}</span>
        </div>
    );
};

const AudioPlayer = ({ duel, musicUrl, audioRef, onFirstInteraction }: { 
    duel: DuelState | null; 
    musicUrl: string;
    audioRef: React.RefObject<HTMLAudioElement>;
    onFirstInteraction: () => void;
}) => {
    const [volume, setVolume] = useState(20);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !musicUrl) return;

        const isPlayableStatus = duel?.status !== 'pending' && duel?.status !== 'finished' && duel?.status !== 'abandoned';

        if (isPlayableStatus) {
            if (audio.src !== musicUrl) {
                audio.src = musicUrl;
                 audio.volume = volume / 100;
            }
            audio.play().catch(e => console.error("Audio play failed:", e));
        } else {
            audio.pause();
        }
    }, [duel?.status, musicUrl, audioRef, volume]);

    const getVolumeIcon = () => {
        const audio = audioRef.current;
        if (!audio || audio.muted || volume === 0) return <VolumeX className="h-6 w-6" />;
        if (volume <= 50) return <Volume1 className="h-6 w-6" />;
        return <VolumeIcon className="h-6 w-6" />;
    };
    
    const handleVolumeChange = (value: number[]) => {
        onFirstInteraction();
        const newVolume = value[0];
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume / 100;
        }
    };

    return (
         <div className="fixed bottom-4 right-4 z-50 w-48 p-4 rounded-lg bg-black/50 backdrop-blur-sm text-white">
            <p className="text-xs text-center mb-1">Volume</p>
            <div className="flex items-center gap-2">
                {getVolumeIcon()}
                <Slider
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                />
            </div>
        </div>
    );
}

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
    const [showQuestion, setShowQuestion] = useState(false);
    
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [duelSettings, setDuelSettings] = useState<DuelSettings | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);
    const [showDeclinedDialog, setShowDeclinedDialog] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [hasInteracted, setHasInteracted] = useState(false);
    
    const musicUrl = useMemo(() => {
        if (royaltyFreeTracks.length === 0) return '';
        const randomIndex = Math.floor(Math.random() * royaltyFreeTracks.length);
        return royaltyFreeTracks[randomIndex].url;
    }, []);

    const onFirstInteraction = () => {
      if (!hasInteracted) {
          setHasInteracted(true);
          const audio = audioRef.current;
          if (audio) {
              audio.volume = 0.2; // Start at a reasonable volume
              audio.play().catch(e => console.error("Audio play failed on interaction:", e));
          }
      }
    };

    const duelRef = useMemo(() => {
        if (!teacherUid || !duelId) return null;
        return doc(db, 'teachers', teacherUid, 'duels', duelId);
    }, [teacherUid, duelId]);

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
            }
        }
        getTeacher();
    }, [user]);

     const handleDuelEnd = useCallback(async (transaction: any, winnerUid: string, loserUid: string, isForfeit: boolean, isDrawByExhaustion = false) => {
        if (!duel || !teacherUid || !duelSettings || !duelRef) return;

        const winnerRef = doc(db, 'teachers', teacherUid, 'students', winnerUid);
        const loserRef = doc(db, 'teachers', teacherUid, 'students', loserUid);
        
        const winnerDoc = await transaction.get(winnerRef);
        const loserDoc = await transaction.get(loserRef);
        if (!winnerDoc.exists() || !loserDoc.exists()) throw new Error("A duelist could not be found.");

        const winnerData = winnerDoc.data();
        
        if (isDrawByExhaustion) {
            const refundAmount = duel.cost || 0;
            if (refundAmount > 0) {
                transaction.update(winnerRef, { gold: (winnerData.gold || 0) + refundAmount });
                transaction.update(loserRef, { gold: (loserDoc.data().gold || 0) + refundAmount });
            }
            transaction.update(duelRef, { status: 'finished', isDraw: true, winnerUid: null }); 
        } else {
            const duelCost = duel.cost || 0;
            const winnerFinalXp = (winnerData.xp || 0) + duelSettings.rewardXp;
            const winnerFinalGold = (winnerData.gold || 0) + duelSettings.rewardGold + (isForfeit ? 0 : duelCost);
            
            transaction.update(winnerRef, { xp: winnerFinalXp, gold: winnerFinalGold });
            
            if (!isForfeit) {
                const refundAmount = Math.floor(duelCost / 2);
                 if (refundAmount > 0) {
                    const loserData = loserDoc.data();
                    transaction.update(loserRef, { gold: (loserData.gold || 0) + refundAmount });
                }
            }
            transaction.update(duelRef, { status: 'finished', winnerUid, isDraw: duel.isDraw ?? false });
        }

        transaction.update(winnerRef, { dailyDuelCount: increment(1) });
        transaction.update(loserRef, { dailyDuelCount: increment(1) });

        const winnerName = winnerUid === duel.challengerUid ? duel.challengerName : duel.opponentName;
        const loserName = loserUid === duel.challengerUid ? duel.challengerName : duel.opponentName;
        await logGameEvent(teacherUid, 'DUEL', `${winnerName} defeated ${loserName} in a duel.`);
    }, [duel, teacherUid, duelSettings, duelRef]);

    const processRoundResults = useCallback(async () => {
        if (!user || !duelRef || !teacherUid || !duelSettings || !duel) return;

        await runTransaction(db, async (transaction) => {
            const duelDoc = await transaction.get(duelRef);
            if (!duelDoc.exists()) throw new Error("Duel disappeared");
            const freshDuelData = duelDoc.data() as DuelState;
            
            if (freshDuelData.status !== 'active' && freshDuelData.status !== 'sudden_death') return;

            const myAnswers = freshDuelData.answers?.[user.uid] || [];
            const opponentUid = user.uid === freshDuelData.challengerUid ? freshDuelData.opponentUid : freshDuelData.challengerUid;
            const opponentAnswers = freshDuelData.answers?.[opponentUid] || [];
            
            const updates: Partial<DuelState> = {};
            const numNormalQuestions = duelSettings.numNormalQuestions ?? 10;
            const numSuddenDeathQuestions = duelSettings.numSuddenDeathQuestions ?? 10;

            if (freshDuelData.isDraw) {
                if (myAnswers[freshDuelData.currentQuestionIndex] > opponentAnswers[freshDuelData.currentQuestionIndex]) {
                    await handleDuelEnd(transaction, user.uid, opponentUid, false);
                } else if (opponentAnswers[freshDuelData.currentQuestionIndex] > myAnswers[freshDuelData.currentQuestionIndex]) {
                    await handleDuelEnd(transaction, opponentUid, user.uid, false);
                } else {
                    if (freshDuelData.currentQuestionIndex >= (numNormalQuestions + numSuddenDeathQuestions - 1)) {
                         await handleDuelEnd(transaction, user.uid, opponentUid, false, true);
                    } else {
                        updates.status = 'round_result';
                        updates.isDraw = true; // Carry over the draw state
                        updates.resultEndsAt = Timestamp.fromMillis(Date.now() + 5000);
                    }
                }
            } else {
                const isLastRegularQuestion = freshDuelData.currentQuestionIndex >= (numNormalQuestions - 1);
                if (isLastRegularQuestion) {
                    const myFinalScore = myAnswers.slice(0, numNormalQuestions).filter(a => a === 1).length;
                    const opponentFinalScore = opponentAnswers.slice(0, numNormalQuestions).filter(a => a === 1).length;
                    if (myFinalScore !== opponentFinalScore) {
                        const winnerUid = myFinalScore > opponentFinalScore ? user.uid : opponentUid;
                        const loserUid = winnerUid === user.uid ? opponentUid : user.uid;
                        await handleDuelEnd(transaction, winnerUid, loserUid, false);
                    } else {
                        updates.status = 'sudden_death';
                        updates.isDraw = true;
                        updates.resultEndsAt = Timestamp.fromMillis(Date.now() + 7000);
                    }
                } else {
                    updates.status = 'round_result';
                    updates.isDraw = false;
                    updates.resultEndsAt = Timestamp.fromMillis(Date.now() + 5000);
                }
            }
            if (Object.keys(updates).length > 0) {
                transaction.update(duelRef, updates);
            }
        });
    }, [user, duelRef, teacherUid, handleDuelEnd, duelSettings, duel]);

    const handleDuelStart = useCallback(async (duelData: DuelState) => {
        if (!teacherUid || !duelRef || !duelSettings) return;
        try {
            await runTransaction(db, async (transaction) => {
                const duelDocForTransaction = await transaction.get(duelRef);
                if (!duelDocForTransaction.exists()) throw new Error("Duel disappeared.");
                
                const currentDuelData = duelDocForTransaction.data() as DuelState;
                if (currentDuelData.costsDeducted) {
                    return; 
                }
                
                const challengerRef = doc(db, 'teachers', teacherUid, 'students', currentDuelData.challengerUid);
                const opponentRef = doc(db, 'teachers', teacherUid, 'students', currentDuelData.opponentUid);
                
                const challengerDoc = await transaction.get(challengerRef);
                const opponentDoc = await transaction.get(opponentRef);

                if (!challengerDoc.exists() || !opponentDoc.exists()) {
                    throw new Error("A duelist could not be found.");
                }

                const challengerData = challengerDoc.data();
                const opponentData = opponentDoc.data();
                const cost = currentDuelData.cost || 0;
                
                if (cost > 0) {
                    const newChallengerGold = Math.max(0, (challengerData.gold || 0) - cost);
                    const newOpponentGold = Math.max(0, (opponentData.gold || 0) - cost);
                    transaction.update(challengerRef, { gold: newChallengerGold });
                    transaction.update(opponentRef, { gold: newOpponentGold });
                }
                
                transaction.update(challengerRef, { inDuel: true });
                transaction.update(opponentRef, { inDuel: true });
                
                const duelUpdates: Partial<DuelState> = { 
                    costsDeducted: true,
                    timerEndsAt: Timestamp.fromMillis(Date.now() + 60000)
                };

                 if (!currentDuelData.questions || currentDuelData.questions.length === 0) {
                    const activeSectionsSnapshot = await getDocs(query(collection(db, 'teachers', teacherUid, 'duelQuestionSections'), where('isActive', '==', true)));
                    const allQuestions: DuelQuestion[] = [];
                    for (const sectionDoc of activeSectionsSnapshot.docs) {
                        const questionsSnapshot = await getDocs(collection(sectionDoc.ref, 'questions'));
                        questionsSnapshot.forEach(qDoc => allQuestions.push({id: qDoc.id, ...qDoc.data()} as DuelQuestion));
                    }
                    
                    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
                    const totalQuestionsNeeded = (duelSettings.numNormalQuestions ?? 10) + (duelSettings.numSuddenDeathQuestions ?? 10);
                    const selectedQuestions = shuffled.slice(0, totalQuestionsNeeded);
                    
                    duelUpdates.questions = selectedQuestions.map(q => ({...q, id: q.id}));
                    duelUpdates.currentQuestionIndex = 0;
                    duelUpdates.answers = { [currentDuelData.challengerUid]: [], [currentDuelData.opponentUid]: [] };
                }
                
                transaction.update(duelRef, duelUpdates);
            });
        } catch (e) {
             console.error("Duel start transaction failed: ", e);
             toast({ variant: "destructive", title: "Error Starting Duel", description: "Could not deduct gold and start the duel." });
        }
    }, [teacherUid, duelRef, toast, duelSettings]);
    
    const handleSubmitAnswer = useCallback(async (isTimeout = false) => {
        if (!user || !duelRef || hasAnswered || !teacherUid || !duel) return;
        if (!isTimeout && selectedAnswer === null) return;
        
        onFirstInteraction();
        setHasAnswered(true);

        const currentQuestion = duel.questions?.[duel.currentQuestionIndex];
        if (!currentQuestion) {
            console.error("No current question found!");
            return;
        }

        const myAnswerIsCorrect = isTimeout ? false : selectedAnswer === currentQuestion.correctAnswerIndex;
        const myAnswerValue = myAnswerIsCorrect ? 1 : 0;
        
        const answerPath = `answers.${user.uid}`;
        
        await runTransaction(db, async (transaction) => {
            const duelDoc = await transaction.get(duelRef);
            if (!duelDoc.exists()) throw new Error("Duel disappeared");
            
            const duelData = duelDoc.data() as DuelState;
            const currentAnswers = duelData.answers?.[user.uid] || [];
            
            if (currentAnswers.length > duelData.currentQuestionIndex) return;

            const newAnswers = [...currentAnswers];
            newAnswers[duelData.currentQuestionIndex] = myAnswerValue;

            transaction.update(duelRef, { [answerPath]: newAnswers });
        });

    }, [selectedAnswer, user, duelRef, hasAnswered, teacherUid, duel]);

    const setPlayerDuelStatus = async (batch: any, playerUids: string[], inDuel: boolean) => {
        if (!teacherUid) return;
        playerUids.forEach(uid => {
            const playerRef = doc(db, 'teachers', teacherUid, 'students', uid);
            batch.update(playerRef, { inDuel });
        });
    };

    useEffect(() => {
        if (!duelRef || !teacherUid) return;
        
        const unsubscribe = onSnapshot(duelRef, async (docSnap) => {
            if (docSnap.exists()) {
                const duelData = docSnap.data() as DuelState;
                const prevStatus = duel?.status;
                const prevQuestionIndex = duel?.currentQuestionIndex;
                
                if (prevStatus !== 'active' && duelData.status === 'active' && (!duelData.questions || duelData.questions.length === 0)) {
                    handleDuelStart(duelData);
                }
                
                if (prevQuestionIndex !== duelData.currentQuestionIndex) {
                    setHasAnswered(false);
                    setSelectedAnswer(null);
                }

                if (prevStatus !== 'finished' && duelData.status === 'finished') {
                    const batch = writeBatch(db);
                    await setPlayerDuelStatus(batch, [duelData.challengerUid, duelData.opponentUid], false);
                    await batch.commit();
                } else if (prevStatus !== 'declined' && duelData.status === 'declined') {
                    if (user?.uid === duelData.challengerUid) {
                        setShowDeclinedDialog(true);
                    }
                } else if (prevStatus !== 'abandoned' && duelData.status === 'abandoned') {
                    const batch = writeBatch(db);
                    await setPlayerDuelStatus(batch, [duelData.challengerUid, duelData.opponentUid], false);
                    await batch.commit();
                }

                setDuel(duelData);

            } else {
                 if (duel?.status === 'declined' || duel?.status === 'abandoned') {
                    if (user?.uid === duel?.challengerUid) {
                        router.push('/dashboard');
                    }
                }
            }
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duelRef, teacherUid, router, toast, handleDuelStart]);
    
    // This effect handles advancing to the next round AFTER the result screen is shown.
    useEffect(() => {
        if (!duelRef || (duel?.status !== 'round_result' && duel?.status !== 'sudden_death') || !duel.resultEndsAt) return;
        
        const timeUntilNextRound = duel.resultEndsAt.toDate().getTime() - Date.now();
        
        const timeout = setTimeout(async () => {
            const currentDuelSnap = await getDoc(duelRef);
            if(currentDuelSnap.exists()) {
                 const currentDuelData = currentDuelSnap.data() as DuelState;
                 if (currentDuelData.status === 'round_result' || currentDuelData.status === 'sudden_death') {
                    await updateDoc(duelRef, { 
                        status: 'active',
                        currentQuestionIndex: duel.currentQuestionIndex + 1,
                        timerEndsAt: Timestamp.fromMillis(Date.now() + 60000), // Reset timer for next round
                        resultEndsAt: null,
                    });
                 }
            }
        }, timeUntilNextRound > 0 ? timeUntilNextRound : 0);

        return () => clearTimeout(timeout);
    }, [duel?.status, duel?.resultEndsAt, duelRef, duel?.currentQuestionIndex]);
    
    // This effect handles the round timeout.
    useEffect(() => {
        if (!duel?.timerEndsAt || hasAnswered || (duel.status !== 'active' && duel.status !== 'sudden_death')) return;

        const timeUntilTimeout = duel.timerEndsAt.toDate().getTime() - Date.now();
        if (timeUntilTimeout <= 0) {
            handleSubmitAnswer(true);
            return;
        }

        const timeout = setTimeout(() => {
              handleSubmitAnswer(true);
        }, timeUntilTimeout);

        return () => clearTimeout(timeout);
    }, [duel?.timerEndsAt, hasAnswered, duel?.status, handleSubmitAnswer]);


    useEffect(() => {
        if (!duel || !teacherUid) return;
        const fetchPlayersAndSettings = async () => {
            const challengerRef = doc(db, 'teachers', teacherUid, 'students', duel.challengerUid);
            const opponentRef = doc(db, 'teachers', teacherUid, 'students', duel.opponentUid);
            const [challengerSnap, opponentSnap, settings] = await Promise.all([
                getDoc(challengerRef), 
                getDoc(opponentRef),
                getDuelSettings(teacherUid)
            ]);
            if (challengerSnap.exists()) setChallenger(challengerSnap.data() as Student);
            if (opponentSnap.exists()) setOpponent(opponentSnap.data() as Student);
            setDuelSettings(settings);
            setIsLoading(false);
        };
        fetchPlayersAndSettings();
    }, [duel, teacherUid]);
    

    // This effect checks if both players have answered.
    useEffect(() => {
        if (!duel || !user || (duel.status !== 'active' && duel.status !== 'sudden_death')) return;
        
        const myAnswers = duel.answers?.[user.uid] || [];
        const opponentUid = user.uid === duel.challengerUid ? duel.opponentUid : duel.challengerUid;
        const opponentAnswers = duel.answers?.[opponentUid] || [];
    
        const bothAnswered = myAnswers.length > duel.currentQuestionIndex && 
                             opponentAnswers.length > duel.currentQuestionIndex;

        if (bothAnswered) {
            processRoundResults();
        }
    }, [duel, user, processRoundResults]);

    useEffect(() => {
        if (duel?.status === 'active') {
            setShowQuestion(true);
        } else {
            setShowQuestion(false);
        }
    }, [duel?.status]);

    const handleEndDuel = async () => {
        if (!duel || !teacherUid || !duelSettings || !user || !duelRef) return;
        
        const opponentUid = user.uid === duel.challengerUid ? duel.opponentUid : duel.challengerUid;

        setIsLeaving(true);
        try {
            await runTransaction(db, async (transaction) => {
                const winnerRef = doc(db, 'teachers', teacherUid, 'students', opponentUid);
                
                const winnerDoc = await transaction.get(winnerRef);
                if (!winnerDoc.exists()) throw new Error("Winner not found");
                const winnerData = winnerDoc.data();
                
                const duelCost = duel.cost || 0;
                const finalGold = (winnerData.gold || 0) + duelCost;

                transaction.update(duelRef, { status: 'abandoned', winnerUid: opponentUid });
                if (finalGold > 0) {
                    transaction.update(winnerRef, { gold: finalGold });
                }
            });
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
    
    const handleCancelDuel = async () => {
        if (!duelRef) return;
        setIsLeaving(true);
        try {
            await deleteDoc(duelRef);
            toast({ title: 'Challenge Cancelled', description: 'You have withdrawn your challenge.' });
            router.push('/dashboard');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the duel.' });
            setIsLeaving(false);
        }
    }
    
    if (isLoading || !challenger || !opponent || !duelSettings) {
        return <div className="flex h-screen items-center justify-center bg-gray-900"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }
    
    const isSuddenDeath = duel.isDraw ?? false;
    const numNormalQuestions = duelSettings?.numNormalQuestions ?? 10;
    const numSuddenDeathQuestions = duelSettings?.numSuddenDeathQuestions ?? 10;
    const currentQuestion = duel.questions ? duel.questions[duel.currentQuestionIndex] : null;
    const questionIndexForDisplay = isSuddenDeath ? duel.currentQuestionIndex - numNormalQuestions : duel.currentQuestionIndex;
    const questionCountForDisplay = isSuddenDeath ? numSuddenDeathQuestions : numNormalQuestions;
    
    if (duel.status === 'pending') {
        return (
            <div 
                className="flex h-screen items-center justify-center text-white"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fu61696175222_Widescreen_fantasy-style_image_of_a_training_and__3e2d56a1-f725-4687-b023-8b1b8edf404a_2%20(1).png?alt=media&token=0d8359d5-fa1f-417f-b56f-7483cac5455d')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <Card className="text-center p-8 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <Swords className="h-16 w-16 mx-auto text-primary" />
                        <CardTitle className="text-4xl mt-4">Challenge Sent!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>Waiting for {duel.opponentName} to respond to your challenge.</CardDescription>
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-4 mx-auto" />
                    </CardContent>
                    <CardFooter className="mt-4 justify-center">
                         <Button variant="destructive" onClick={handleCancelDuel} disabled={isLeaving}>
                            {isLeaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Cancel Duel
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (showDeclinedDialog) {
        return (
            <AlertDialog open={true} onOpenChange={() => {
                 setShowDeclinedDialog(false);
                 router.push('/dashboard');
            }}>
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

    if (duel.status === 'finished') {
        const winner = duel.winnerUid === challenger.uid ? challenger : opponent;
        const isTiebreaker = duel.isDraw && duel.winnerUid !== null;
        const isDraw = duel.isDraw && duel.winnerUid === null;

        let rewardsMessage = '';
        if (isDraw) {
            rewardsMessage = `The duel ended in a draw after all questions were exhausted! Your entry fee of ${duel.cost} Gold has been refunded.`;
        } else if (winner && duelSettings) {
            const winnerRewardText = `You have been awarded ${duelSettings.rewardXp} XP and ${duelSettings.rewardGold} Gold! Your entry fee of ${duel.cost} gold has been returned.`;
            const loserRewardText = `50% of your entry fee has been refunded for valiantly completing the training exercise.`;
            rewardsMessage = user?.uid === winner.uid ? winnerRewardText : loserRewardText;
        }

        return (
             <div className="relative flex h-screen flex-col items-center justify-center p-4 text-white overflow-hidden">
                <audio ref={audioRef} src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Battle%20Music%2FVictory%20Theme.mp3?alt=media&token=846c832f-bd29-4ba4-8ad8-680eb8f1689a" autoPlay loop />
                <div
                    className="absolute inset-0 -z-10"
                    style={{
                        backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FVictory%20Page.png?alt=media&token=eb9314d1-7673-4987-9fdf-b46186275947')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                 {isDraw ? (
                    <div className="relative w-full flex justify-center items-center h-80 gap-8">
                        <div className="relative w-80 h-80">
                            <Image src={challenger.avatarUrl} alt={challenger.characterName} layout="fill" className="object-contain" />
                        </div>
                        <div className="relative w-80 h-80">
                            <Image src={opponent.avatarUrl} alt={opponent.characterName} layout="fill" className="object-contain" />
                        </div>
                    </div>
                ) : winner && (
                     <div className="relative w-full flex justify-center items-center h-80">
                         <div className="relative w-80 h-80">
                             <Image src={winner.avatarUrl} alt={winner.characterName} layout="fill" className="object-contain" />
                         </div>
                    </div>
                )}
                <div className="relative text-center w-full px-4 mt-8">
                     <div className="bg-black/70 inline-block p-8 rounded-lg">
                        <h2 className="text-5xl font-headline font-bold text-yellow-400 text-shadow-lg">
                            {isDraw ? "The Duel is a Draw!" : isTiebreaker ? `${winner?.characterName} wins the tie-breaker!` : `${winner?.characterName} is Victorious!`}
                        </h2>
                        <p className="text-xl mt-4 text-white/90">{rewardsMessage}</p>
                        <Button className="mt-8" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
                    </div>
                </div>
            </div>
        )
    }

    if (duel.status === 'abandoned') {
        const didIForfeit = duel.winnerUid !== user?.uid;
        const messageTitle = didIForfeit ? "You have exited the Arena!" : "Your opponent has left the Arena!";
        const messageDescription = didIForfeit ? "You have forfeited your entry fee." : "Your entry fee has been refunded.";

        return (
             <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
                <Card className="text-center p-8 bg-card/80 backdrop-blur-sm">
                    <Shield className="h-16 w-16 mx-auto text-primary" />
                    <CardTitle className="text-4xl mt-4">{messageTitle}</CardTitle>
                    <CardDescription>{messageDescription}</CardDescription>
                    <CardContent>
                        <Button className="mt-4" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        );
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

    return (
        <div className="relative flex h-screen flex-col items-center justify-center p-4 text-white"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FDual%20Page%20Battle.png?alt=media&token=7db8be1d-0318-4dd5-b621-bf007d15dbf6')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <audio ref={audioRef} />
            <AudioPlayer duel={duel} musicUrl={musicUrl} audioRef={audioRef} onFirstInteraction={onFirstInteraction} />

             <div className="absolute top-4 left-4 z-10">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isLeaving}>
                            {isLeaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
                            Forfeit Duel
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to end the duel?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You will forfeit the match and your entry fee. Your opponent will be declared the winner and have their entry fee refunded.
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
            <div className="absolute top-4 right-4 z-10">
                <CountdownTimer expiryTimestamp={duel.timerEndsAt} />
            </div>
            <div className={cn("w-full max-w-4xl transition-opacity duration-500", showQuestion ? 'opacity-100' : 'opacity-0')}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <DuelPlayerCard 
                        player={challenger} 
                        answers={duel.answers?.[duel.challengerUid] || []} 
                        isCurrentUser={user?.uid === challenger?.uid} 
                        questionCount={questionCountForDisplay}
                        isSuddenDeath={isSuddenDeath}
                        numNormalQuestions={numNormalQuestions}
                    />
                    <DuelPlayerCard 
                        player={opponent} 
                        answers={duel.answers?.[duel.opponentUid] || []} 
                        isCurrentUser={user?.uid === opponent?.uid} 
                        questionCount={questionCountForDisplay}
                        isSuddenDeath={isSuddenDeath}
                        numNormalQuestions={numNormalQuestions}
                    />
                </div>
                
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader className="text-center">
                        <CardTitle>{isSuddenDeath ? "Sudden Death!" : `Question ${questionIndexForDisplay + 1}`}</CardTitle>
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
                                    <Button onClick={() => handleSubmitAnswer()} disabled={selectedAnswer === null}>Submit</Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
             {(duel.status === 'round_result' || duel.status === 'sudden_death') && currentQuestion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in-50">
                    <Card className="text-center p-8 bg-card/80 text-white border-primary shadow-lg shadow-primary/50">
                        <CardHeader>
                            <CardTitle className="text-4xl">{duel.status === 'sudden_death' ? 'SUDDEN DEATH!' : `Round ${questionIndexForDisplay + 1} Over`}</CardTitle>
                            {duel.answers && user && duel.answers[user.uid][duel.currentQuestionIndex] === 1 ? (
                                <div className="flex items-center justify-center gap-2 text-2xl text-green-400 mt-2">
                                    <CheckCircle /> You were correct!
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-2xl text-red-400 mt-2">
                                    <XCircle /> You were incorrect!
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-muted-foreground">The correct answer was:</p>
                            <p className="font-bold text-xl">{currentQuestion.answers[currentQuestion.correctAnswerIndex]}</p>
                            <div className="pt-4">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                <p className="text-sm text-muted-foreground">Next round starting soon...</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
