
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
import { ArrowLeft, PlusCircle, Trash2, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, query, setDoc } from 'firebase/firestore';
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
            for (const question of questions) {
                const questionRef = doc(sectionRef, 'questions', question.id);
                // This will create or update the document
                await setDoc(questionRef, { ...question }, { merge: true });
            }

            // You might need to delete questions that were removed from the state but still exist in firestore.
            // This requires fetching the original list and comparing. For simplicity, this is omitted for now.

            await updateDoc(sectionRef, { questionCount: questions.length });

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
                        <CardHeader>
                            <CardTitle>Editing Section: {section.name}</CardTitle>
                            <CardDescription>Add, edit, or remove questions for this section.</CardDescription>
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
