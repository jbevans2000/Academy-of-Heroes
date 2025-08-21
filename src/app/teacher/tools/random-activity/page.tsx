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

const gradeLevels = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

export default function RandomActivityPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [currentActivity, setCurrentActivity] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingType, setLoadingType] = useState<'Mental' | 'Physical' | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<string>('');


    const handleDownload = () => {
        if (!currentActivity?.documentContent) return;

        const doc = new jsPDF();
        
        // This is a simplified conversion. For complex markdown, a more robust library would be needed.
        // For now, we'll replace some basic markdown for PDF output.
        const html = marked(currentActivity.documentContent);
        
        doc.html(html, {
            callback: function(doc) {
                doc.save(`${currentActivity.title.replace(/ /g, '_')}.pdf`);
            },
            x: 10,
            y: 10,
            width: 180,
            windowWidth: 800 
        });
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
                                    <p className="text-muted-foreground">Choose a task type below to generate an activity!</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button size="lg" className="text-lg py-8" disabled>
                            <BrainCircuit className="mr-4 h-6 w-6" />
                            Generate Mental Task
                        </Button>
                         <Button size="lg" className="text-lg py-8" disabled>
                            <PersonStanding className="mr-4 h-6 w-6" />
                            Generate Physical Task
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
