
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
  damage: number;
}

interface Battle {
  battleName: string;
  bossImageUrl: string;
  videoUrl: string;
  questions: Question[];
}

export default function PreviewBattlePage() {
  const router = useRouter();
  const params = useParams();
  const battleId = params.id as string;

  const [battle, setBattle] = useState<Battle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [teacher, setTeacher] = useState<User | null>(null);

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

    const fetchBattle = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'teachers', teacher.uid, 'bossBattles', battleId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setBattle(docSnap.data() as Battle);
        } else {
          console.error("No such document!");
          // Optionally, redirect or show a not found message
        }
      } catch (error) {
        console.error("Error fetching battle:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBattle();
  }, [battleId, teacher]);
  
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
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const videoSrc = battle?.videoUrl ? getYouTubeEmbedUrl(battle.videoUrl) : '';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="max-w-4xl w-full space-y-4 p-4">
            <Skeleton className="h-12 w-1/4" />
            <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Card>
            <CardHeader>
                <CardTitle>Battle Not Found</CardTitle>
                <CardDescription>This battle could not be found. It may have been deleted.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => router.push('/teacher/battles')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Battles
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  const currentQuestion = battle.questions[currentQuestionIndex];

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/40 p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-5xl">
            <Button variant="outline" onClick={() => router.push('/teacher/battles')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Battles List
            </Button>
            <Card className="shadow-2xl overflow-hidden">
                <CardHeader className="text-center bg-card p-6">
                    <CardTitle className="text-4xl font-bold">{battle.battleName}</CardTitle>
                    <CardDescription>Teacher Preview Mode</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        {/* Left Side: Boss Image & Video */}
                        <div className="bg-secondary/50 p-6 flex flex-col items-center justify-center space-y-6">
                            {battle.bossImageUrl && (
                                <Image 
                                    src={battle.bossImageUrl}
                                    alt={battle.battleName}
                                    width={400}
                                    height={400}
                                    className="rounded-lg shadow-lg border-4 border-white object-contain"
                                />
                            )}
                            {videoSrc && (
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
                            )}
                        </div>

                        {/* Right Side: Question & Answers */}
                        <div className="p-8 flex flex-col justify-between">
                            <div>
                                <h3 className="text-2xl font-semibold mb-2 text-center">{currentQuestion.questionText}</h3>
                                <p className="text-center text-sm text-red-500 mb-4 font-semibold">Damage on incorrect answer: {currentQuestion.damage} HP</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {currentQuestion.answers.map((answer, index) => (
                                        <Button 
                                            key={index}
                                            variant="outline"
                                            className="text-lg h-auto py-4 whitespace-normal justify-start text-left"
                                        >
                                           <span className="font-bold mr-4">{String.fromCharCode(65 + index)}.</span>
                                           {answer}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-8 border-t pt-4">
                                <Button 
                                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentQuestionIndex === 0}
                                >
                                    Previous Question
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Question {currentQuestionIndex + 1} of {battle.questions.length}
                                </span>
                                <Button 
                                    onClick={() => setCurrentQuestionIndex(prev => Math.min(battle.questions.length - 1, prev + 1))}
                                    disabled={currentQuestionIndex === battle.questions.length - 1}
                                >
                                    Next Question
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
