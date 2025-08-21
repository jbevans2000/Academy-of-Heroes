'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Swords, CheckCircle, XCircle, Trophy, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { logGameEvent } from '@/lib/gamelog';

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
}

interface Battle {
  battleName: string;
  bossImageUrl: string;
  questions: Question[];
}

export default function GroupBattlePage() {
    const router = useRouter();
    const params = useParams();
    const battleId = params.id as string;
    const { toast } = useToast();

    const [battle, setBattle] = useState<Battle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [teacher, setTeacher] = useState<User | null>(null);
    
    // Game State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

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
        const fetchBattleData = async () => {
            setIsLoading(true);
            try {
                const battleRef = doc(db, 'teachers', teacher.uid, 'bossBattles', battleId);
                const battleSnap = await getDoc(battleRef);
                if (battleSnap.exists()) {
                    setBattle(battleSnap.data() as Battle);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Battle not found.' });
                    router.push('/teacher/battles');
                }
            } catch (error) {
                console.error("Error fetching battle data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load the battle.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchBattleData();
    }, [battleId, teacher, router, toast]);

    const handleSubmitAnswer = () => {
        if (selectedAnswerIndex === null) return;
        const isCorrect = selectedAnswerIndex === battle!.questions[currentQuestionIndex].correctAnswerIndex;
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
        setIsSubmitted(true);
    };

    const handleNextQuestion = () => {
        setIsSubmitted(false);
        setSelectedAnswerIndex(null);
        setCurrentQuestionIndex(prev => prev + 1);
    };
    
    const handleSaveSummary = async () => {
        if (!teacher || !battle) return;
        setIsSaving(true);
        try {
            const summaryRef = collection(db, 'teachers', teacher.uid, 'groupBattleSummaries');
            await addDoc(summaryRef, {
                battleName: battle.battleName,
                battleId: battleId,
                score: score,
                totalQuestions: battle.questions.length,
                completedAt: serverTimestamp(),
            });
            await logGameEvent(teacher.uid, 'BOSS_BATTLE', `Group Battle "${battle.battleName}" completed with a score of ${score}/${battle.questions.length}.`);
            toast({ title: 'Summary Saved!', description: 'The group battle summary has been saved to the archives.' });
            router.push('/teacher/battles/summary');
        } catch (error) {
            console.error("Error saving summary:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the battle summary.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !battle) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }
    
    const isLastQuestion = currentQuestionIndex === battle.questions.length - 1;
    const isBattleFinished = currentQuestionIndex >= battle.questions.length;
    const currentQuestion = battle.questions[currentQuestionIndex];

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gray-900 p-4">
            <Image
                src={battle.bossImageUrl || 'https://placehold.co/1200x800.png'}
                alt={battle.battleName}
                fill
                className="object-cover opacity-30"
                priority
            />
            <div className="absolute top-4 left-4 z-10">
                 <Button variant="outline" onClick={() => router.push('/teacher/battles')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    End Battle Early
                </Button>
            </div>
            
            <div className="z-10 w-full max-w-4xl">
                {isBattleFinished ? (
                     <Card className="text-center shadow-2xl bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <Trophy className="h-16 w-16 mx-auto text-yellow-400" />
                            <CardTitle className="text-4xl font-bold">Battle Complete!</CardTitle>
                            <CardDescription className="text-lg">Your guild fought valiantly against {battle.battleName}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-6xl font-bold">{score} / {battle.questions.length}</p>
                            <p className="text-muted-foreground">Correct Answers</p>
                        </CardContent>
                        <CardFooter className="flex-col gap-4">
                            <Button size="lg" onClick={handleSaveSummary} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save to Archives
                            </Button>
                            <Button variant="link" onClick={() => router.push('/teacher/battles')}>
                                Exit Without Saving
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <Swords className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="text-2xl font-semibold">Question {currentQuestionIndex + 1} / {battle.questions.length}</CardTitle>
                            <CardTitle className="text-4xl font-bold">{currentQuestion.questionText}</CardTitle>
                        </CardHeader>
                        <CardContent className="mt-6">
                            {isSubmitted ? (
                                <div className="text-center p-8 rounded-lg animate-in fade-in-50">
                                    {selectedAnswerIndex === currentQuestion.correctAnswerIndex ? (
                                        <>
                                            <CheckCircle className="h-24 w-24 mx-auto text-green-400" />
                                            <p className="text-5xl font-bold mt-4 text-green-600">Your strike has landed!</p>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-24 w-24 mx-auto text-red-400" />
                                            <p className="text-5xl font-bold mt-4 text-red-300">Your strike has missed!</p>
                                            <p className="text-xl mt-2">The correct answer was: <span className="font-bold">{currentQuestion.answers[currentQuestion.correctAnswerIndex]}</span></p>
                                        </>
                                    )}
                                     <Button size="lg" className="mt-8" onClick={handleNextQuestion}>
                                        {isLastQuestion ? 'View Summary' : 'Next Question'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.answers.map((answer, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        className={cn(
                                            "text-lg h-auto py-6 whitespace-normal justify-start text-left text-white border-gray-400 hover:bg-primary/90 hover:text-primary-foreground",
                                            selectedAnswerIndex === index && "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary"
                                        )}
                                        onClick={() => setSelectedAnswerIndex(index)}
                                    >
                                        <span className="font-bold mr-4">{String.fromCharCode(65 + index)}.</span>
                                        {answer}
                                    </Button>
                                ))}
                                </div>
                            )}
                        </CardContent>
                         {!isSubmitted && (
                            <CardFooter className="justify-center">
                                <Button size="lg" onClick={handleSubmitAnswer} disabled={selectedAnswerIndex === null}>
                                    Submit Answer
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                )}
            </div>
        </div>
    )
}
