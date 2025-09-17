
'use client';

import { useState, useEffect } from 'react';
import { getAboutPageContent } from '@/ai/flows/manage-about-page';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function AboutPage() {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const pageContent = await getAboutPageContent();
                setContent(pageContent);
            } catch (error) {
                console.error("Failed to fetch about page content:", error);
                setContent("<p>Could not load content. Please check back later.</p>");
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, []);

    return (
        <div 
            className="flex flex-col min-h-screen bg-cover bg-center"
            style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-b2ed6807-b64f-48e1-9b8c-a2d0b719db78.jpg?alt=media&token=793c0484-06f3-49ab-9557-9ca0a9b0f6bf')`}}
        >
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                <Button variant="outline" onClick={() => router.push('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Return to Home
                </Button>
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto bg-card/90 p-6 sm:p-8 md:p-12 rounded-xl shadow-2xl">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div 
                            className="prose prose-lg dark:prose-invert max-w-none [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-lg"
                            dangerouslySetInnerHTML={{ __html: content }} 
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
