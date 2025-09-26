
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, CheckCircle, Loader2, RotateCcw, ArrowRight } from "lucide-react";
import Image from 'next/image';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { doc, getDoc, updateDoc, collection, getDocs, where, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Chapter, QuestHub, Quiz, QuizQuestion, LessonPart } from '@/lib/quests';
import type { Student } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { logGameEvent } from '@/lib/gamelog';
import { completeChapter, uncompleteChapter } from '@/ai/flows/manage-quests';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';

const LessonGallery = ({ parts, onLastPartReached }: { parts: LessonPart[], onLastPartReached: (isLast: boolean) => void }) => {
    const [currentPartIndex, setCurrentPartIndex] = useState(0);

    useEffect(() => {
        onLastPartReached(currentPartIndex === parts.length - 1);
    }, [currentPartIndex, parts.length, onLastPartReached]);


    if (!parts || parts.length === 0) {
        return <p className="text-center text-muted-foreground">This lesson has no content.</p>;
    }

    const currentPart = parts[currentPartIndex];

    return (
        <div className="space-y-4">
            <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: currentPart.content }} />
            <div className="flex justify-between items-center mt-4">
                <Button onClick={() => setCurrentPartIndex(p => p - 1)} disabled={currentPartIndex === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous Part
                </Button>
                <span className="text-sm font-semibold text-muted-foreground">
                    Part {currentPartIndex + 1} of {parts.length}
                </span>
                <Button onClick={() => setCurrentPartIndex(p => p + 1)} disabled={currentPartIndex === parts.length - 1}>
                    Next Part <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};


