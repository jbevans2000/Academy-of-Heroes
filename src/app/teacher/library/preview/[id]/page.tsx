
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { LibraryHub, LibraryChapter } from '@/lib/quests';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const ContentRenderer = ({ htmlContent }: { htmlContent: string }) => {
    const [textPart, setTextPart] = useState('');
    const [videoParts, setVideoParts] = useState<string[]>([]);

    useEffect(() => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        const iframes = Array.from(tempDiv.getElementsByTagName('iframe'));
        const videos = iframes.map(iframe => {
            iframe.classList.add('w-full', 'h-full', 'rounded-lg', 'aspect-video');
            const wrapper = document.createElement('div');
            wrapper.className = 'mt-4';
            wrapper.appendChild(iframe.cloneNode(true));
            return wrapper.innerHTML;
        });
        
        iframes.forEach(iframe => iframe.parentNode?.removeChild(iframe));

        setTextPart(tempDiv.innerHTML);
        setVideoParts(videos);
    }, [htmlContent]);

    return (
        <div>
            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: textPart }} />
            {videoParts.length > 0 && (
                <div className="mt-6 space-y-4">
                    <Separator />
                    <h4 className="font-bold text-lg">Embedded Videos</h4>
                    {videoParts.map((videoHtml, index) => (
                        <div key={index} dangerouslySetInnerHTML={{ __html: videoHtml }} />
                    ))}
                </div>
            )}
        </div>
    );
};


export default function LibraryPreviewPage() {
    const router = useRouter();
    const params = useParams();
    const hubId = params.id as string;
    const { toast } = useToast();
    
    const [teacher, setTeacher] = useState<User | null>(null);
    const [hub, setHub] = useState<LibraryHub | null>(null);
    const [chapters, setChapters] = useState<LibraryChapter[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
        if (!hubId || !teacher) return;
        
        const fetchHubAndChapters = async () => {
            setIsLoading(true);
            try {
                const hubRef = doc(db, 'library_hubs', hubId);
                const hubSnap = await getDoc(hubRef);

                if (hubSnap.exists()) {
                    setHub({ id: hubSnap.id, ...hubSnap.data() } as LibraryHub);
                    
                    const chaptersQuery = query(collection(db, 'library_chapters'), where('libraryHubId', '==', hubId));
                    const chaptersSnap = await getDocs(chaptersQuery);
                    const chaptersData = chaptersSnap.docs
                        .map(doc => ({ id: doc.id, ...doc.data() } as LibraryChapter))
                        .sort((a,b) => a.chapterNumber - b.chapterNumber);
                    setChapters(chaptersData);
                } else {
                    toast({ variant: 'destructive', title: 'Not Found', description: 'This shared quest could not be found.' });
                    router.push('/teacher/library');
                }
            } catch (error) {
                console.error("Error fetching library content:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load preview.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchHubAndChapters();
    }, [hubId, teacher, router, toast]);

    if (isLoading || !hub) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </main>
            </div>
        )
    }

    return (
         <div className="relative flex flex-col min-h-screen">
            <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FArchives.jpg?alt=media&token=1bbfbdcd-fb4a-4139-9a8d-44603c19a86c')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                }}
            />
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                     <Button variant="outline" onClick={() => router.push('/teacher/library')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Royal Library
                    </Button>
                    <Card className="bg-card/90">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-3xl">{hub.name}</CardTitle>
                                    <CardDescription>By {hub.originalTeacherName}</CardDescription>
                                </div>
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={hub.originalTeacherAvatarUrl} alt={hub.originalTeacherName} />
                                    <AvatarFallback>{hub.originalTeacherName?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Badge>{hub.gradeLevel}</Badge>
                                <Badge variant="secondary">{hub.subject}</Badge>
                                {hub.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{hub.description}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/90">
                        <CardHeader>
                            <CardTitle>Chapters in this Hub ({chapters.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Accordion type="single" collapsible className="w-full">
                                {chapters.length > 0 ? (
                                    chapters.map(chapter => (
                                        <AccordionItem key={chapter.originalChapterId} value={chapter.originalChapterId}>
                                            <AccordionTrigger className="text-lg hover:no-underline">
                                                Chapter {chapter.chapterNumber}: {chapter.title}
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <Tabs defaultValue="story" className="w-full">
                                                    <TabsList className="grid w-full grid-cols-2">
                                                        <TabsTrigger value="story">Story</TabsTrigger>
                                                        <TabsTrigger value="lesson">Lesson</TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="story" className="mt-4 p-4 border rounded-md bg-secondary/30">
                                                        <ContentRenderer htmlContent={chapter.storyContent || ''} />
                                                        {chapter.storyAdditionalContent && (
                                                            <>
                                                                <Separator className="my-4" />
                                                                <ContentRenderer htmlContent={chapter.storyAdditionalContent} />
                                                            </>
                                                        )}
                                                    </TabsContent>
                                                    <TabsContent value="lesson" className="mt-4 p-4 border rounded-md bg-secondary/30">
                                                        {chapter.lessonParts && chapter.lessonParts.length > 0 ? (
                                                            chapter.lessonParts.map((part, index) => (
                                                                <div key={part.id}>
                                                                    {index > 0 && <Separator className="my-4" />}
                                                                    <ContentRenderer htmlContent={part.content} />
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-muted-foreground">No lesson content for this chapter.</p>
                                                        )}
                                                    </TabsContent>
                                                </Tabs>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center">No chapters were found for this hub.</p>
                                )}
                            </Accordion>
                        </CardContent>
                        <CardFooter className="justify-end">
                            <Button disabled>Import Hub</Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    )
}
