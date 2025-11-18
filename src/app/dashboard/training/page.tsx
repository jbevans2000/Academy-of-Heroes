
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { QuizQuestion } from '@/lib/quests';
import { completeDailyTraining, getDailyTrainingQuestions } from '@/ai/flows/daily-training';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';


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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalMessage, setFinalMessage] = useState('');

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
            const fetchedQuestions = await getDailyTrainingQuestions(teacherUid, student);

            if (fetchedQuestions.length < 1) {
                setError("You haven't completed any chapters with quizzes, and there are no active duel questions. Complete some quests and come back tomorrow!");
                setIsLoading(false);
                return;
            }
            
            setQuestions(fetchedQuestions);
            setAllAnswers(new Array(fetchedQuestions.length).fill(null));
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
                // Ensure correctAnswer is always an array for comparison
                const correctAns = (Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswerIndex]).sort((a,b)=>a-b);
                if (JSON.stringify(studentAns) === JSON.stringify(correctAns)) {
                    correctCount++;
                }
            });

            const finalScore = correctCount;
            setScore(finalScore);
            
            if (student && teacherUid) {
                const result = await completeDailyTraining({
                    teacherUid,
                    studentUid: student.uid,
                    score: finalScore,
                    totalQuestions: questions.length
                });

                if (result.success && result.message) {
                    setFinalMessage(result.message);
                } else if (!result.success) {
                    toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to save training results.' });
                    setFinalMessage('An error occurred while saving your results.');
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
        <div
            className="flex items-center justify-center min-h-screen bg-cover bg-center p-4"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Sep%2029%2C%202025%2C%2009_36_12%20PM.png?alt=media&token=0efae8ff-e31f-4797-9cbd-594db6c445fc')`,
            }}
        >
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
                                        {(currentQuestion.questionType || 'single') !== 'multiple' ? (
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
                            {finalMessage && (
                                <div className="p-4 bg-secondary rounded-lg">
                                    <p className="font-semibold">{finalMessage}</p>
                                </div>
                            )}

                             <Accordion type="single" collapsible className="w-full text-left mt-6">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>Review Your Answers</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4 max-h-60 overflow-y-auto p-2">
                                            {questions.map((q, i) => {
                                                const studentAnswerIndices = allAnswers[i];
                                                const correctAnswerIndices = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswerIndex];
                                                const isCorrect = JSON.stringify(studentAnswerIndices) === JSON.stringify(correctAnswerIndices.sort((a,b) => a-b));
                                                
                                                return (
                                                    <div key={i} className={cn("p-3 border rounded-md", isCorrect ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10')}>
                                                        <p className="font-semibold">{i + 1}. {q.text}</p>
                                                        <p className="text-sm mt-1">You answered: <span className="font-bold">{studentAnswerIndices?.map(idx => q.answers[idx]).join(', ') || 'No Answer'}</span></p>
                                                        {!isCorrect && (
                                                            <p className="text-sm mt-1 text-green-700 dark:text-green-300">Correct answer: <span className="font-bold">{correctAnswerIndices.map(idx => q.answers[idx]).join(', ')}</span></p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
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
