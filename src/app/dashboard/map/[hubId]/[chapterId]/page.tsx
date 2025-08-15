
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import Image from 'next/image';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Chapter } from '@/lib/quests';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChapterPage() {
    const router = useRouter();
    const params = useParams();
    const { hubId, chapterId } = params;

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!chapterId) return;

        const fetchChapter = async () => {
            setIsLoading(true);
            const docRef = doc(db, 'chapters', chapterId as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setChapter(docSnap.data() as Chapter);
            }
            setIsLoading(false);
        };

        fetchChapter();
    }, [chapterId]);

    if (isLoading) {
        return (
             <div className="flex flex-col items-center justify-start bg-background p-2 md:p-4">
                <div className="w-full max-w-4xl space-y-4">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }

    if (!chapter) {
        return <p>Chapter not found.</p>;
    }
    
    // Simple way to split content into paragraphs
    const storyParagraphs = chapter.storyContent.split('\\n').map((p, i) => <p key={i} className="px-4">{p}</p>);
    const lessonParagraphs = chapter.lessonContent.split('\\n').map((p, i) => <p key={i} className="px-4">{p}</p>);


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
                                <Separator />
                                {chapter.videoUrl && <div className="flex justify-center">
                                    <iframe 
                                        width="800" 
                                        height="400" 
                                        src={chapter.videoUrl} 
                                        title="YouTube video player" 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                        allowFullScreen
                                        className="rounded-lg shadow-lg border">
                                    </iframe>
                                </div>}
                                <Separator />
                                {storyParagraphs}
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
                                <Separator />
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
                                {lessonParagraphs}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
                <div className="flex justify-center gap-4 py-4">
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
    );
}
