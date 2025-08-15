
'use client';

import { useState, useEffect } from 'react';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, PlusCircle, Trash2, Eye, GitBranch, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Question {
  id: number;
  questionText: string;
  answers: string[];
  correctAnswerIndex: number | null;
}

export default function NewBossBattlePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [battleTitle, setBattleTitle] = useState('');
  const [bossImageUrl, setBossImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [damage, setDamage] = useState<number | string>(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // This ensures the initial question is only set on the client
    // after hydration, preventing the server/client mismatch.
    setQuestions([{ id: Date.now(), questionText: '', answers: ['', '', '', ''], correctAnswerIndex: null }]);
    setIsClient(true);
  }, []);


  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { id: Date.now(), questionText: '', answers: ['', '', '', ''], correctAnswerIndex: null },
    ]);
  };

  const handleRemoveQuestion = (id: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== id));
    } else {
        toast({
            variant: 'destructive',
            title: 'Cannot Remove',
            description: 'You must have at least one question.',
        })
    }
  };

  const handleQuestionChange = (id: number, value: string) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, questionText: value } : q))
    );
  };

  const handleAnswerChange = (qId: number, aIndex: number, value: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === qId
          ? {
              ...q,
              answers: q.answers.map((a, i) => (i === aIndex ? value : a)),
            }
          : q
      )
    );
  };

  const handleCorrectAnswerChange = (qId: number, aIndex: number) => {
    setQuestions(
      questions.map((q) =>
        q.id === qId ? { ...q, correctAnswerIndex: aIndex } : q
      )
    );
  };

  const validateBattle = () => {
    if (!battleTitle.trim()) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Boss Battle Title is required.' });
        return false;
    }
     if (questions.some(q => !q.questionText.trim())) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'All questions must have text.' });
        return false;
    }
    if (questions.some(q => q.answers.some(a => !a.trim()))) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'All answer choices must be filled in.' });
        return false;
    }
    if (questions.some(q => q.correctAnswerIndex === null)) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Each question must have a correct answer selected.' });
        return false;
    }
    return true;
  }

  const handleCreateBattle = async () => {
    if (!validateBattle()) return;

    setIsSaving(true);

    // Remove the temporary `id` field used for React keys
    const questionsToSave = questions.map(({ id, ...rest }) => rest);
    
    try {
        await addDoc(collection(db, 'bossBattles'), {
            battleName: battleTitle,
            bossImageUrl,
            videoUrl,
            damage: Number(damage),
            questions: questionsToSave,
            createdAt: new Date(),
        });

        toast({
            title: 'Battle Created Successfully!',
            description: 'The boss battle has been saved and is ready to be activated.',
        });
        router.push('/teacher/battles');
    } catch (error) {
        console.error("Error creating boss battle:", error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not save the boss battle to the database. Please try again.',
        });
    } finally {
        setIsSaving(false);
    }
  }

  const handlePreviewBattle = () => {
      // Logic for preview will go here
      if (!validateBattle()) return;
      
      toast({
          title: 'Preview Mode',
          description: 'This will show you what the battle looks like for students.',
      })
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="outline" onClick={() => router.push('/teacher/battles')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Battles
          </Button>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl">Create New Boss Battle</CardTitle>
              <CardDescription>
                Design an epic challenge for your students. Add a title, media, and your questions below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Battle Details Form */}
              <div className="space-y-4 p-6 border rounded-lg">
                 <h3 className="text-xl font-semibold">Battle Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="battle-name" className="text-base">Boss Battle Title</Label>
                        <Input id="battle-name" placeholder="e.g., The Ancient Karkorah" value={battleTitle} onChange={(e) => setBattleTitle(e.target.value)} disabled={isSaving} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="damage" className="text-base">Incorrect Answer Damage</Label>
                        <Input id="damage" type="number" placeholder="e.g., 10" value={damage} onChange={(e) => setDamage(Number(e.target.value))} disabled={isSaving} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="boss-image" className="text-base">Boss Image URL</Label>
                    <Input id="boss-image" placeholder="https://example.com/boss.png" value={bossImageUrl} onChange={(e) => setBossImageUrl(e.target.value)} disabled={isSaving} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="video-url" className="text-base">Intro Video URL (YouTube, etc.)</Label>
                    <Input id="video-url" placeholder="https://www.youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={isSaving} />
                </div>
              </div>

              {/* Question Editor */}
              {isClient && <div className="space-y-6">
                 <h3 className="text-xl font-semibold">Questions</h3>
                {questions.map((q, qIndex) => (
                  <Card key={q.id} className="p-6 relative bg-background shadow-md">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveQuestion(q.id)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-5 w-5" />
                        <span className="sr-only">Remove Question</span>
                      </Button>
                    <div className="space-y-4">
                      <Label htmlFor={`q-text-${q.id}`} className="text-base font-semibold">Question {qIndex + 1}</Label>
                      <Textarea
                        id={`q-text-${q.id}`}
                        placeholder="What is the powerhouse of the cell?"
                        value={q.questionText}
                        onChange={(e) => handleQuestionChange(q.id, e.target.value)}
                        className="text-base"
                        disabled={isSaving}
                      />
                      <div className="space-y-2">
                        <Label>Answer Choices (Select the correct one)</Label>
                        <RadioGroup
                            value={q.correctAnswerIndex !== null ? `answer-${q.id}-${q.correctAnswerIndex}` : ''}
                            onValueChange={() => {}}
                            disabled={isSaving}
                         >
                          {q.answers.map((ans, aIndex) => (
                            <div key={aIndex} className="flex items-center gap-4">
                              <RadioGroupItem
                                value={`answer-${q.id}-${aIndex}`}
                                id={`q-${q.id}-a-${aIndex}`}
                                onClick={() => handleCorrectAnswerChange(q.id, aIndex)}
                              />
                               <Label htmlFor={`q-${q.id}-a-${aIndex}`} className="sr-only">
                                Answer {aIndex + 1}
                               </Label>
                                <Input
                                  placeholder={`Answer ${aIndex + 1}`}
                                  value={ans}
                                  onChange={(e) => handleAnswerChange(q.id, aIndex, e.target.value)}
                                  disabled={isSaving}
                                />
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>
                  </Card>
                ))}
                 <Button variant="outline" onClick={handleAddQuestion} disabled={isSaving}>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Add Another Question
                </Button>
              </div>}

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" size="lg" onClick={handlePreviewBattle} disabled={isSaving}>
                    <Eye className="mr-2" />
                    Preview Boss Battle
                </Button>
                <Button size="lg" onClick={handleCreateBattle} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitBranch className="mr-2" />}
                    Create Boss Battle
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
