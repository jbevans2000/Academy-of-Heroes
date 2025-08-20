
'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc, getDoc, setDoc, updateDoc, increment, arrayUnion, collection, query, getDocs, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Loader2, Shield, Swords, Timer, CheckCircle, XCircle, LayoutDashboard, HeartCrack, Hourglass, VolumeX, Flame, Lightbulb, Skull, ScrollText } from 'lucide-react';
import { type Student } from '@/lib/data';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PowersSheet } from '@/components/dashboard/powers-sheet';
import { BattleChatBox } from '@/components/battle/chat-box';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface TargetedEvent {
    targetUid: string;
    message: string;
}

interface VoteState {
    isActive: boolean;
    casterName: string;
    votesFor: string[];
    votesAgainst: string[];
    endsAt: { seconds: number; nanoseconds: number; };
}

interface PowerLogEntry {
  id: string;
  round: number;
  casterName: string;
  powerName: string;
  description: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  }
}

interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'ROUND_ENDING' | 'SHOWING_RESULTS' | 'BATTLE_ENDED';
  currentQuestionIndex: number;
  timerEndsAt?: { seconds: number; nanoseconds: number; };
  lastRoundDamage?: number;
  totalDamage?: number;
  removedAnswerIndices?: number[]; // For Nature's Guidance
  powerEventMessage?: string; // For displaying power usage feedback
  targetedEvent?: TargetedEvent | null; // For targeted messages like revivals
  fallenPlayerUids?: string[]; // New: List of fallen players
  powerUsersThisRound?: { [key: string]: string[] }; // For one power per round rule
  voteState?: VoteState | null; // For Cosmic Divination
}

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
  damage: number;
}

interface Battle {
  id: string;
  battleName: string;
  bossImageUrl: string;
  videoUrl?: string;
  questions: Question[];
}

function PublicPowerEvent({ message }: { message: string }) {
    if (!message) return null;
    return (
        <div className="text-center p-2 rounded-lg bg-purple-900/80 border border-purple-700 mb-4 animate-in fade-in-50">
            <div className="flex items-center justify-center gap-2">
                <Lightbulb className="h-6 w-6 text-purple-300" />
                <p className="text-lg font-bold text-white">{message}</p>
            </div>
        </div>
    );
}

function SmallCountdownTimer({ expiryTimestamp }: { expiryTimestamp: Date }) {
    const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.round((expiryTimestamp.getTime() - new Date().getTime()) / 1000)));

    useEffect(() => {
        const interval = setInterval(() => {
            const newTimeLeft = Math.max(0, Math.round((expiryTimestamp.getTime() - new Date().getTime()) / 1000));
            setTimeLeft(newTimeLeft);
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTimestamp]);

    return (
        <div className="text-center p-2 rounded-lg bg-yellow-900/80 border border-yellow-700 mb-4 animate-pulse">
            <div className="flex items-center justify-center gap-2">
                <Timer className="h-6 w-6 text-yellow-400" />
                <p className="text-xl font-bold text-white">{timeLeft}</p>
                <p className="text-sm text-yellow-200">The round is ending! Submit your answer!</p>
            </div>
        </div>
    );
}

function WaitingForRoundEnd() {
    return (
        <div className="text-center p-2 rounded-lg bg-blue-900/80 border border-blue-700 mb-4">
            <div className="flex items-center justify-center gap-2">
                <Hourglass className="h-6 w-6 text-blue-300 animate-spin" />
                <p className="text-lg font-bold text-white">Choose Your Answer</p>
            </div>
        </div>
    );
}

const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1];
    } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1];
    }
    const ampersandPosition = videoId.indexOf('&');
    if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
};

function FallenPlayerDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
    const imageUrl = 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-b18c1ab2-8859-45c9-a9f8-d48645d2eadd.jpg?alt=media&token=f7b64b1f-597b-47a5-b15a-80d08fdd7d6d';

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader className="items-center">
                    <Image
                        src={imageUrl}
                        alt="A fallen hero"
                        width={300}
                        height={200}
                        className="rounded-lg object-cover"
                    />
                    <AlertDialogTitle className="text-2xl font-headline text-center mt-4">Your Spirit Falters!</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                       Your spirit must be restored by a Healer in order to continue the battle!
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction>Dismiss</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function VoteDialog({ voteState, userUid, teacherUid }: { voteState: VoteState | null, userUid: string, teacherUid: string }) {
    if (!voteState?.isActive) return null;

    const [hasVoted, setHasVoted] = useState(voteState.votesFor.includes(userUid) || voteState.votesAgainst.includes(userUid));
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!voteState.endsAt) return;
        const interval = setInterval(() => {
            const newTimeLeft = Math.max(0, Math.round((new Date(voteState.endsAt!.seconds * 1000).getTime() - new Date().getTime()) / 1000));
            setTimeLeft(newTimeLeft);
        }, 1000);
        return () => clearInterval(interval);
    }, [voteState.endsAt]);

    const handleVote = async (vote: 'yes' | 'no') => {
        setHasVoted(true);
        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const fieldToUpdate = vote === 'yes' ? 'voteState.votesFor' : 'voteState.votesAgainst';
        await updateDoc(liveBattleRef, {
            [fieldToUpdate]: arrayUnion(userUid)
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in-50">
            <Card className="w-full max-w-lg text-center p-8 bg-black/90 text-white border-purple-500 shadow-2xl shadow-purple-500/50">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline text-purple-300">A Cosmic Choice!</CardTitle>
                    <CardDescription className="text-lg text-white/90">
                        {voteState.casterName} wants to whisk you forward in time to the next question! Do you agree?
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-6xl font-mono font-bold text-yellow-400">{timeLeft}</div>
                    {hasVoted ? (
                        <p className="text-xl font-semibold text-green-400">Your vote has been cast!</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => handleVote('yes')}>Yes, let's go!</Button>
                            <Button size="lg" variant="destructive" onClick={() => handleVote('no')}>No, let's fight!</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function PowerLog({ teacherUid }: { teacherUid: string }) {
    const [logEntries, setLogEntries] = useState<PowerLogEntry[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!teacherUid) return;
        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const unsubscribeLive = onSnapshot(liveBattleRef, (docSnap) => {
            if (!docSnap.exists() || docSnap.data().status === 'WAITING') {
                setLogEntries([]);
                return;
            }
            const logRef = collection(db, 'teachers', teacherUid, 'liveBattles/active-battle/battleLog');
            const q = query(logRef);
            const unsubscribeLog = onSnapshot(q, (snapshot) => {
                const entries: PowerLogEntry[] = [];
                snapshot.forEach(doc => {
                    entries.push({ id: doc.id, ...doc.data() } as PowerLogEntry);
                });
                entries.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
                setLogEntries(entries);
            });
             return () => unsubscribeLog();
        });

        return () => unsubscribeLive();
    }, [teacherUid]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logEntries])
    
    return (
        <Card className="flex flex-col h-full bg-card/60 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-black"><ScrollText/> Battle Log</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden flex flex-col">
                <div className="flex-grow overflow-y-auto pr-4 space-y-3">
                    {logEntries.map(log => (
                        <div key={log.id} className="text-sm text-black">
                            <span className="font-bold">{log.casterName}</span>
                            <span> used </span>
                            <span className="font-semibold">{log.powerName}</span>
                            <span>. </span> 
                            <span className="italic">{log.description}</span>
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            </CardContent>
        </Card>
    )
}

export default function LiveBattlePage() {
  const [battleState, setBattleState] = useState<LiveBattleState | null>(null);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<boolean>(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPowersSheetOpen, setIsPowersSheetOpen] = useState(false);
  const [isFallen, setIsFallen] = useState(false);
  const [showFallenDialog, setShowFallenDialog] = useState(false);
  const [targetedMessage, setTargetedMessage] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const battleStateRef = useRef(battleState);
  const router = useRouter();

  useEffect(() => {
    battleStateRef.current = battleState;
  }, [battleState]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const studentMetaRef = doc(db, 'students', user.uid);
        const studentMetaSnap = await getDoc(studentMetaRef);

        if (studentMetaSnap.exists()) {
            const meta = studentMetaSnap.data();
            setTeacherUid(meta.teacherUid);
            
            const studentRef = doc(db, 'teachers', meta.teacherUid, 'students', user.uid);
            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {
                setStudent(studentSnap.data() as Student);
            } else {
                router.push('/');
            }
        } else {
            console.error("Student metadata document not found at root. This may be an existing student. Attempting fallback.");
            const teachersSnapshot = await getDocs(collection(db, 'teachers'));
            let found = false;
            for (const teacherDoc of teachersSnapshot.docs) {
                const studentRef = doc(db, 'teachers', teacherDoc.id, 'students', user.uid);
                const studentSnap = await getDoc(studentRef);
                if (studentSnap.exists()) {
                    setTeacherUid(teacherDoc.id);
                    setStudent(studentSnap.data() as Student);
                    // Create the metadata doc for next time
                    await setDoc(doc(db, 'students', user.uid), { teacherUid: teacherDoc.id });
                    found = true;
                    break;
                }
            }
            if (!found) {
                 console.error("Student document not found in any teacher's subcollection.");
                 router.push('/');
            }
        }
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!teacherUid) return;

    // Fetch all students only once when the teacher UID is known
    const fetchAllStudents = async () => {
        const liveBattleDoc = await getDoc(doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle'));
        if (!liveBattleDoc.exists() || liveBattleDoc.data().status === 'WAITING') return;

        const allStudentsSnap = await getDocs(collection(db, 'teachers', teacherUid, 'students'));
        setAllStudents(allStudentsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));
    };
    fetchAllStudents();
  }, [teacherUid]);

  useEffect(() => {
    if (!teacherUid || !user) {
      if (!isLoading) setIsLoading(true);
      return;
    };

    const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
    const unsubscribe = onSnapshot(liveBattleRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const newState = docSnapshot.data() as LiveBattleState;
        const currentBattleState = battleStateRef.current;
        
        // Reset state on new question or on battle start
        if (
            currentBattleState && (
            (newState.status === 'IN_PROGRESS' && currentBattleState.status !== 'IN_PROGRESS') ||
            (newState.currentQuestionIndex !== currentBattleState.currentQuestionIndex)
            )
        ) {
            setSubmittedAnswer(false);
            setSelectedAnswer(null);
            setLastAnswerCorrect(null);
        }
        
        const wasFallen = isFallen;
        const nowFallen = newState.fallenPlayerUids?.includes(user.uid) ?? false;

        setIsFallen(nowFallen);
        
        if (nowFallen && !wasFallen) {
            setShowFallenDialog(true);
        } else if (!nowFallen && wasFallen) {
            setShowFallenDialog(false);
        }

        if (newState.targetedEvent && newState.targetedEvent.targetUid === user.uid) {
            setTargetedMessage(newState.targetedEvent.message);
             setTimeout(() => {
                setTargetedMessage(null);
            }, 5000);
        }

        setBattleState(newState);
      } else {
          setBattleState(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to live battle state:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, teacherUid, isFallen, user, isLoading]);

  useEffect(() => {
    if (battleState?.battleId && teacherUid && (!battle || battle.id !== battleState.battleId)) {
      const fetchBattle = async () => {
        const battleDoc = await getDoc(doc(db, 'teachers', teacherUid, 'bossBattles', battleState.battleId!));
        if (battleDoc.exists()) {
          setBattle({ id: battleDoc.id, ...battleDoc.data() } as Battle);
        }
      };
      fetchBattle();
    }
  }, [battleState?.battleId, teacherUid, battle]);

  const handleSubmitAnswer = async () => {
    if (!user || !student || !battleState?.battleId || !battle || (battleState.status !== 'IN_PROGRESS' && battleState.status !== 'ROUND_ENDING') || !teacherUid || isFallen || submittedAnswer || selectedAnswer === null) return;
    
    setSubmittedAnswer(true);
    
    const currentQuestion = battle.questions[battleState.currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswerIndex;

    const roundResponseDocRef = doc(db, 'teachers', teacherUid, `liveBattles/active-battle/responses`, `${battleState.currentQuestionIndex}`);
    
    const responsePayload = {
      studentUid: user.uid,
      studentName: student.studentName,
      characterName: student.characterName,
      answer: currentQuestion.answers[selectedAnswer],
      answerIndex: selectedAnswer,
      isCorrect: isCorrect,
      submittedAt: new Date(),
    };

    // Use setDoc with merge to create the document if it doesn't exist,
    // and then use arrayUnion to add the response.
    await setDoc(roundResponseDocRef, {
        responses: arrayUnion(responsePayload)
    }, { merge: true });

  };
  
   useEffect(() => {
        // When the question changes, update the lastAnswerCorrect based on the previous round's stored answer
        if (battleState?.status === 'SHOWING_RESULTS' && user && teacherUid) {
            const checkLastAnswer = async () => {
                const prevRoundIndex = battleState.currentQuestionIndex;
                // Fetch the master round document
                const roundDocRef = doc(db, 'teachers', teacherUid, `liveBattles/active-battle/responses/${prevRoundIndex}`);
                const roundDocSnap = await getDoc(roundDocRef);
                const question = battle?.questions[prevRoundIndex];

                if (roundDocSnap.exists() && question) {
                    const roundData = roundDocSnap.data();
                    const studentResponse = roundData.responses?.find((r: any) => r.studentUid === user.uid);
                    if (studentResponse) {
                        setLastAnswerCorrect(studentResponse.isCorrect);
                    } else {
                        setLastAnswerCorrect(null); // No answer submitted for that round
                    }
                } else {
                    setLastAnswerCorrect(null);
                }
            };
            checkLastAnswer();
        }
    }, [battleState?.status, battleState?.currentQuestionIndex, user, teacherUid, battle?.questions]);


  if (isLoading || !user || !student || !teacherUid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold">Connecting to the Battle...</h1>
      </div>
    );
  }

  if (!battleState) {
    const waitingRoomImageUrl = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FChatGPT%20Image%20Aug%2015%2C%202025%2C%2008_12_09%20AM.png?alt=media&token=45178e85-0ba2-42ef-b2fa-d76a8732b2c2";
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
             <Image
                src={waitingRoomImageUrl}
                alt="A shadowy figure awaits"
                fill
                className="object-cover opacity-50"
                priority
            />
             <div className="z-10 text-center w-full max-w-4xl">
                <Card className="bg-black/60 backdrop-blur-sm p-8 border-gray-600">
                    <CardContent className="flex flex-col items-center justify-center space-y-4">
                        <Shield className="h-24 w-24 text-primary mb-2 animate-pulse" />
                        <h1 className="text-4xl font-bold tracking-tight text-white">Waiting Room</h1>
                        <p className="text-xl text-primary-foreground/80">Waiting for the Boss to appear!</p>
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-4" />
                         <Button variant="outline" className="mt-6 bg-black/50 border-gray-400 hover:bg-gray-700 text-white" onClick={() => router.push('/dashboard')}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  }
  
  if (battleState.status === 'WAITING' && battle) {
     const videoSrc = battle.videoUrl ? getYouTubeEmbedUrl(battle.videoUrl) : '';
     const waitingRoomImageUrl = battle.bossImageUrl || "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FChatGPT%20Image%20Aug%2015%2C%202025%2C%2008_12_09%20AM.png?alt=media&token=45178e85-0ba2-42ef-b2fa-d76a8732b2c2";
     return (
        <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
            <Image
                src={waitingRoomImageUrl}
                alt="A shadowy figure awaits"
                fill
                className="object-cover opacity-50"
                priority
            />
            <div className="z-10 text-center w-full max-w-4xl">
                <Card className="bg-black/60 backdrop-blur-sm p-8 border-gray-600">
                    <CardContent className="flex flex-col items-center justify-center space-y-4">
                        {videoSrc ? (
                            <>
                                <div className="w-full aspect-video">
                                    <iframe
                                        className="w-full h-full rounded-lg shadow-lg border"
                                        src={videoSrc}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                                <div className="mt-2 flex items-center justify-center gap-2 rounded-md bg-yellow-900/80 px-4 py-2 text-yellow-200 border border-yellow-700">
                                    <VolumeX className="h-5 w-5" />
                                    <p className="font-semibold">Video is muted. Click the speaker icon on the video to unmute!</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Shield className="h-24 w-24 text-primary mb-2 animate-pulse" />
                                <h1 className="text-4xl font-bold tracking-tight text-white">Waiting Room</h1>
                                <p className="text-xl text-primary-foreground/80">Waiting for the Boss to appear!</p>
                            </>
                        )}
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-4" />
                         <Button variant="outline" className="mt-6 bg-black/50 border-gray-400 hover:bg-gray-700 text-white" onClick={() => router.push('/dashboard')}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  }

  if ((battleState.status === 'IN_PROGRESS' || battleState.status === 'ROUND_ENDING') && battle) {
    const currentQuestion = battle.questions[battleState.currentQuestionIndex];
    const bossImage = battle.bossImageUrl || 'https://placehold.co/600x400.png';
    const expiryTimestamp = battleState.timerEndsAt ? new Date(battleState.timerEndsAt.seconds * 1000) : null;
    const isRoundActive = battleState.status === 'IN_PROGRESS' || battleState.status === 'ROUND_ENDING';

    return (
      <>
        <FallenPlayerDialog isOpen={showFallenDialog} onOpenChange={setShowFallenDialog} />
        <VoteDialog voteState={battleState.voteState || null} userUid={user.uid} teacherUid={teacherUid} />
        <PowersSheet
          isOpen={isPowersSheetOpen}
          onOpenChange={setIsPowersSheetOpen}
          student={student}
          isBattleView={true}
          teacherUid={teacherUid}
          battleId={'active-battle'}
          battleState={battleState}
        />
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
            {targetedMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4 rounded-md bg-green-600 text-white font-bold text-center shadow-lg animate-in fade-in-20 slide-in-from-top-10">
                    {targetedMessage}
                </div>
            )}
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="bg-card text-card-foreground border-gray-700 shadow-2xl shadow-primary/20">
                        <CardContent className="p-6">
                            <div className="flex justify-center mb-6">
                                <Button 
                                    size="lg"
                                    variant="default" 
                                    className={cn(
                                        "text-white shadow-lg",
                                        student.class === 'Mage' && "bg-blue-600/80 border-blue-500 hover:bg-blue-500/90",
                                        student.class === 'Guardian' && "bg-amber-500/80 border-amber-400 hover:bg-amber-500/90",
                                        student.class === 'Healer' && "bg-green-600/80 border-green-500 hover:bg-green-500/90",
                                    )}
                                    onClick={() => setIsPowersSheetOpen(true)}
                                    disabled={isFallen}
                                >
                                    <Flame className="mr-2 h-5 w-5" />
                                    View Powers
                                </Button>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 mb-6">
                                <div className="flex-shrink-0 mx-auto">
                                    <Image 
                                        src={bossImage}
                                        alt={battle.battleName}
                                        width={250}
                                        height={250}
                                        className="rounded-lg shadow-lg border-4 border-primary/50 object-contain"
                                        data-ai-hint="fantasy monster"
                                    />
                                </div>
                                <div className="flex-grow flex flex-col justify-center items-center text-center">
                                    <h2 className="text-2xl md:text-3xl font-bold">{currentQuestion.questionText}</h2>
                                </div>
                            </div>
                            
                            <PublicPowerEvent message={battleState.powerEventMessage || ''} />

                            {expiryTimestamp && battleState.status === 'ROUND_ENDING' && (
                                <SmallCountdownTimer expiryTimestamp={expiryTimestamp} />
                            )}
                            
                            {!submittedAnswer && (
                                <WaitingForRoundEnd />
                            )}

                            {submittedAnswer && (
                                <div className="text-center p-2 rounded-lg bg-green-900/80 border border-green-700 mb-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <CheckCircle className="h-6 w-6 text-green-300" />
                                        <p className="text-lg font-bold text-white">Your answer is locked in. Wait for the round to end.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.answers.map((answer, index) => {
                                    const isRemoved = battleState.removedAnswerIndices?.includes(index);
                                    return (
                                        <Button
                                        key={index}
                                        variant={isRemoved ? "destructive" : "outline"}
                                        className={cn(
                                            "text-lg h-auto py-4 whitespace-normal justify-start text-left hover:bg-primary/90 hover:text-primary-foreground",
                                            selectedAnswer === index && "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary",
                                            isRemoved && "line-through bg-red-900/50 border-red-700 text-red-400 cursor-not-allowed hover:bg-red-900/50"
                                        )}
                                        onClick={() => setSelectedAnswer(index)}
                                        disabled={!isRoundActive || isRemoved || isFallen || submittedAnswer}
                                        >
                                        <span className="font-bold mr-4">{String.fromCharCode(65 + index)}.</span>
                                        {answer}
                                        </Button>
                                    )
                                })}
                            </div>
                             <div className="mt-6 flex justify-center">
                                <Button
                                    size="lg"
                                    onClick={handleSubmitAnswer}
                                    disabled={selectedAnswer === null || submittedAnswer || !isRoundActive || isFallen}
                                >
                                    Submit Answer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {(battleState.fallenPlayerUids && battleState.fallenPlayerUids.length > 0) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-black"><Skull className="text-destructive"/> Fallen Heroes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="mt-2 space-y-1">
                                    {allStudents
                                        .filter(s => battleState.fallenPlayerUids?.includes(s.uid))
                                        .map(s => <li key={s.uid} className="font-semibold text-black">{s.characterName}</li>)
                                    }
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                    {battleState.battleId && <PowerLog teacherUid={teacherUid} />}
                    <BattleChatBox 
                        isTeacher={false}
                        userName={student.characterName}
                        teacherUid={teacherUid}
                        battleId={'active-battle'}
                    />
                </div>
            </div>
        </div>
      </>
    )
  }
  
  if (battleState.status === 'SHOWING_RESULTS' && battle) {
      const lastQuestion = battle.questions[battleState.currentQuestionIndex];
      const correctAnswerText = lastQuestion.answers[lastQuestion.correctAnswerIndex];

      return (
        <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
            {battle.bossImageUrl && (
                <Image
                    src={battle.bossImageUrl}
                    alt="Boss Background"
                    fill
                    className="object-cover opacity-20"
                    data-ai-hint="fantasy monster"
                />
            )}
            <div className="w-full max-w-2xl mx-auto z-10">
                <Card className="text-center shadow-lg bg-card/80 backdrop-blur-sm text-card-foreground">
                    <CardHeader>
                        <CardTitle className="text-4xl font-bold tracking-tight">Round Over!</CardTitle>
                        <CardDescription className="text-lg text-muted-foreground">Waiting for the next round to begin...</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        
                        {lastAnswerCorrect === true && (
                            <div className="p-4 rounded-md bg-green-900/70 border border-green-700 text-green-200 flex items-center justify-center gap-4">
                                <CheckCircle className="h-10 w-10 text-green-400" />
                                <p className="text-xl font-bold">You scored a hit!</p>
                            </div>
                        )}

                        {lastAnswerCorrect === false && (
                            <div className="p-4 rounded-md bg-red-900/70 border border-red-700 text-red-200 flex items-center justify-center gap-4">
                                <HeartCrack className="h-10 w-10 text-red-400" />
                                <p className="text-xl font-bold">You took {lastQuestion.damage} damage!</p>
                            </div>
                        )}
                        
                         {lastAnswerCorrect === null && (
                            <div className="p-4 rounded-md bg-gray-700 border border-gray-600 text-gray-200 flex items-center justify-center gap-4">
                                <p className="text-xl font-bold">You did not submit an answer this round.</p>
                            </div>
                        )}

                        <div className="p-4 rounded-md bg-secondary text-secondary-foreground">
                            <p className="text-lg text-muted-foreground mb-1">The correct answer was:</p>
                            <p className="text-2xl font-bold">{correctAnswerText}</p>
                        </div>
                        
                        {battleState.lastRoundDamage !== undefined && battleState.lastRoundDamage > 0 && (
                            <div className="p-4 rounded-md bg-sky-900/70 border border-sky-700 text-sky-200 flex items-center justify-center gap-4">
                                <Swords className="h-10 w-10 text-sky-400" />
                                <p className="text-xl font-bold">Your fellowship dealt {battleState.lastRoundDamage} damage to the boss this round!</p>
                            </div>
                        )}
                        
                         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-8" />
                    </CardContent>
                </Card>
            </div>
        </div>
      );
  }

  // New state for when the battle is over but before a new one has started
  if (battleState.status === 'BATTLE_ENDED' && battle) {
      return (
        <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
            {battle.bossImageUrl && (
                <Image
                    src={battle.bossImageUrl}
                    alt="Boss Background"
                    fill
                    className="object-cover opacity-20"
                    data-ai-hint="fantasy monster"
                />
            )}
            <div className="w-full max-w-2xl mx-auto z-10">
                <Card className="text-center shadow-lg bg-card/80 backdrop-blur-sm text-card-foreground">
                    <CardHeader>
                        <CardTitle className="text-4xl font-bold tracking-tight">The Battle is Over!</CardTitle>
                        <CardDescription className="text-lg text-muted-foreground">The teacher has concluded the battle. Awaiting the next session.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Button size="lg" onClick={() => router.push('/dashboard')}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
      );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 text-center">
        <Swords className="h-24 w-24 text-primary mb-6" />
        <h1 className="text-4xl font-bold tracking-tight">The Battle is On!</h1>
        <p className="text-xl text-muted-foreground mt-2">Waiting for the next round...</p>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-8" />
    </div>
  );
}

    