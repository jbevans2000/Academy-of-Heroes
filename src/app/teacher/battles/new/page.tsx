
'use client';

import { useState, useEffect } from 'react';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, PlusCircle, Trash2, Eye, GitBranch, Loader2, Sparkles, Image as ImageIcon, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { generateQuizQuestions, type QuizGeneratorInput } from '@/ai/flows/quiz-generator';
import NextImage from 'next/image';
import { generateBossImage } from '@/ai/flows/image-generator';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

const gradeLevels = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

interface Question {
  id: number;
  questionText: string;
  answers: string[];
  correctAnswerIndex: number | null;
  damage: number;
}

export default function NewBossBattlePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [battleTitle, setBattleTitle] = useState('');
  const [bossImageUrl, setBossImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teacher, setTeacher] = useState<User | null>(null);

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // AI Question Generation State
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [aiSubject, setAiSubject] = useState('');
  const [aiGradeLevel, setAiGradeLevel] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState<number | string>(5);

  // AI Image Generation State
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setTeacher(user);
      } else {
        router.push('/teacher/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    setQuestions([{ id: Date.now(), questionText: '', answers: ['', '', '', ''], correctAnswerIndex: null, damage: 10 }]);
    setIsClient(true);
  }, []);

  const handleGenerateQuestions = async () => {
    if (!aiSubject || !aiGradeLevel || !aiNumQuestions) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a subject, grade level, and number of questions.',
      });
      return;
    }
    setIsGeneratingQuestions(true);
    try {
      const result = await generateQuizQuestions({
        subject: aiSubject,
        gradeLevel: aiGradeLevel as QuizGeneratorInput['gradeLevel'],
        numberOfQuestions: Number(aiNumQuestions),
      });

      const newQuestions = result.questions.map((q, index) => ({
        id: Date.now() + index,
        questionText: q.questionText,
        answers: q.answers,
        correctAnswerIndex: q.correctAnswerIndex,
        damage: 10,
      }));

      setQuestions(newQuestions);
      toast({
        title: 'The Oracle has spoken!',
        description: `${newQuestions.length} questions have been generated and populated below.`,
      });

    } catch (error) {
       console.error("Error generating quiz questions:", error);
       toast({
         variant: 'destructive',
         title: 'The Oracle is Silent',
         description: 'The AI failed to generate questions. Please try again.',
       });
    } finally {
        setIsGeneratingQuestions(false);
    }
  };
  
  const handleUploadImage = async () => {
    if (!imageFile || !teacher) {
        toast({ variant: 'destructive', title: 'No File Selected', description: 'Please choose an image file to upload.' });
        return;
    }
    setIsUploading(true);
    try {
        const storage = getStorage(app);
        const imageId = uuidv4();
        const storageRef = ref(storage, `boss-images/${imageId}`);
        
        await uploadBytes(storageRef, imageFile);
        const downloadUrl = await getDownloadURL(storageRef);

        setBossImageUrl(downloadUrl);
        toast({ title: 'Upload Successful!', description: 'The boss image URL has been updated.' });
    } catch (error) {
        console.error("Error uploading image:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the image. Please check storage rules and try again.' });
    } finally {
        setIsUploading(false);
        setImageFile(null);
    }
  };

  const handleGenerateImage = async () => {
    if (!aiImagePrompt || !teacher) {
        toast({ variant: 'destructive', title: 'Missing Prompt', description: 'Please enter a description for the image.' });
        return;
    }
    setIsGeneratingImage(true);
    try {
        const dataUri = await generateBossImage({ prompt: aiImagePrompt });
        
        const storage = getStorage(app);
        const imageId = uuidv4();
        const storageRef = ref(storage, `boss-images/${imageId}`);
        
        // The AI flow now returns a data URI, which we upload from the client.
        await uploadString(storageRef, dataUri, 'data_url');
        
        const downloadUrl = await getDownloadURL(storageRef);
        setBossImageUrl(downloadUrl);
        toast({ title: 'Image Generated & Uploaded!', description: 'The new boss image has been created and set.' });

    } catch (error) {
        console.error("Error generating or uploading image:", error);
        toast({ variant: 'destructive', title: 'Image Generation Failed', description: 'Could not generate or upload the boss image. Please try again.' });
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { id: Date.now(), questionText: '', answers: ['', '', '', ''], correctAnswerIndex: null, damage: 10 },
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
  
  const handleDamageChange = (id: number, value: string) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, damage: Number(value) } : q))
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
     if (questions.some(q => isNaN(q.damage) || q.damage < 0)) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Damage for incorrect answers must be a non-negative number.' });
        return false;
    }
    return true;
  }

  const handleCreateBattle = async () => {
    if (!validateBattle() || !teacher) return;

    setIsSaving(true);

    const questionsToSave = questions.map(({ id, ...rest }) => rest);
    
    try {
        await addDoc(collection(db, 'teachers', teacher.uid, 'bossBattles'), {
            battleName: battleTitle,
            bossImageUrl,
            videoUrl,
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
              <div className="space-y-4 p-6 border rounded-lg">
                 <h3 className="text-xl font-semibold">Battle Details</h3>
                <div className="space-y-2">
                    <Label htmlFor="battle-name" className="text-base">Boss Battle Title</Label>
                    <Input id="battle-name" placeholder="e.g., The Ancient Karkorah" value={battleTitle} onChange={(e) => setBattleTitle(e.target.value)} disabled={isSaving} />
                </div>
                 <div className="space-y-2 p-4 border rounded-md">
                    <Label className="text-base font-medium">Upload Boss Image</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="image-upload" className={cn(buttonVariants({ variant: 'default' }), "cursor-pointer")}>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </Label>
                      <Input id="image-upload" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} className="hidden" disabled={isUploading}/>
                      {imageFile && (
                          <>
                            <Button onClick={handleUploadImage} disabled={!imageFile || isUploading}>
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload Selected Image
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => setImageFile(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                          </>
                      )}
                    </div>
                     {imageFile && <p className="text-sm text-muted-foreground">Selected: {imageFile.name}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="video-url" className="text-base">Intro Video URL (YouTube, etc.)</Label>
                    <Input id="video-url" placeholder="https://www.youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={isSaving} />
                </div>
              </div>

              <Separator />

              <div className="space-y-4 p-6 border rounded-lg bg-secondary/30">
                 <h3 className="text-xl font-semibold flex items-center gap-2"><ImageIcon className="text-primary" /> Request an Image from the Court Artist</h3>
                 <div className="space-y-2">
                    <Label htmlFor="ai-image-prompt">Image Description</Label>
                    <Textarea id="ai-image-prompt" placeholder="e.g., A giant three-headed dragon made of crystal, fantasy art" value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)} disabled={isGeneratingImage} />
                 </div>
                 <Button onClick={handleGenerateImage} disabled={isGeneratingImage || !aiImagePrompt}>
                    {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Image
                 </Button>
                 {(isGeneratingImage || bossImageUrl) && (
                    <div className="pt-4">
                        <Label>Image Preview</Label>
                        <div className="mt-2 flex justify-center items-center p-4 border rounded-md bg-background h-64">
                            {isGeneratingImage ? (
                                <div className="text-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                                    <p className="text-muted-foreground">The Court Artist is Working on your Commission</p>
                                </div>
                            ) : bossImageUrl ? (
                                <NextImage src={bossImageUrl} alt="Generated Boss" width={250} height={250} className="rounded-lg object-contain h-full" />
                            ) : null}
                        </div>
                    </div>
                 )}
               </div>

              <div className="space-y-4 p-6 border rounded-lg bg-secondary/30">
                <h3 className="text-xl font-semibold flex items-center gap-2"><Sparkles className="text-primary" /> Generate Questions with the Oracle</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="ai-subject">Subject / Topic</Label>
                        <Input id="ai-subject" placeholder="e.g. Photosynthesis" value={aiSubject} onChange={(e) => setAiSubject(e.target.value)} disabled={isGeneratingQuestions} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ai-grade">Grade Level</Label>
                         <Select onValueChange={setAiGradeLevel} value={aiGradeLevel} disabled={isGeneratingQuestions}>
                            <SelectTrigger id="ai-grade"><SelectValue placeholder="Choose a grade..." /></SelectTrigger>
                            <SelectContent>{gradeLevels.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="ai-num-questions">Number of Questions (1-10)</Label>
                    <Input id="ai-num-questions" type="number" min="1" max="10" value={aiNumQuestions} onChange={(e) => setAiNumQuestions(e.target.value)} disabled={isGeneratingQuestions} />
                 </div>
                 <Button onClick={handleGenerateQuestions} disabled={isGeneratingQuestions}>
                    {isGeneratingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Consult the Oracle
                 </Button>
              </div>

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
                      <div>
                        <Label htmlFor={`q-text-${q.id}`} className="text-base font-semibold">Question {qIndex + 1}</Label>
                        <Textarea
                            id={`q-text-${q.id}`}
                            placeholder="What is the powerhouse of the cell?"
                            value={q.questionText}
                            onChange={(e) => handleQuestionChange(q.id, e.target.value)}
                            className="text-base mt-2"
                            disabled={isSaving}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`q-damage-${q.id}`} className="text-base">Damage for Incorrect Answer</Label>
                        <Input
                            id={`q-damage-${q.id}`}
                            type="number"
                            placeholder="e.g., 10"
                            value={q.damage}
                            onChange={(e) => handleDamageChange(q.id, e.target.value)}
                            className="mt-2"
                            disabled={isSaving}
                        />
                      </div>
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
