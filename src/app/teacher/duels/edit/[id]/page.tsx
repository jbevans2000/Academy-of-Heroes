
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, PlusCircle, Trash2, Loader2, Save, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, query, setDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { DuelQuestion, DuelQuestionSection } from '@/lib/duels';
import { v4 as uuidv4 } from 'uuid';

export default function EditDuelSectionPage() {
    const router = useRouter();
    const params = useParams();
    const sectionId = params.id as string;
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [section, setSection] = useState<DuelQuestionSection | null>(null);
    const [questions, setQuestions] = useState<DuelQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

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
        if (!sectionId || !teacher) return;
        
        const sectionRef = doc(db, 'teachers', teacher.uid, 'duelQuestionSections', sectionId);
        const unsubSection = onSnapshot(sectionRef, (docSnap) => {
            if (docSnap.exists()) {
                setSection({ id: docSnap.id, ...docSnap.data() } as DuelQuestionSection);
            } else {
                 toast({ variant: 'destructive', title: 'Not Found', description: 'This section could not be found.' });
                 router.push('/teacher/duels');
            }
        });

        const questionsRef = collection(db, 'teachers', teacher.uid, 'duelQuestionSections', sectionId, 'questions');
        const q = query(questionsRef);
        const unsubQuestions = onSnapshot(q, (snapshot) => {
            setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DuelQuestion)));
            setIsLoading(false);
        });

        return () => {
            unsubSection();
            unsubQuestions();
        }

    }, [sectionId, teacher, router, toast]);
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const rows = text.split(/\r\n|\n/);
                const headers = rows[0].split(',').map(h => h.trim());
                const expectedHeaders = ['Q', 'A1', 'A2', 'A3', 'A4', 'C'];
                
                if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
                    toast({ variant: 'destructive', title: 'Invalid CSV Format', description: 'Headers must be exactly: Q,A1,A2,A3,A4,C' });
                    return;
                }

                const newQuestions: DuelQuestion[] = [];
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row.trim()) continue; // Skip empty rows

                    const values = row.split(','); // Simplified parsing
                    const questionText = values[0];
                    const answers = values.slice(1, 5);
                    const correctAnswerText = values[5];
                    
                    const correctAnswerIndex = answers.findIndex(ans => ans.trim().toLowerCase() === correctAnswerText.trim().toLowerCase());

                    if (correctAnswerIndex === -1) {
                         toast({ variant: 'destructive', title: 'Parsing Error', description: `Could not find correct answer '${correctAnswerText}' in options for question: "${questionText}"` });
                         continue; // Skip this question
                    }

                    newQuestions.push({
                        id: uuidv4(),
                        text: questionText,
                        answers: answers,
                        correctAnswerIndex: correctAnswerIndex,
                    });
                }
                
                setQuestions(prev => [...prev, ...newQuestions]);
                toast({ title: 'Upload Successful', description: `${newQuestions.length} questions have been added to the editor.` });

            } catch (error) {
                toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not parse the CSV file. Please check its format.' });
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    };

    const handleAddQuestion = () => {
        setQuestions(prev => [...prev, { id: uuidv4(), text: '', answers: ['', '', '', ''], correctAnswerIndex: 0 }]);
    };
    
    const handleQuestionChange = (id: string, value: string) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, text: value } : q));
    };

    const handleAnswerChange = (qId: string, aIndex: number, value: string) => {
        setQuestions(prev => prev.map(q =>
            q.id === qId ? { ...q, answers: q.answers.map((a, i) => i === aIndex ? value : a) } : q
        ));
    };

    const handleCorrectAnswerChange = (qId: string, aIndex: number) => {
        setQuestions(prev => prev.map(q =>
            q.id === qId ? { ...q, correctAnswerIndex: aIndex } : q
        ));
    };

    const handleRemoveQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    const handleSaveChanges = async () => {
        if (!teacher || !section) return;

        const invalidQuestion = questions.find(q => !q.text.trim() || q.answers.some(a => !a.trim()));
        if(invalidQuestion) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'All questions and answers must be filled out.'});
            return;
        }

        setIsSaving(true);
        try {
            const sectionRef = doc(db, 'teachers', teacher.uid, 'duelQuestionSections', sectionId);
            const batch = writeBatch(db);
            
            // Set/update all questions currently in state
            for (const question of questions) {
                const questionRef = doc(sectionRef, 'questions', question.id);
                const { id, ...questionData } = question; // Don't save our client-side uuid as a field
                batch.set(questionRef, questionData);
            }

            // To handle deletion, we fetch current questions in DB and delete those not in state.
            const existingQuestionsSnap = await getDocs(collection(sectionRef, 'questions'));
            const stateQuestionIds = new Set(questions.map(q => q.id));
            existingQuestionsSnap.forEach(doc => {
                if (!stateQuestionIds.has(doc.id)) {
                    batch.delete(doc.ref);
                }
            });

            batch.update(sectionRef, { questionCount: questions.length });

            await batch.commit();

            toast({ title: 'Questions Saved', description: 'Your changes have been saved.' });
            router.push('/teacher/duels');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !section) {
         return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin" /></main>
            </div>
        )
    }

    return (
         <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                 <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/duels')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Sections
                    </Button>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Editing Section: {section.name}</CardTitle>
                                <CardDescription>Add, edit, or remove questions for this section.</CardDescription>
                            </div>
                             <div>
                                <Label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload CSV
                                </Label>
                                <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {questions.map((q, qIndex) => (
                                <Card key={q.id} className="p-4 relative">
                                    <Button
                                        variant="ghost" size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => handleRemoveQuestion(q.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    <div className="space-y-2">
                                        <Label htmlFor={`q-text-${q.id}`}>Question {qIndex + 1}</Label>
                                        <Textarea
                                            id={`q-text-${q.id}`}
                                            value={q.text}
                                            onChange={(e) => handleQuestionChange(q.id, e.target.value)}
                                            placeholder="Enter the question text"
                                        />
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        <Label>Answers (Select the correct one)</Label>
                                        <RadioGroup value={String(q.correctAnswerIndex)} onValueChange={(value) => handleCorrectAnswerChange(q.id, Number(value))}>
                                            {q.answers.map((ans, aIndex) => (
                                                <div key={aIndex} className="flex items-center gap-2">
                                                    <RadioGroupItem value={String(aIndex)} id={`q-${q.id}-a-${aIndex}`} />
                                                    <Input
                                                        value={ans}
                                                        onChange={(e) => handleAnswerChange(q.id, aIndex, e.target.value)}
                                                        placeholder={`Answer ${aIndex + 1}`}
                                                    />
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                </Card>
                            ))}
                            <Button variant="outline" onClick={handleAddQuestion}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                            </Button>
                        </CardContent>
                    </Card>
                     <div className="flex justify-end">
                        <Button size="lg" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save All Changes
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}
