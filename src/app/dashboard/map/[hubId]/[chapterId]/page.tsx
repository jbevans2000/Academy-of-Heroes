
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter, useParams } from 'next/navigation';
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

export default function ChapterPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { hubId, chapterId } = params;

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [hub, setHub] = useState<QuestHub | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [totalChaptersInHub, setTotalChaptersInHub] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isUncompleting, setIsUncompleting] = useState(false);

     useEffect(() => {
        const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                getDoc(doc(db, 'students', currentUser.uid)).then(docSnap => {
                    if (docSnap.exists()) {
                        setStudent(docSnap.data() as Student);
                    }
                });
            } else {
                router.push('/');
            }
        });
        return () => authUnsubscribe();
    }, [router]);

    useEffect(() => {
        if (!chapterId || !hubId) return;

        const fetchChapterData = async () => {
            setIsLoading(true);
            try {
                const chapterDocRef = doc(db, 'chapters', chapterId as string);
                const chapterSnap = await getDoc(chapterDocRef);
                if (chapterSnap.exists()) {
                    setChapter(chapterSnap.data() as Chapter);

                    const hubDocRef = doc(db, 'questHubs', hubId as string);
                    const hubSnap = await getDoc(hubDocRef);
                    if (hubSnap.exists()) {
                        setHub(hubSnap.data() as QuestHub);
                    }
                    
                    const chaptersInHubQuery = query(collection(db, 'chapters'), where('hubId', '==', hubId as string));
                    const chaptersSnapshot = await getDocs(chaptersInHubQuery);
                    setTotalChaptersInHub(chaptersSnapshot.size);

                } else {
                    toast({ title: "Not Found", description: "This chapter could not be found.", variant: 'destructive' });
                    router.push(`/dashboard/map/${hubId}`);
                }
            } catch (error) {
                 toast({ title: "Error", description: "Failed to load chapter data.", variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchChapterData();
    }, [chapterId, hubId, router, toast]);

    const handleMarkComplete = async () => {
        if (!user || !student || !chapter || !hub) return;
        setIsCompleting(true);

        try {
            const studentRef = doc(db, 'students', user.uid);
            
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

            toast({ title: "Quest Complete!", description: `You have completed Chapter ${chapter.chapterNumber}: ${chapter.title}.` });

        } catch (error) {
            console.error("Error completing quest:", error);
            toast({ title: "Error", description: "Could not save your progress.", variant: "destructive" });
        } finally {
            setIsCompleting(false);
        }
    };
    
    const handleUnmarkComplete = async () => {
        if (!user || !student || !chapter) return;
        setIsUncompleting(true);

        try {
            const studentRef = doc(db, 'students', user.uid);
            
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

    if (isLoading || !student) {
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

    if (student) {
        const lastCompletedChapter = student.questProgress?.[hubId as string] || 0;
        const lastCompletedHub = student.hubsCompleted || 0;
        if(hub.hubOrder > lastCompletedHub + 1) {
            return <p>You have not unlocked this area yet.</p>;
        }
        if (chapter.chapterNumber > lastCompletedChapter + 1) {
            return <p>You have not unlocked this chapter yet.</p>;
        }
    }
    
    // Simple way to split content into paragraphs
    const storyParagraphs = chapter.storyContent?.split('\\n').map((p, i) => <p key={i} className="px-4">{p}</p>);
    const storyAdditionalParagraphs = chapter.storyAdditionalContent?.split('\\n').map((p, i) => <p key={i} className="px-4">{p}</p>);
    const lessonParagraphs = chapter.lessonContent?.split('\\n').map((p, i) => <p key={i} className="px-4">{p}</p>);
    const lessonAdditionalParagraphs = chapter.lessonAdditionalContent?.split('\\n').map((p, i) => <p key={i} className="px-4">{p}</p>);
    const storyVideoSrc = chapter.videoUrl ? getYouTubeEmbedUrl(chapter.videoUrl) : '';
    const lessonVideoSrc = chapter.lessonVideoUrl ? getYouTubeEmbedUrl(chapter.lessonVideoUrl) : '';

    const lastCompletedChapterForHub = student?.questProgress?.[hubId as string] || 0;
    const isCurrentChapter = chapter.chapterNumber === lastCompletedChapterForHub + 1;
    const isCompletedChapter = chapter.chapterNumber <= lastCompletedChapterForHub;


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
                                {chapter.storyContent && <><Separator />{storyParagraphs}</>}
                                {chapter.storyAdditionalContent && <><Separator />{storyAdditionalParagraphs}</>}
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
                                {chapter.lessonContent && <><Separator />{lessonParagraphs}</>}
                                {chapter.lessonAdditionalContent && <><Separator />{lessonAdditionalParagraphs}</>}
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
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
                 <div className="flex justify-center flex-col items-center gap-4 py-4">
                     {isCurrentChapter && (
                        <Button 
                            size="lg" 
                            onClick={handleMarkComplete}
                            disabled={isCompleting}
                        >
                            {isCompleting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                            Mark Quest as Complete
                        </Button>
                     )}
                     {isCompletedChapter && (
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
                            onClick={() => router.push(`/dashboard/map/${hubId}`)} 
                            variant="outline"
                            size="lg"
                        >
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Return to Quest Map
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

    

    