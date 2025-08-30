
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Edit, Trash2, Check, X, Loader2 } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Mock data for now
interface DuelQuestionSection {
  id: string;
  name: string;
  questionCount: number;
  isActive: boolean;
}

export default function TrainingGroundsPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<User | null>(null);
  const [sections, setSections] = useState<DuelQuestionSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setTeacher(user);
        // Mock loading
        setTimeout(() => {
            setSections([
                { id: '1', name: 'Unit 1: Cell Biology', questionCount: 15, isActive: true },
                { id: '2', name: 'Unit 2: Genetics', questionCount: 25, isActive: false },
                { id: '3', name: 'Unit 3: Ecology', questionCount: 20, isActive: true },
            ]);
            setIsLoading(false);
        }, 1500)
      } else {
        router.push('/teacher/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
             <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Podium
            </Button>
            <div className="flex gap-2">
                 <Button variant="destructive">Deactivate All</Button>
                 <Button><PlusCircle className="mr-2 h-4 w-4"/> New Section</Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
                <CardTitle>The Training Grounds</CardTitle>
                <CardDescription>Manage the question sections for student duels. Active sections will be included in the random question pool for all duels.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : sections.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No question sections created yet. Click "New Section" to begin.</p>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {sections.map(section => (
                            <AccordionItem value={section.id} key={section.id}>
                                <div className="flex items-center w-full">
                                    <AccordionTrigger className="text-lg flex-grow hover:no-underline">
                                        {section.name} ({section.questionCount} Questions)
                                    </AccordionTrigger>
                                    <div className="flex items-center gap-2 pr-4">
                                        <span className="text-sm font-semibold">{section.isActive ? 'Active' : 'Inactive'}</span>
                                        <Button size="icon" variant="ghost">
                                            {section.isActive ? <Check className="h-5 w-5 text-green-600"/> : <X className="h-5 w-5 text-destructive" />}
                                        </Button>
                                        <Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                </div>
                                <AccordionContent>
                                    <div className="p-4 bg-secondary rounded-md">
                                        <p>Question management for this section will go here.</p>
                                    </div>
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
