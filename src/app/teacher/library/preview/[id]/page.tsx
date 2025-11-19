
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
                    
                    // Correctly query the library_chapters collection
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
                            <div className="space-y-2">
                                {chapters.length > 0 ? (
                                    chapters.map(chapter => (
                                        <div key={chapter.originalChapterId} className="p-3 border rounded-md bg-secondary/50">
                                            <p className="font-semibold">Chapter {chapter.chapterNumber}: {chapter.title}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center">No chapters were found for this hub.</p>
                                )}
                            </div>
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
