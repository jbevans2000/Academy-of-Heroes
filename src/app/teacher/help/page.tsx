
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, LifeBuoy } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { HelpArticle } from '@/components/admin/help-article-editor';
import Link from 'next/link';

export default function TeacherHelpPage() {
    const router = useRouter();
    const [articles, setArticles] = useState<HelpArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'content', 'help', 'articles'), where('audience', '==', 'teacher'));
        const unsubscribeArticles = onSnapshot(q, (snapshot) => {
            const articlesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpArticle))
                .sort((a, b) => a.order - b.order);
            setArticles(articlesData);
            setIsLoading(false);
        });

        return () => {
            unsubscribeArticles();
        };
    }, [router]);
    
    const getYouTubeEmbedUrl = (url: string) => {
        if (!url) return '';
        const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : '';
    };

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
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                <Link href="/teacher/dashboard" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Podium
                    </Button>
                </Link>
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Card className="text-center bg-card/90">
                        <CardHeader>
                            <CardTitle className="text-3xl">The Grandmaster's Guide</CardTitle>
                            <CardDescription>A complete guide to managing your guild and leading your students to victory.</CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="bg-card/90">
                        <CardHeader>
                            <CardTitle>Guild Leader Features Guide</CardTitle>
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
                                                <div dangerouslySetInnerHTML={{ __html: article.content }} />
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
                     <div className="text-center">
                         <Link href="/teacher/dashboard" passHref>
                            <Button size="lg" variant="default">
                                Return to Podium
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
