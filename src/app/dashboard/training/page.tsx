
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Chapter } from '@/lib/data';
import type { QuizQuestion } from '@/lib/quests';
import { completeDailyTraining } from '@/ai/flows/daily-training';
import { getDuelSettings } from '@/ai/flows/manage-duels';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, Star, Coins } from 'lucide-react';

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export default function DailyTrainingPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
    const [allAnswers, setAllAnswers] = useState<(number[] | null)[]>([]);
    
    const [quizState, setQuizState] = useState<'loading' | 'in_progress' | 'finished'>('loading');
    const [score, setScore] = useState(0);
    const [xpGained, setXpGained] = useState(0);
    const [goldGained, setGoldGained] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const studentMetaRef = doc(db, 'students', currentUser.uid);
                const metaSnap = await getDoc(studentMetaRef);
                if (metaSnap.exists()) {
                    setTeacherUid(metaSnap.data().teacherUid);
                    const studentRef = doc(db, 'teachers', metaSnap.data().teacherUid, 'students', currentUser.uid);
                    const studentSnap = await getDoc(studentRef);
                    if (studentSnap.exists()) {
                        setStudent(studentSnap.data() as Student);
                    }
                }
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const fetchAndSetQuestions = useCallback(async () => {
        if (!student || !teacherUid) return;

        try {
            // New logic: Build a list of all completed chapter IDs from questProgress
            const completedChapterIds: string[] = [];
            const chaptersSnapshot = await getDocs(collection(db, 'teachers', teacherUid, 'chapters'));
            const allChapters = chaptersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));

            if (student.questProgress) {
                for (const hubId in student.questProgress) {
                    const lastChapterNumber = student.questProgress[hubId];
                    const chaptersInHub = allChapters.filter(c => c.hubId === hubId && c.chapterNumber <= lastChapterNumber);
                    chaptersInHub.forEach(c => completedChapterIds.push(c.id));
                }
            }

            if (completedChapterIds.length === 0) {
                setError("You haven't completed any chapters with quizzes yet. Complete some quests and come back tomorrow!");
                setIsLoading(false);
                return;
            }

            // The rest of the logic remains the same
            const chaptersRef = collection(db, 'teachers', teacherUid, 'chapters');
            const chapterChunks = [];
            for (let i = 0; i < completedChapterIds.length; i += 30) {
                chapterChunks.push(completedChapterIds.slice(i, i + 30));
            }

            let allQuizQuestions: QuizQuestion[] = [];
            for (const chunk of chapterChunks) {
                if (chunk.length === 0) continue;
                const q = query(chaptersRef, where('__name__', 'in', chunk));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => {
                    const chapter = doc.data() as Chapter;
                    if (chapter.quiz && chapter.quiz.questions) {
                        allQuizQuestions = allQuizQuestions.concat(chapter.quiz.questions);
                    }
                });
            }

            if (allQuizQuestions.length < 1) {
                setError("None of your completed chapters had any quiz questions for training.");
                setIsLoading(false);
                return;
            }

            const selectedQuestions = shuffleArray(allQuizQuestions).slice(0, 10);
            setQuestions(selectedQuestions);
            setAllAnswers(new Array(selectedQuestions.length).fill(null));
            setQuizState('in_progress');
        } catch (err) {
            console.error(err);
            setError('An error occurred while preparing your training session.');
        } finally {
            setIsLoading(false);
        }
    }, [student, teacherUid]);


    useEffect(() => {
        if (student && teacherUid) {
            fetchAndSetQuestions();
        }
    }, [student, teacherUid, fetchAndSetQuestions]);
    
    const handleNext = async () => {
        if (selectedAnswers.length === 0) {
            toast({ variant: 'destructive', title: 'No Answer Selected', description: 'Please choose an answer.' });
            return;
        }

        const newAnswers = [...allAnswers];
        newAnswers[currentQuestionIndex] = selectedAnswers.sort((a,b) => a-b);
        setAllAnswers(newAnswers);
        
        setSelectedAnswers([]);

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Quiz is finished, now calculate score and submit
            setIsSubmitting(true);
            let correctCount = 0;
            newAnswers.forEach((studentAns, i) => {
                if (!studentAns) return;
                const question = questions[i];
                const correctAns = (question.correctAnswer || [question.correctAnswerIndex]).sort((a,b) => a-b);
                if (JSON.stringify(studentAns) === JSON.stringify(correctAns)) {
                    correctCount++;
                }
            });

            const finalScore = correctCount;
            setScore(finalScore);
            
            if (student && teacherUid) {
                const settings = await getDuelSettings(teacherUid);
                const scorePercentage = questions.length > 0 ? finalScore / questions.length : 0;
                const xpToAward = Math.ceil((settings.dailyTrainingXpReward || 0) * scorePercentage);
                const goldToAward = Math.ceil((settings.dailyTrainingGoldReward || 0) * scorePercentage);
                setXpGained(xpToAward);
                setGoldGained(goldToAward);

                const result = await completeDailyTraining({
                    teacherUid,
                    studentUid: student.uid,
                    score: finalScore,
                    totalQuestions: questions.length
                });

                if (!result.success) {
                    toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to save training results.' });
                }
            }
            setQuizState('finished');
            setIsSubmitting(false);
        }
    };
    
    const handleAnswerSelect = (answerIndex: number) => {
        const currentQuestion = questions[currentQuestionIndex];
        const type = currentQuestion.questionType || 'single';
        if (type === 'single' || type === 'true-false') {
            setSelectedAnswers([answerIndex]);
        } else {
            setSelectedAnswers(prev => 
                prev.includes(answerIndex) 
                ? prev.filter(i => i !== answerIndex) 
                : [...prev, answerIndex]
            );
        }
    };
    
    const currentQuestion = questions[currentQuestionIndex];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-lg text-center">
                    <CardHeader>
                        <CardTitle>Training Unavailable</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }


    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <div className="w-full max-w-2xl">
                 {quizState === 'in_progress' && currentQuestion && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Training: Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                            <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full mt-2" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <p className="font-bold text-lg mb-4">{currentQuestion.text}</p>
                             <div className="space-y-2">
                                {currentQuestion.answers.map((answer, index) => (
                                     <div key={index} className="flex items-center space-x-3 p-3 rounded-md hover:bg-muted transition-colors">
                                        {(currentQuestion.questionType || 'single') === 'single' ? (
                                            <RadioGroup onValueChange={() => handleAnswerSelect(index)} value={String(selectedAnswers[0])}>
                                                <RadioGroupItem value={String(index)} id={`q${currentQuestionIndex}-a${index}`} />
                                            </RadioGroup>
                                        ) : (
                                            <Checkbox 
                                                id={`q${currentQuestionIndex}-a${index}`} 
                                                checked={selectedAnswers.includes(index)} 
                                                onCheckedChange={() => handleAnswerSelect(index)} 
                                            />
                                        )}
                                        <Label htmlFor={`q${currentQuestionIndex}-a${index}`} className="flex-1 cursor-pointer">{answer}</Label>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end mt-4">
                                <Button onClick={handleNext}>
                                    {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next Question'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                 )}
                 {quizState === 'finished' && (
                    <Card className="text-center animate-in fade-in-50">
                        <CardHeader>
                            <CardTitle className="text-3xl">Training Complete!</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <p className="text-5xl font-bold">{score} / {questions.length}</p>
                             <p className="text-xl text-muted-foreground">Correct Answers</p>
                             <div className="p-4 bg-secondary rounded-lg space-y-2">
                                <h3 className="font-bold">Rewards Gained</h3>
                                <div className="flex justify-center gap-6">
                                    <p className="flex items-center gap-2 text-lg"><Star className="h-5 w-5 text-yellow-400"/> +{xpGained} XP</p>
                                    <p className="flex items-center gap-2 text-lg"><Coins className="h-5 w-5 text-amber-500"/> +{goldGained} Gold</p>
                                </div>
                             </div>
                        </CardContent>
                        <CardContent>
                            <Button size="lg" onClick={() => router.push('/dashboard')}>
                                <ArrowLeft className="mr-2 h-4 w-4"/>
                                Return to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                 )}
            </div>
        </div>
    );
}
