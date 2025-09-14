
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { HelpArticle } from '@/components/admin/help-article-editor';

export default function TeacherHelpPage() {
    const router = useRouter();
    const [articles, setArticles] = useState<HelpArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push('/teacher/login');
            }
        });

        const q = query(collection(db, 'content', 'help', 'articles'), where('audience', '==', 'teacher'));
        const unsubscribeArticles = onSnapshot(q, (snapshot) => {
            const articlesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpArticle))
                .sort((a, b) => a.order - b.order);
            setArticles(articlesData);
            setIsLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeArticles();
        };
    }, [router]);
    
    const getYouTubeEmbedUrl = (url: string) => {
        if (!url) return '';
        const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : '';
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Podium
                    </Button>
                    <Card className="text-center">
                        <CardHeader>
                            <CardTitle className="text-3xl">The Grandmaster's Guide</CardTitle>
                            <CardDescription>A complete guide to managing your guild and leading your students to victory.</CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Teacher Features Guide</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? (
                                <Loader2 className="h-8 w-8 mx-auto animate-spin" />
                            ) : (
                                <Accordion type="single" collapsible className="w-full">
                                    {articles.map(article => (
                                         <AccordionItem value={article.id} key={article.id}>
                                            <AccordionTrigger className="text-lg">{article.title}</AccordionTrigger>
                                            <AccordionContent className="prose dark:prose-invert max-w-none">
                                                <p>{article.content}</p>
                                                {article.videoUrl && (
                                                <div className="aspect-video mt-4">
                                                    <iframe 
                                                        className="w-full h-full rounded-lg"
                                                        src={getYouTubeEmbedUrl(article.videoUrl)} 
                                                        title={article.title}
                                                        frameBorder="0" 
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                        allowFullScreen>
                                                    </iframe>
                                                </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
}

    
