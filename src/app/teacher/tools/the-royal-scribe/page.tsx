
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ScrollText, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const gradeLevels = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];
const fictionGenres = ['Fantasy', 'Sci-Fi', 'Mystery', 'Adventure', 'Comedy'];
const nonFictionSubjects = ['History', 'Science', 'English', 'Social Studies', 'Art'];

export default function RoyalScribePage() {
    const router = useRouter();
    const { toast } = useToast();
    
    // State for UI
    const [isLoading, setIsLoading] = useState(false);
    const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);

    // State for inputs
    const [gradeLevel, setGradeLevel] = useState('');
    const [promptType, setPromptType] = useState<'Fiction' | 'Non-Fiction' | ''>('');
    const [genreOrSubject, setGenreOrSubject] = useState('');
    const [specificTopic, setSpecificTopic] = useState('');

    const resetSelections = () => {
        setGradeLevel('');
        setPromptType('');
        setGenreOrSubject('');
        setSpecificTopic('');
        setGeneratedPrompt(null);
    }

    return (
         <div 
            className="relative flex min-h-screen w-full flex-col"
        >
             <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-061eec79-9062-4e42-a63e-0458bee737cd.jpg?alt=media&token=6077d818-0966-4653-b533-1d97e6c33d31')`,
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
                                <ScrollText className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl text-black">The Royal Scribe</CardTitle>
                            <CardDescription className="text-black">Generate the perfect writing prompt for your students.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Step 1: Grade Level */}
                            <div className="space-y-2 text-left">
                                <Label className="text-lg font-semibold text-black">Step 1: Select Grade Level</Label>
                                <Select onValueChange={setGradeLevel} value={gradeLevel} disabled={isLoading}>
                                    <SelectTrigger><SelectValue placeholder="Choose a grade..." /></SelectTrigger>
                                    <SelectContent>{gradeLevels.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>

                            {/* Step 2: Prompt Type */}
                            {gradeLevel && (
                                <div className="space-y-2 text-left animate-in fade-in-50">
                                    <Label className="text-lg font-semibold text-black">Step 2: Choose Prompt Type</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Button onClick={() => setPromptType('Fiction')} variant={promptType === 'Fiction' ? 'default' : 'outline'} disabled={isLoading}>Fiction</Button>
                                        <Button onClick={() => setPromptType('Non-Fiction')} variant={promptType === 'Non-Fiction' ? 'default' : 'outline'} disabled={isLoading}>Non-Fiction</Button>
                                    </div>
                                </div>
                            )}

                             {/* Step 3: Genre / Subject */}
                            {promptType === 'Fiction' && (
                                <div className="space-y-2 text-left animate-in fade-in-50">
                                    <Label className="text-lg font-semibold text-black">Step 3: Select Fiction Genre</Label>
                                    <Select onValueChange={setGenreOrSubject} value={genreOrSubject} disabled={isLoading}>
                                        <SelectTrigger><SelectValue placeholder="Choose a genre..." /></SelectTrigger>
                                        <SelectContent>{fictionGenres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                            {promptType === 'Non-Fiction' && (
                                <div className="space-y-4 text-left animate-in fade-in-50">
                                    <div>
                                        <Label className="text-lg font-semibold text-black">Step 3: Select Subject</Label>
                                        <Select onValueChange={setGenreOrSubject} value={genreOrSubject} disabled={isLoading}>
                                            <SelectTrigger><SelectValue placeholder="Choose a subject..." /></SelectTrigger>
                                            <SelectContent>{nonFictionSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-lg font-semibold text-black">Step 4 (Optional): Specify a Topic</Label>
                                        <Input 
                                            placeholder="e.g., The Roman Empire, Photosynthesis, Shakespeare" 
                                            value={specificTopic}
                                            onChange={(e) => setSpecificTopic(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            )}

                             <div className="pt-4">
                                <Button size="lg" disabled>
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    Generate Prompt
                                </Button>
                             </div>

                             {generatedPrompt && (
                                <div className="p-4 border-2 border-dashed border-primary rounded-lg bg-background/80 w-full animate-in fade-in-50 text-left">
                                    <h3 className="text-xl font-bold font-headline text-black text-center mb-2">Your Writing Prompt</h3>
                                    <p className="text-lg text-black">{generatedPrompt}</p>
                                     <div className="text-center mt-4">
                                        <Button variant="outline" onClick={resetSelections}>Create Another</Button>
                                    </div>
                                </div>
                             )}

                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
