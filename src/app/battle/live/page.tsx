
'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Loader2, Shield, Swords, Timer, CheckCircle, XCircle, LayoutDashboard, HeartCrack, Hourglass, VolumeX, Flame } from 'lucide-react';
import { type Student } from '@/lib/data';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PowersSheet } from '@/components/dashboard/powers-sheet';

interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'ROUND_ENDING' | 'SHOWING_RESULTS' | 'BATTLE_ENDED';
  currentQuestionIndex: number;
  timerEndsAt?: { seconds: number; nanoseconds: number; };
  lastRoundDamage?: number;
  totalDamage?: number;
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
                <p className="text-sm text-yellow-200">The round is ending! Lock in your answer!</p>
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


export default function LiveBattlePage() {
  const [battleState, setBattleState] = useState<LiveBattleState>({ battleId: null, status: 'WAITING', currentQuestionIndex: 0 });
  const [battle, setBattle] = useState<Battle | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<number | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPowersSheetOpen, setIsPowersSheetOpen] = useState(false);
  const router = useRouter();

  // Use a ref to hold the current battle state to avoid it being a dependency in the snapshot listener
  const battleStateRef = useRef(battleState);
  useEffect(() => {
    battleStateRef.current = battleState;
  }, [battleState]);

  // Effect to get current user and their student data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const studentDoc = await getDoc(doc(db, 'students', user.uid));
        if (studentDoc.exists()) {
          setStudent(studentDoc.data() as Student);
        }
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Effect to listen for the live battle state
  useEffect(() => {
    setIsLoading(true);
    const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
    const unsubscribe = onSnapshot(liveBattleRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const newState = docSnapshot.data() as LiveBattleState;
        const currentBattleState = battleStateRef.current;

        // If it's a new question, reset submitted answer state
        if (currentBattleState && newState.currentQuestionIndex !== currentBattleState.currentQuestionIndex) {
          setSubmittedAnswer(null);
          setLastAnswerCorrect(null);
        }
        
        setBattleState(newState);

        if (newState.status === 'BATTLE_ENDED') {
            router.push('/battle/summary');
        }
      } else {
        // Use functional update to avoid dependency on battleState
        setBattleState(prevState => ({ ...prevState, battleId: null, status: 'WAITING', currentQuestionIndex: 0 }));
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to live battle state:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router]); // Removed battleState from dependencies

  // Effect to fetch the battle details when battleId changes
  useEffect(() => {
    if (battleState?.battleId) {
      const fetchBattle = async () => {
        const battleDoc = await getDoc(doc(db, 'bossBattles', battleState.battleId!));
        if (battleDoc.exists()) {
          setBattle({ id: battleDoc.id, ...battleDoc.data() } as Battle);
        }
      };
      fetchBattle();
    } else {
      setBattle(null);
    }
  }, [battleState?.battleId]);

  const handleSubmitAnswer = async (answerIndex: number) => {
    if (!user || !student || !battleState?.battleId || !battle || (battleState.status !== 'IN_PROGRESS' && battleState.status !== 'ROUND_ENDING')) return;
    
    setSubmittedAnswer(answerIndex);
    
    const currentQuestion = battle.questions[battleState.currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctAnswerIndex;
    setLastAnswerCorrect(isCorrect);

    // HP damage is now applied in a batch by the teacher at the end of the round.
    // No damage deduction here.

    const responseRef = doc(db, `liveBattles/active-battle/responses`, user.uid);
    await setDoc(responseRef, {
      studentName: student.studentName,
      characterName: student.characterName,
      answer: currentQuestion.answers[answerIndex],
      answerIndex: answerIndex,
      isCorrect: isCorrect,
      submittedAt: new Date(),
    });

    const studentResponseRef = doc(db, `liveBattles/active-battle/studentResponses/${user.uid}/rounds/${battleState.currentQuestionIndex}`);
    await setDoc(studentResponseRef, {
        answerIndex: answerIndex,
    });
  };

  if (isLoading || !user || !student) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold">Connecting to the Battle...</h1>
      </div>
    );
  }

  if (battleState.status === 'WAITING' || !battleState.battleId) {
    const videoSrc = battle?.videoUrl ? getYouTubeEmbedUrl(battle.videoUrl) : '';
    const waitingRoomImageUrl = battle?.bossImageUrl || "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FChatGPT%20Image%20Aug%2015%2C%202025%2C%2008_12_09%20AM.png?alt=media&token=45178e85-0ba2-42ef-b2fa-d76a8732b2c2";
    
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
    const isBattleActive = battleState.status === 'IN_PROGRESS' || battleState.status === 'ROUND_ENDING';

    return (
      <>
        <PowersSheet
          isOpen={isPowersSheetOpen}
          onOpenChange={setIsPowersSheetOpen}
          student={student}
        />
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-4xl mx-auto">
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
                    

                    {expiryTimestamp && battleState.status === 'ROUND_ENDING' && (
                    <SmallCountdownTimer expiryTimestamp={expiryTimestamp} />
                    )}

                    {submittedAnswer !== null && battleState.status === 'IN_PROGRESS' && (
                        <WaitingForRoundEnd />
                    )}


                    <div className="text-center">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentQuestion.answers.map((answer, index) => (
                                <Button
                                key={index}
                                variant="outline"
                                className={cn(
                                    "text-lg h-auto py-4 whitespace-normal justify-start text-left hover:bg-primary/90 hover:text-primary-foreground",
                                    submittedAnswer === index && "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary"
                                )}
                                onClick={() => handleSubmitAnswer(index)}
                                disabled={!isBattleActive}
                                >
                                <span className="font-bold mr-4">{String.fromCharCode(65 + index)}.</span>
                                {answer}
                                </Button>
                            ))}
                        </div>
                    </div>

                </CardContent>
            </Card>
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

                        <div className="p-4 rounded-md bg-secondary text-secondary-foreground">
                            <p className="text-lg text-muted-foreground mb-1">The correct answer was:</p>
                            <p className="text-2xl font-bold">{correctAnswerText}</p>
                        </div>
                        
                        {battleState.lastRoundDamage !== undefined && battleState.lastRoundDamage > 0 && (
                            <div className="p-4 rounded-md bg-sky-900/70 border border-sky-700 text-sky-200 flex items-center justify-center gap-4">
                                <Swords className="h-10 w-10 text-sky-400" />
                                <p className="text-xl font-bold">The Party dealt {battleState.lastRoundDamage} damage to the boss this round!</p>
                            </div>
                        )}
                        
                         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-8" />
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
