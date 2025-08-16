
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dices, Loader2, BrainCircuit, PersonStanding, Download } from 'lucide-react';
import { generateActivity, type Activity } from '@/ai/flows/activity-generator';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

export default function RandomActivityPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingType, setLoadingType] = useState<'Mental' | 'Physical' | null>(null);

    const handleGenerateActivity = async (activityType: 'Mental' | 'Physical') => {
        setIsLoading(true);
        setLoadingType(activityType);
        setCurrentActivity(null);
        try {
            const activity = await generateActivity({ activityType });
            setCurrentActivity(activity);
        } catch (error) {
            console.error("Error generating activity:", error);
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: 'The AI failed to generate an activity. Please try again.',
            })
        } finally {
            setIsLoading(false);
            setLoadingType(null);
        }
    };

    const handleDownload = () => {
        if (!currentActivity?.documentContent) return;

        const doc = new jsPDF();
        
        // Basic Markdown to PDF conversion
        const lines = doc.splitTextToSize(currentActivity.documentContent, 180);
        doc.text(lines, 10, 10);
        
        doc.save(`${currentActivity.title.replace(/ /g, '_')}.pdf`);
    };

    return (
        <div 
            className="relative flex min-h-screen w-full flex-col"
        >
             <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-07b697e9-e16a-401c-9e91-79ead990b2f4.jpg?alt=media&token=f87c0edc-3042-4b55-a2a2-bb67de99ef36')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.25,
                }}
            />
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                    <Card className="shadow-2xl text-center bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex justify-center mb-2">
                                <Dices className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl text-black">A Task from the Throne</CardTitle>
                            <CardDescription className="text-black">Choose a type of task to generate a fun, fantasy-themed activity for your class!</CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-[200px] flex items-center justify-center p-6">
                            {isLoading ? (
                                 <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            ) : currentActivity ? (
                                <div className="p-4 border-2 border-dashed border-primary rounded-lg bg-background/80 w-full animate-in fade-in-50 text-left">
                                    <h3 className="text-2xl font-bold font-headline text-black text-center">{currentActivity.title}</h3>
                                    <p className="text-black mt-2 text-center">{currentActivity.description}</p>
                                    
                                    {currentActivity.documentContent && (
                                        <>
                                            <Separator className="my-4" />
                                            <div 
                                                className="prose prose-sm max-w-none text-black text-left whitespace-pre-wrap"
                                            >
                                                {currentActivity.documentContent}
                                            </div>
                                            <div className="text-center mt-4">
                                                <Button onClick={handleDownload}>
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Download Task as PDF
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <p className="text-black">Choose a task type below to generate an activity!</p>
                            )}
                        </CardContent>
                    </Card>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button size="lg" className="text-lg py-8" onClick={() => handleGenerateActivity('Mental')} disabled={isLoading}>
                            {isLoading && loadingType === 'Mental' ? (
                                <Loader2 className="mr-4 h-6 w-6 animate-spin" />
                            ) : (
                                <BrainCircuit className="mr-4 h-6 w-6" />
                            )}
                            Generate Mental Task
                        </Button>
                         <Button size="lg" className="text-lg py-8" onClick={() => handleGenerateActivity('Physical')} disabled={isLoading}>
                            {isLoading && loadingType === 'Physical' ? (
                                <Loader2 className="mr-4 h-6 w-6 animate-spin" />
                            ) : (
                                <PersonStanding className="mr-4 h-6 w-6" />
                            )}
                            Generate Physical Task
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
