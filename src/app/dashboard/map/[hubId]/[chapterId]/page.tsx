'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, CheckCircle, Loader2 } from "lucide-react";
import Image from 'next/image';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { doc, getDoc, updateDoc, collection, getDocs, where, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Chapter, QuestHub, QuizQuestion, Quiz } from '@/lib/quests';
import type { Student } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { logGameEvent } from '@/lib/gamelog';
import { completeChapter } from '@/ai/flows/manage-quests';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';

const QuizComponent = ({ quiz, student, chapter, hub, teacherUid, onQuizComplete }: { 
    quiz: Quiz, 
    student: Student, 
    chapter: Chapter,
    hub: QuestHub,
    teacherUid: string,
    onQuizComplete: (score: number, answers: any[]) => void 
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(quiz.questions.length).fill(null));
    const [showResults, setShowResults] = useState(false);
    const { toast } = useToast();

    const handleAnswerSelect = (answerIndex: number) => {
        setSelectedAnswer(answerIndex);
    };

    const handleNext = () => {
        if (selectedAnswer === null) {
            toast({ variant: 'destructive', title: 'No Answer Selected', description: 'Please choose an answer.' });
            return;
        }
        
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = selectedAnswer;
        setAnswers(newAnswers);
        
        setSelectedAnswer(null);
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Last question, so show results
            setShowResults(true);
        }
    };
    
    if (showResults) {
        const correctAnswers = answers.filter((ans, i) => ans === quiz.questions[i].correctAnswerIndex).length;
        const score = (correctAnswers / quiz.questions.length) * 100;
        const passed = !quiz.settings.requirePassing || score >= quiz.settings.passingScore;

        const detailedAnswers = answers.map((studentAnswerIndex, i) => {
            const question = quiz.questions[i];
            return {
                question: question.text,
                studentAnswer: studentAnswerIndex !== null ? question.answers[studentAnswerIndex] : 'No Answer',
                correctAnswer: question.answers[question.correctAnswerIndex],
                isCorrect: studentAnswerIndex === question.correctAnswerIndex,
            };
        });

        return (
            <Card className="mt-6 bg-secondary/50">
                <CardHeader className="text-center">
                    <CardTitle>Quiz Results</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-4xl font-bold">You scored {correctAnswers} out of {quiz.questions.length}</p>
                    <p className="text-2xl font-semibold">{score.toFixed(0)}%</p>
                    {passed ? (
                        <p className="text-green-600 font-bold">You have proven your knowledge!</p>
                    ) : (
                        <p className="text-destructive font-bold">You have not met the minimum score of {quiz.settings.passingScore}%.</p>
                    )}
                    <div className="flex justify-center gap-4">
                        {passed && (
                            <Button onClick={() => onQuizComplete(score, detailedAnswers)}>Continue</Button>
                        )}
                        <Button variant="outline" onClick={() => {
                            setCurrentQuestionIndex(0);
                            setAnswers(new Array(quiz.questions.length).fill(null));
                            setSelectedAnswer(null);
                            setShowResults(false);
                        }}>
                            Retake Quiz
                        </Button>
                         {!passed && !quiz.settings.requirePassing && (
                            <Button variant="secondary" onClick={() => onQuizComplete(score, detailedAnswers)}>Continue Anyway</Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
        <Card className="mt-6 bg-secondary/50">
            <CardHeader>
                <CardTitle className="text-center">Prove Your Knowledge!</CardTitle>
                <Progress value={((currentQuestionIndex + 1) / quiz.questions.length) * 100} className="w-full mt-2" />
            </CardHeader>
            <CardContent>
                <p className="font-bold text-lg mb-4">{currentQuestionIndex + 1}. {currentQuestion.text}</p>
                <RadioGroup onValueChange={(value) => handleAnswerSelect(Number(value))} value={selectedAnswer?.toString()}>
                    {currentQuestion.answers.map((answer, index) => (
                        <div key={index} className="flex items-center space-x-2 p-3 rounded-md hover:bg-muted transition-colors">
                            <RadioGroupItem value={index.toString()} id={`q${currentQuestionIndex}-a${index}`} />
                            <Label htmlFor={`q${currentQuestionIndex}-a${index}`} className="flex-1 cursor-pointer">{answer}</Label>
                        </div>
                    ))}
                </RadioGroup>
                <div className="flex justify-end mt-4">
                    <Button onClick={handleNext}>
                        {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};


export default function ChapterPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { hubId, chapterId } = params;

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [hub, setHub] = useState<QuestHub | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [totalChaptersInHub, setTotalChaptersInHub] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
    const [isCompleting, setIsCompleting] = useState(false);
    const [showApprovalSentDialog, setShowApprovalSentDialog] = useState(false);
    
    // Quiz state
    const [quizPassed, setQuizPassed] = useState(false);

    const isPreviewMode = searchParams.get('preview') === 'true';

     useEffect(() => {
        const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const studentMetaRef = doc(db, 'students', currentUser.uid);
                const studentMetaSnap = await getDoc(studentMetaRef);

                if (studentMetaSnap.exists()) {
                    setTeacherUid(studentMetaSnap.data().teacherUid);
                    // Fetch student data only if not in preview mode.
                    if (!isPreviewMode) {
                        const studentRef = doc(db, 'teachers', studentMetaSnap.data().teacherUid, 'students', currentUser.uid);
                        const unsubStudent = onSnapshot(studentRef, (docSnap) => {
                            if (docSnap.exists()) {
                                setStudent(docSnap.data() as Student);
                            } else {
                                router.push('/');
                            }
                        });
                        return () => unsubStudent();
                    }
                } else if (isPreviewMode) {
                    // In preview mode, we need to find the teacher who owns this content.
                    const teachersSnapshot = await getDocs(collection(db, 'teachers'));
                    for (const teacherDoc of teachersSnapshot.docs) {
                        const chapterRef = doc(db, 'teachers', teacherDoc.id, 'chapters', chapterId as string);
                        const chapterSnap = await getDoc(chapterRef);
                        if (chapterSnap.exists()) {
                            setTeacherUid(teacherDoc.id);
                            break;
                        }
                    }
                } else {
                    router.push('/');
                }
            } else if (!isPreviewMode) {
                router.push('/');
            }
        });
        return () => authUnsubscribe();
    }, [router, isPreviewMode, chapterId]);

    useEffect(() => {
        if (!chapterId || !hubId || !teacherUid) return;

        const fetchChapterData = async () => {
            setIsLoading(true);
            try {
                const chapterDocRef = doc(db, 'teachers', teacherUid, 'chapters', chapterId as string);
                const chapterSnap = await getDoc(chapterDocRef);
                if (chapterSnap.exists()) {
                    const chapterData = { id: chapterSnap.id, ...chapterSnap.data() } as Chapter;
                    setChapter(chapterData);

                    const hubDocRef = doc(db, 'teachers', teacherUid, 'questHubs', hubId as string);
                    const hubSnap = await getDoc(hubDocRef);
                    if (hubSnap.exists()) {
                        setHub({ id: hubSnap.id, ...hubSnap.data() } as QuestHub);
                    }
                    
                    const chaptersInHubQuery = query(collection(db, 'teachers', teacherUid, 'chapters'), where('hubId', '==', hubId as string));
                    const chaptersSnapshot = await getDocs(chaptersInHubQuery);
                    setTotalChaptersInHub(chaptersSnapshot.size);

                } else {
                    toast({ title: "Not Found", description: "This chapter could not be found.", variant: 'destructive' });
                    router.push(isPreviewMode ? '/teacher/quests' : `/dashboard/map/${hubId}`);
                }
            } catch (error) {
                 toast({ title: "Error", description: "Failed to load chapter data.", variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchChapterData();
    }, [chapterId, hubId, router, toast, teacherUid, isPreviewMode]);

    const handleMarkComplete = async (quizScore?: number, quizAnswers?: any[]) => {
        if (!user || !student || !chapter || !hub || !teacherUid) return;
        
        setIsCompleting(true);

        try {
            const result = await completeChapter({
                teacherUid,
                studentUid: student.uid,
                hubId: hub.id,
                chapterId: chapter.id,
                quizScore,
                quizAnswers,
            });

            if (result.success) {
                toast({ title: "Success!", description: result.message });
                if (result.message?.includes('Request sent')) {
                    setShowApprovalSentDialog(true);
                } else {
                    router.push(`/dashboard/map/${hubId}`);
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Error completing quest:", error);
            toast({ title: "Error", description: error.message || "Could not save your progress.", variant: "destructive" });
        } finally {
            setIsCompleting(false);
        }
    };
    
    const handleQuizComplete = (score: number, answers: any[]) => {
        if (!chapter?.quiz) return;
        const passed = !chapter.quiz.settings.requirePassing || score >= chapter.quiz.settings.passingScore;
        if(passed) {
            setQuizPassed(true);
        }
        // Always call handleMarkComplete, which will handle both approval and direct completion logic
        handleMarkComplete(score, answers);
    };

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

    if (isLoading || (!student && !isPreviewMode)) {
        return (
             <div className="flex flex-col items-center justify-start bg-background p-2 md:p-4">
                <div className="w-full max-w-4xl space-y-4">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }
    
    if (!chapter || !hub) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card>
                    <CardHeader>
                        <CardTitle>Chapter Not Found</CardTitle>
                        <CardDescription>This chapter may have been moved or deleted.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/dashboard/map')}>Return to World Map</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (student && !isPreviewMode) {
        const lastCompletedChapter = student.questProgress?.[hubId as string] || 0;
        const lastCompletedHub = student.hubsCompleted || 0;
        if(hub.hubOrder > lastCompletedHub + 1) {
            return <p>You have not unlocked this area yet.</p>;
        }
        if (chapter.chapterNumber > lastCompletedChapter + 1) {
            return <p>You have not unlocked this chapter yet.</p>;
        }
    }
    
    const storyVideoSrc = chapter.videoUrl ? getYouTubeEmbedUrl(chapter.videoUrl) : '';
    const lessonVideoSrc = chapter.lessonVideoUrl ? getYouTubeEmbedUrl(chapter.lessonVideoUrl) : '';

    const lastCompletedChapterForHub = student?.questProgress?.[hubId as string] || 0;
    const isCurrentChapter = chapter.chapterNumber === lastCompletedChapterForHub + 1;
    const isCompletedChapter = chapter.chapterNumber <= lastCompletedChapterForHub;
    const canCompleteQuizlessChapter = isCurrentChapter && !isPreviewMode && !chapter.quiz;

    const returnPath = isPreviewMode ? '/teacher/quests' : `/dashboard/map/${hubId}`;

    return (
      <>
        <AlertDialog open={showApprovalSentDialog} onOpenChange={setShowApprovalSentDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Request Sent!</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your request to advance has been sent to the Guild Leader for approval.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => router.push(`/dashboard/map/${hubId}`)}>Return to Map</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div className="relative flex flex-col items-center justify-start bg-background p-2 md:p-4">
             <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FWorld%20Maps%2FWorld%20Map%20(3).jpg?alt=media&token=f46483bd-849a-45cc-9e28-fe59372017b6')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.5,
                }}
            />
            <div className="w-full max-w-4xl space-y-4">
                <Card className="shadow-2xl">
                    <CardHeader className="text-center">
                        <p className="text-lg font-semibold text-primary">Chapter {chapter.chapterNumber}</p>
                        <CardTitle className="text-4xl font-bold">{chapter.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="story" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="story">Story</TabsTrigger>
                                <TabsTrigger value="lesson">Lesson</TabsTrigger>
                            </TabsList>
                            <TabsContent value="story" className="mt-6 space-y-6 text-lg leading-relaxed">
                                {chapter.mainImageUrl && <div className="flex justify-center">
                                    <Image
                                        src={chapter.mainImageUrl}
                                        alt="Chapter main image"
                                        width={800}
                                        height={400}
                                        className="rounded-lg shadow-lg border"
                                        data-ai-hint="fantasy scene"
                                        priority
                                    />
                                </div>}
                                {chapter.storyContent && <><Separator /><div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: chapter.storyContent }} /></>}
                                {chapter.decorativeImageUrl1 && <><Separator /><div className="flex justify-center">
                                     <Image
                                        src={chapter.decorativeImageUrl1}
                                        alt="Decorative image"
                                        width={800}
                                        height={400}
                                        className="rounded-lg shadow-lg border"
                                        data-ai-hint="scroll letter"
                                    />
                                </div></>}
                                {chapter.storyAdditionalContent && <><Separator /><div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: chapter.storyAdditionalContent }} /></>}
                                 {chapter.decorativeImageUrl2 && <><Separator /><div className="flex justify-center">
                                     <Image
                                        src={chapter.decorativeImageUrl2}
                                        alt="Decorative twig"
                                        width={800}
                                        height={100}
                                        className="rounded-lg object-contain"
                                        data-ai-hint="divider"
                                    />
                                </div></>}
                                {storyVideoSrc && <><Separator /><div className="flex justify-center">
                                    <iframe 
                                        width="800" 
                                        height="400" 
                                        src={storyVideoSrc} 
                                        title="YouTube video player" 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                        allowFullScreen
                                        className="rounded-lg shadow-lg border">
                                    </iframe>
                                </div></>}
                            </TabsContent>
                            <TabsContent value="lesson" className="mt-6 space-y-6 text-lg leading-relaxed">
                                 <div className="text-center">
                                    <h3 className="text-3xl font-bold text-primary">Lesson</h3>
                                 </div>
                                {chapter.lessonMainImageUrl && <div className="flex justify-center">
                                    <Image
                                        src={chapter.lessonMainImageUrl}
                                        alt="Lesson main image"
                                        width={800}
                                        height={400}
                                        className="rounded-lg shadow-lg border"
                                        data-ai-hint="science diagram"
                                        priority
                                    />
                                </div>}
                                {chapter.lessonContent && <><Separator /><div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: chapter.lessonContent }} /></>}
                                {chapter.lessonDecorativeImageUrl1 && <><Separator /><div className="flex justify-center">
                                     <Image
                                        src={chapter.lessonDecorativeImageUrl1}
                                        alt="Lesson decorative image"
                                        width={800}
                                        height={400}
                                        className="rounded-lg shadow-lg border"
                                        data-ai-hint="old paper"
                                    />
                                </div></>}
                                {chapter.lessonAdditionalContent && <><Separator /><div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: chapter.lessonAdditionalContent }} /></>}
                                 {chapter.lessonDecorativeImageUrl2 && <><Separator /><div className="flex justify-center">
                                     <Image
                                        src={chapter.lessonDecorativeImageUrl2}
                                        alt="Lesson decorative twig"
                                        width={800}
                                        height={100}
                                        className="rounded-lg object-contain"
                                        data-ai-hint="divider"
                                    />
                                </div></>}
                                {lessonVideoSrc && <><Separator /><div className="flex justify-center">
                                    <iframe 
                                        width="800" 
                                        height="400" 
                                        src={lessonVideoSrc} 
                                        title="YouTube video player" 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                        allowFullScreen
                                        className="rounded-lg shadow-lg border">
                                    </iframe>
                                </div></>}
                                {chapter.quiz && isCurrentChapter && student && (
                                    <QuizComponent 
                                        quiz={chapter.quiz}
                                        student={student}
                                        chapter={chapter as Chapter}
                                        hub={hub}
                                        teacherUid={teacherUid}
                                        onQuizComplete={handleQuizComplete}
                                    />
                                ) }
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
                 <div className="flex justify-center flex-col items-center gap-4 py-4">
                     {canCompleteQuizlessChapter && (
                        <Button 
                            size="lg" 
                            onClick={() => handleMarkComplete()}
                            disabled={isCompleting}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg py-6 px-8 shadow-lg"
                        >
                            {isCompleting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                            Mark Chapter Complete
                        </Button>
                     )}
                     <div className="flex justify-center gap-4">
                        <Button 
                            onClick={() => router.push(returnPath)} 
                            variant="outline"
                            size="lg"
                        >
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            {isPreviewMode ? 'Return to Quest Archives' : 'Return to Quest Map'}
                        </Button>
                         <Button 
                            onClick={() => router.push('/dashboard')} 
                            variant="outline"
                            size="lg"
                        >
                            <LayoutDashboard className="mr-2 h-5 w-5" />
                            Return to Dashboard
                        </Button>
                     </div>
                 </div>
            </div>
        </div>
      </>
    );
}