
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import type { HelpArticle } from '@/components/admin/help-article-editor';

export default function StudentHelpPage() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'content', 'help', 'articles'), where('audience', '==', 'student'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const articlesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpArticle))
            .sort((a, b) => a.order - b.order);
        setArticles(articlesData);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : '';
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center">
            <LifeBuoy className="h-16 w-16 mx-auto text-primary mb-4" />
            <h1 className="text-4xl font-bold">Hero's Handbook</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Everything you need to know to succeed on your quest.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
               {isLoading ? (
                  <Loader2 className="h-8 w-8 mx-auto animate-spin" />
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {articles.map(article => (
                    <AccordionItem value={article.id} key={article.id}>
                      <AccordionTrigger>{article.title}</AccordionTrigger>
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
           <div className="text-center">
             <Link href="/dashboard" passHref>
                <Button size="lg" variant="outline">
                    <ArrowLeft className="mr-2 h-5 w-5" /> Return to Dashboard
                </Button>
            </Link>
           </div>
        </div>
      </main>
    </div>
  );
}

    
