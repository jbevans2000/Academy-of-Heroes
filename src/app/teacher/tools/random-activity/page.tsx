
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dices, Loader2, BrainCircuit, PersonStanding, Download } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { marked } from 'marked';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { generateActivity, type ActivityGeneratorOutput } from '@/ai/flows/activity-generator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const gradeLevels = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

export default function RandomActivityPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [currentActivity, setCurrentActivity] = useState<ActivityGeneratorOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingType, setLoadingType] = useState<'Mental' | 'Physical' | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<string>('');

    const handleGenerate = async (taskType: 'Mental' | 'Physical') => {
        if (!selectedGrade) {
            toast({
                variant: 'destructive',
                title: 'Grade Level Required',
                description: 'Please select a grade level before generating an activity.',
            });
            return;
        }

        setIsLoading(true);
        setLoadingType(taskType);
        setCurrentActivity(null);

        try {
            const result = await generateActivity({
                gradeLevel: selectedGrade,
                taskType: taskType,
            });
            setCurrentActivity(result);
        } catch (error: any) {
            console.error("Error generating activity:", error);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: error.message || 'The AI could not generate an activity at this time. Please try again.',
            });
        } finally {
            setIsLoading(false);
            setLoadingType(null);
        }
    };


    const handleDownload = () => {
        if (!currentActivity?.documentContent) return;

        const doc = new jsPDF();
        
        // Sanitize text by removing markdown for PDF processing
        const sanitizeText = (text: string) => text
            .replace(/### (.*)/g, '$1')
            .replace(/## (.*)/g, '$1')
            .replace(/# (.*)/g, '$1')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/^- /gm, '• ');

        doc.setFontSize(18);
        doc.text(currentActivity.title, 10, 20);

        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(sanitizeText(currentActivity.documentContent), 180);
        doc.text(splitText, 10, 30);

        // Add answer key on a new page if it exists
        if (currentActivity.answerKey) {
            doc.addPage();
            doc.setFontSize(16);
            doc.text("Answer Key", 10, 20);
            doc.setFontSize(12);
            const answerSplit = doc.splitTextToSize(sanitizeText(currentActivity.answerKey), 180);
            doc.text(answerSplit, 10, 30);
        }
        
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
                            <CardDescription className="text-black">Choose a grade and task type to generate a fun activity for your class!</CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-[200px] flex flex-col items-center justify-center p-6 space-y-4">
                             <div className="w-full max-w-xs">
                                <Label htmlFor="grade-select" className="text-black">Select Grade Level</Label>
                                <Select onValueChange={setSelectedGrade} value={selectedGrade} disabled={isLoading}>
                                    <SelectTrigger id="grade-select">
                                        <SelectValue placeholder="Choose a grade..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {gradeLevels.map(grade => (
                                            <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full">
                                {isLoading ? (
                                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                                ) : currentActivity ? (
                                    <div className="p-4 border-2 border-dashed border-primary rounded-lg bg-background/80 w-full animate-in fade-in-50 text-left">
                                        <h3 className="text-2xl font-bold font-headline text-black text-center">{currentActivity.title}</h3>
                                        
                                        <div
                                            className="prose prose-sm max-w-none text-black text-center"
                                            dangerouslySetInnerHTML={{ __html: marked(currentActivity.description) as string }}
                                        />
                                        
                                        {currentActivity.documentContent && (
                                            <>
                                                <Separator className="my-4" />
                                                <div 
                                                    className="prose prose-sm max-w-none text-black text-left whitespace-pre-wrap"
                                                    dangerouslySetInnerHTML={{ __html: marked(currentActivity.documentContent) as string }}
                                                />
                                                <div className="text-center mt-4">
                                                    <Button onClick={handleDownload}>
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Download Task as PDF
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                        {currentActivity.answerKey && (
                                            <Accordion type="single" collapsible className="w-full mt-4">
                                                <AccordionItem value="item-1">
                                                    <AccordionTrigger>Show Answer</AccordionTrigger>
                                                    <AccordionContent>
                                                        <p className="font-semibold text-black">{currentActivity.answerKey}</p>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">Choose a task type below to generate an activity!</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button size="lg" className="text-lg py-8" onClick={() => handleGenerate('Mental')} disabled={isLoading}>
                            {isLoading && loadingType === 'Mental' ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <BrainCircuit className="mr-4 h-6 w-6" />}
                            Generate Mental Task
                        </Button>
                         <Button size="lg" className="text-lg py-8" onClick={() => handleGenerate('Physical')} disabled={isLoading}>
                             {isLoading && loadingType === 'Physical' ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <PersonStanding className="mr-4 h-6 w-6" />}
                            Generate Physical Task
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