const QuizComponent = ({ quiz, student, chapter, hub, teacherUid, onQuizComplete }: { 
    quiz: Quiz, 
    student: Student, 
    chapter: Chapter,
    hub: QuestHub,
    teacherUid: string,
    onQuizComplete: (score: number, answers: any[]) => void 
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
    const [allAnswers, setAllAnswers] = useState<(number[] | null)[]>(new Array(quiz.questions.length).fill(null));
    const [showResults, setShowResults] = useState(false);
    const { toast } = useToast();

    const handleAnswerSelect = (answerIndex: number) => {
        const currentQuestion = quiz.questions[currentQuestionIndex];
        if (currentQuestion.questionType === 'single') {
            setSelectedAnswers([answerIndex]);
        } else {
            setSelectedAnswers(prev => 
                prev.includes(answerIndex) 
                ? prev.filter(i => i !== answerIndex) 
                : [...prev, answerIndex]
            );
        }
    };

    const handleNext = () => {
        if (selectedAnswers.length === 0) {
            toast({ variant: 'destructive', title: 'No Answer Selected', description: 'Please choose an answer.' });
            return;
        }
        
        const newAnswers = [...allAnswers];
        newAnswers[currentQuestionIndex] = selectedAnswers.sort((a,b) => a-b);
        setAllAnswers(newAnswers);
        
        setSelectedAnswers([]); // Reset for the next question
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setShowResults(true);
        }
    };
    
    if (showResults) {
        let correctCount = 0;
        allAnswers.forEach((studentAns, i) => {
            if (!studentAns) return;
            const question = quiz.questions[i];
            const correctAns = question.correctAnswer.sort((a,b) => a-b);

            // For single answer, it's a simple comparison
            if (question.questionType === 'single' && studentAns[0] === correctAns[0]) {
                 correctCount++;
            }
            // For multiple answers, arrays must be identical
            else if (question.questionType === 'multiple' && JSON.stringify(studentAns) === JSON.stringify(correctAns)) {
                correctCount++;
            }
        });
        
        const score = (correctCount / quiz.questions.length) * 100;
        const passed = score >= (quiz.settings.passingScore || 80);

        const detailedAnswers = allAnswers.map((studentAnswerIndices, i) => {
            const question = quiz.questions[i];
            const studentAnswerText = studentAnswerIndices?.map(idx => question.answers[idx]).join(', ') || 'No Answer';
            const correctAnswerText = question.correctAnswer.map(idx => question.answers[idx]).join(', ');
            const isCorrect = JSON.stringify(studentAnswerIndices) === JSON.stringify(question.correctAnswer.sort((a,b)=>a-b));

            return {
                question: question.text,
                studentAnswer: studentAnswerText,
                correctAnswer: correctAnswerText,
                isCorrect,
            };
        });

        return (
            <Card className="mt-6 bg-secondary/50">
                <CardHeader className="text-center">
                    <CardTitle>Quiz Results</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-4xl font-bold">You scored {correctCount} out of {quiz.questions.length}</p>
                    <p className="text-2xl font-semibold">{score.toFixed(0)}%</p>
                    
                    {quiz.settings.requirePassing && passed && (
                        <p className="text-green-600 font-bold">You have proven your knowledge!</p>
                    )}
                    {quiz.settings.requirePassing && !passed && (
                         <p className="text-destructive font-bold">You have not met the minimum score of {quiz.settings.passingScore}%.</p>
                    )}


                    <div className="flex justify-center gap-4">
                        {(passed || !quiz.settings.requirePassing) ? (
                            <Button onClick={() => onQuizComplete(score, detailedAnswers)}>Continue</Button>
                        ) : null}
                         {(!passed && quiz.settings.requirePassing) && (
                            <Button variant="outline" onClick={() => {
                                setCurrentQuestionIndex(0);
                                setAllAnswers(new Array(quiz.questions.length).fill(null));
                                setSelectedAnswers([]);
                                setShowResults(false);
                            }}>
                                Retake Quiz
                            </Button>
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
                <div className="space-y-2">
                    {currentQuestion.answers.map((answer, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 rounded-md hover:bg-muted transition-colors">
                            {currentQuestion.questionType === 'single' ? (
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
    const [isConfirmingComplete, setIsConfirmingComplete] = useState(false);
    const [isConfirmingUncomplete, setIsConfirmingUncomplete] = useState(false);
    const [isOnLastLessonPart, setIsOnLastLessonPart] = useState(false);
    
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
                    const data = { id: chapterSnap.id, ...chapterSnap.data() } as Chapter;
                    
                    // Migration logic for old lesson structure
                    if (data.lessonContent && (!data.lessonParts || data.lessonParts.length === 0)) {
                        data.lessonParts = [{ id: uuidv4(), content: data.lessonContent }];
                    } else if (!data.lessonParts) {
                        data.lessonParts = [];
                    }

                    setChapter(data);

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
        setIsConfirmingComplete(false); // Close confirmation dialog

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
    
    const handleUnmarkComplete = async () => {
        if (!user || !student || !chapter || !hub || !teacherUid) return;
        setIsCompleting(true);
        setIsConfirmingUncomplete(false);

        try {
            const result = await uncompleteChapter({
                teacherUid,
                studentUid: student.uid,
                hubId: hub.id,
                chapterNumber: chapter.chapterNumber,
            });
            if (result.success) {
                toast({ title: "Progress Updated", description: result.message });
                // No need to redirect, they are already on the chapter page they want to review.
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Error uncompleting chapter:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsCompleting(false);
        }
    }
    
    const handleQuizComplete = (score: number, answers: any[]) => {
        if (!chapter?.quiz) return;
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

    const lastCompletedChapterForHub = student?.questProgress?.[hubId as string] || 0;
    const isCompletedChapter = chapter.chapterNumber <= lastCompletedChapterForHub;
    const isCurrentChapter = chapter.chapterNumber === lastCompletedChapterForHub + 1;
    
    const returnPath = isPreviewMode ? '/teacher/quests' : `/dashboard/map/${hubId}`;
    
    const shouldShowQuiz = chapter.quiz && student && (chapter.quiz.questions?.length || 0) > 0 && !isPreviewMode && isOnLastLessonPart;


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

        <AlertDialog open={isConfirmingComplete} onOpenChange={setIsConfirmingComplete}>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Mark Chapter Complete?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Would you like to mark the current chapter complete and return to the {hub.name} quest map?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>No, stay here</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleMarkComplete()}>Yes, complete it</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

         <AlertDialog open={isConfirmingUncomplete} onOpenChange={setIsConfirmingUncomplete}>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unmark Chapter as Complete?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will reset your progress to this chapter, allowing you to proceed from here. Are you sure you wish to continue?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnmarkComplete}>Yes, Reset My Progress</AlertDialogAction>
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
                                {chapter.lessonParts && chapter.lessonParts.length > 0 ? (
                                    <LessonGallery parts={chapter.lessonParts} onLastPartReached={setIsOnLastLessonPart} />
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">There is no lesson content for this chapter yet.</p>
                                )}
                                {shouldShowQuiz && (
                                    <QuizComponent 
                                        quiz={chapter.quiz!}
                                        student={student!}
                                        chapter={chapter as Chapter}
                                        hub={hub}
                                        teacherUid={teacherUid}
                                        onQuizComplete={handleQuizComplete}
                                    />
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
                 <div className="flex justify-center flex-col items-center gap-4 py-4">
                     {!isPreviewMode && (!chapter.quiz || !chapter.quiz.questions || chapter.quiz.questions.length === 0) && (
                        <Button 
                            size="lg" 
                            onClick={() => setIsConfirmingComplete(true)}
                            disabled={isCompleting || isCompletedChapter}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg py-6 px-8 shadow-lg"
                        >
                            {isCompleting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                            {isCompletedChapter ? 'Chapter Already Completed' : 'Mark Chapter Complete'}
                        </Button>
                     )}
                     {isCompletedChapter && !isPreviewMode && (
                         <Button 
                            size="lg" 
                            onClick={() => setIsConfirmingUncomplete(true)}
                            disabled={isCompleting}
                            variant="destructive"
                            className="font-bold text-lg py-6 px-8 shadow-lg"
                        >
                            {isCompleting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RotateCcw className="mr-2 h-5 w-5" />}
                            Unmark as Complete
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
