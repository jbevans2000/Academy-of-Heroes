

'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, Library, CheckCircle, Loader2, RotateCcw } from "lucide-react";
import Image from 'next/image';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { doc, getDoc, updateDoc, collection, getDocs, where, query } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Chapter, QuestHub } from '@/lib/quests';
import type { Student } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { logGameEvent } from '@/lib/gamelog';


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
    const [isUncompleting, setIsUncompleting] = useState(false);

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
                        const studentDocSnap = await getDoc(studentRef);
                        if (studentDocSnap.exists()) {
                            setStudent(studentDocSnap.data() as Student);
                        }
                    }
                } else if (isPreviewMode) {
                    // In preview mode, we need to find the teacher who owns this content.
                    // This is a simplified approach. A more robust system might pass the teacherId in the URL.
                    const chaptersQuery = query(collection(db, 'teachers'), where('__name__', '==', chapterId as string));
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
                    setChapter(chapterSnap.data() as Chapter);

                    const hubDocRef = doc(db, 'teachers', teacherUid, 'questHubs', hubId as string);
                    const hubSnap = await getDoc(hubDocRef);
                    if (hubSnap.exists()) {
                        setHub(hubSnap.data() as QuestHub);
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

    const handleMarkComplete = async () => {
        if (!user || !student || !chapter || !hub || !teacherUid) return;
        setIsCompleting(true);

        try {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
            
            const currentProgress = student.questProgress?.[hubId as string] || 0;
            // Ensure we don't accidentally mark an old chapter complete and mess up progress
            if (chapter.chapterNumber !== currentProgress + 1) {
                toast({ title: "Sequence Error", description: "This chapter cannot be marked as complete yet." });
                setIsCompleting(false);
                return;
            }

            const newProgress = {
                ...student.questProgress,
                [hubId as string]: chapter.chapterNumber
            };

            const updates: Partial<Student> = {
                questProgress: newProgress
            };

            // Check if this is the last chapter of the hub to update hubsCompleted
            if (chapter.chapterNumber === totalChaptersInHub) {
                if ((student.hubsCompleted || 0) < hub.hubOrder) {
                    updates.hubsCompleted = hub.hubOrder;
                }
            }
            
            await updateDoc(studentRef, updates);
            
            // Update local student state to reflect immediate change
            setStudent(prev => prev ? ({ ...prev, ...updates }) : null);

            await logGameEvent(teacherUid, 'CHAPTER', `${student.studentName} completed Chapter ${chapter.chapterNumber}: ${chapter.title}.`);

            toast({ title: "Quest Complete!", description: `You have completed Chapter ${chapter.chapterNumber}: ${chapter.title}.` });

        } catch (error) {
            console.error("Error completing quest:", error);
            toast({ title: "Error", description: "Could not save your progress.", variant: "destructive" });
        } finally {
            setIsCompleting(false);
        }
    };
    
    const handleUnmarkComplete = async () => {
        if (!user || !student || !chapter || !teacherUid) return;
        setIsUncompleting(true);

        try {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
            
            const currentProgress = student.questProgress?.[hubId as string] || 0;
            
            if (chapter.chapterNumber > currentProgress) {
                toast({ title: "Cannot Unmark", description: "This chapter has not been completed yet." });
                return;
            }
            if (chapter.chapterNumber === 0) return; // Should not happen with 1-based chapter numbers

            // Set progress back to the previous chapter number
            const newProgressValue = chapter.chapterNumber - 1;
            
            const newProgress = {
                ...student.questProgress,
                [hubId as string]: newProgressValue
            };

            const updates: Partial<Student> = {
                questProgress: newProgress
            };

            await updateDoc(studentRef, updates);
            
            setStudent(prev => prev ? ({ ...prev, ...updates }) : null);

            await logGameEvent(teacherUid, 'CHAPTER', `${student.studentName} rolled back progress on Chapter ${chapter.chapterNumber}: ${chapter.title}.`);

            toast({ title: "Quest Progress Rolled Back", description: `Progress has been reset to Chapter ${newProgressValue}.` });
            router.push(`/dashboard/map/${hubId}`);

        } catch (error) {
            console.error("Error unmarking quest:", error);
            toast({ title: "Error", description: "Could not save your progress.", variant: "destructive" });
        } finally {
            setIsUncompleting(false);
        }
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

    const returnPath = isPreviewMode ? '/teacher/quests' : `/dashboard/map/${hubId}`;

    return (
        <div className="flex flex-col items-center justify-start bg-background p-2 md:p-4">
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
                                        data-ai-hint="twig decoration"
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
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
                 <div className="flex justify-center flex-col items-center gap-4 py-4">
                     {isCurrentChapter && !isPreviewMode && (
                        <Button 
                            size="lg" 
                            onClick={handleMarkComplete}
                            disabled={isCompleting}
                        >
                            {isCompleting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                            Mark Quest as Complete
                        </Button>
                     )}
                     {isCompletedChapter && !isPreviewMode && (
                         <Button 
                            size="lg" 
                            variant="destructive"
                            onClick={handleUnmarkComplete}
                            disabled={isUncompleting}
                        >
                            {isUncompleting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RotateCcw className="mr-2 h-5 w-5" />}
                            Unmark Quest as Complete
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
    );
}
