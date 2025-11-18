
'use client';

import { useState, useEffect } from 'react';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, PlusCircle, Trash2, Eye, GitBranch, Loader2, Save, Sparkles, Image as ImageIcon, Upload, X, Music, Library } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { MusicGallery } from '@/components/teacher/music-gallery';
import { generateQuestions } from '@/ai/flows/question-generator';
import { BossImageGallery } from '@/components/teacher/boss-image-gallery';


const gradeLevels = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

interface Question {
  id: number | string;
  questionText: string;
  answers: string[];
  correctAnswerIndex: number | null;
  damage: number;
  imageUrl?: string;
}

export default function EditBossBattlePage() {
  const router = useRouter();
  const params = useParams();
  const battleId = params.id as string;
  const { toast } = useToast();
  const [teacher, setTeacher] = useState<User | null>(null);

  const [battleTitle, setBattleTitle] = useState('');
  const [bossImageUrl, setBossImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isBossImageGalleryOpen, setIsBossImageGalleryOpen] = useState(false);

  // Music Upload State
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const [isMusicGalleryOpen, setIsMusicGalleryOpen] = useState(false);
  
  // State for question image uploads
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState<string | number | null>(null);


  // AI Question Generation State
  const [aiSubject, setAiSubject] = useState('');
  const [aiGradeLevel, setAiGradeLevel] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState<number | string>(5);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);


  // AI Image Generation State
  const [aiImagePrompt, setAiImagePrompt] = useState('');

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
    if (!battleId || !teacher) return;

    const fetchBattleData = async () => {
        setIsLoading(true);
        try {
            const battleRef = doc(db, 'teachers', teacher.uid, 'bossBattles', battleId);
            const battleSnap = await getDoc(battleRef);

            if (battleSnap.exists()) {
                const data = battleSnap.data();
                setBattleTitle(data.battleName || '');
                setBossImageUrl(data.bossImageUrl || '');
                setVideoUrl(data.videoUrl || '');
                setMusicUrl(data.musicUrl || '');
                setQuestions(data.questions.map((q: any, index: number) => ({
                    ...q,
                    id: uuidv4(),
                    damage: q.damage !== undefined ? q.damage : 1,
                    imageUrl: q.imageUrl || '',
                })));
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Not Found',
                    description: 'This battle could not be found. It may have been deleted.',
                });
                router.push('/teacher/battles');
            }
        } catch (error) {
            console.error("Error fetching battle data:", error);
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load battle data.',
            });
        } finally {
            setIsLoading(false);
        }
    }

    fetchBattleData();
  }, [battleId, router, toast, teacher]);
  
  const handleUploadImage = async () => {
    if (!imageFile || !teacher) {
        toast({ variant: 'destructive', title: 'No File Selected', description: 'Please choose an image file to upload.' });
        return;
    }
    setIsUploading(true);
    try {
        const storage = getStorage(app);
        const imageId = uuidv4();
        const storageRef = ref(storage, `boss-images/${teacher.uid}/${imageId}`);
        
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

    const handleUploadMusic = async () => {
        if (!musicFile || !teacher) {
            toast({ variant: 'destructive', title: 'No File Selected', description: 'Please choose an audio file to upload.' });
            return;
        }
        setIsUploadingMusic(true);
        try {
            const storage = getStorage(app);
            const musicId = uuidv4();
            const storageRef = ref(storage, `battle-music/${teacher.uid}/${musicId}`);
            
            await uploadBytes(storageRef, musicFile);
            const downloadUrl = await getDownloadURL(storageRef);

            setMusicUrl(downloadUrl);
            toast({ title: 'Upload Successful!', description: 'The battle music has been updated.' });
        } catch (error) {
            console.error("Error uploading music:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the music. Please try again.' });
        } finally {
            setIsUploadingMusic(false);
            setMusicFile(null);
        }
    };
    
    const handleQuestionImageUpload = async (questionId: string | number, file: File) => {
        if (!teacher) return;
        setUploadingQuestionImage(questionId);
        try {
            const storage = getStorage(app);
            const imageId = uuidv4();
            const storageRef = ref(storage, `battle-question-images/${teacher.uid}/${imageId}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            handleQuestionChange(questionId, 'imageUrl', downloadUrl);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the question image.' });
        } finally {
            setUploadingQuestionImage(null);
        }
    };


  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { id: uuidv4(), questionText: '', answers: ['', '', '', ''], correctAnswerIndex: null, damage: 1, imageUrl: '' },
    ]);
  };

  const handleRemoveQuestion = (id: number | string) => {
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

  const handleQuestionChange = (id: number | string, field: keyof Question, value: string | number) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleAnswerChange = (qId: number | string, aIndex: number, value: string) => {
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

  const handleCorrectAnswerChange = (qId: number | string, aIndex: number) => {
    setQuestions(
      questions.map((q) =>
        q.id === qId ? { ...q, correctAnswerIndex: aIndex } : q
      )
    );
  };
  
  const handleGenerateQuestions = async () => {
    if (!aiSubject || !aiGradeLevel || !aiNumQuestions) {
        toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide a subject, grade, and number of questions.' });
        return;
    }
    setIsGeneratingQuestions(true);
    try {
        const result = await generateQuestions({
            subject: aiSubject,
            gradeLevel: aiGradeLevel,
            numQuestions: Number(aiNumQuestions)
        });
        const newQuestions = result.questions.map(q => ({
            ...q,
            id: uuidv4(),
        }));
        
        // Check if the first question is empty, if so, replace it, otherwise append.
        if (questions.length === 1 && questions[0].questionText === '' && questions[0].answers.every(a => a === '')) {
             setQuestions(newQuestions);
        } else {
             setQuestions(prev => [...prev, ...newQuestions]);
        }
       
        toast({ title: 'Questions Generated!', description: `${newQuestions.length} questions have been added to the editor.` });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
    } finally {
        setIsGeneratingQuestions(false);
    }
  }


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

  const handleSaveChanges = async () => {
    if (!validateBattle() || !teacher) return;

    setIsSaving(true);
    const questionsToSave = questions.map(({ id, ...rest }) => rest);
    
    try {
        const battleRef = doc(db, 'teachers', teacher.uid, 'bossBattles', battleId);
        await setDoc(battleRef, {
            battleName: battleTitle,
            bossImageUrl,
            videoUrl,
            musicUrl,
            questions: questionsToSave,
        }, { merge: true });

        toast({
            title: 'Battle Updated Successfully!',
            description: 'Your changes have been saved.',
        });
        router.push('/teacher/battles');
    } catch (error) {
        console.error("Error updating boss battle:", error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not save the boss battle to the database. Please try again.',
        });
    } finally {
        setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
          <TeacherHeader />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
          </main>
        </div>
    )
  }

  return (
    <>
    <MusicGallery isOpen={isMusicGalleryOpen} onOpenChange={setIsMusicGalleryOpen} onMusicSelect={setMusicUrl} />
    <BossImageGallery isOpen={isBossImageGalleryOpen} onOpenChange={setIsBossImageGalleryOpen} onImageSelect={setBossImageUrl} />
    <div className="relative flex min-h-screen w-full flex-col">
       <div 
            className="fixed inset-0 -z-10 bg-cover bg-center" 
            style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-5c865a8c-e16c-4e32-b822-164b15894c5b.jpg?alt=media&token=11c25a8d-193a-44cf-bdfd-a752d57ccade')`, backgroundAttachment: 'fixed' }}
        />
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="outline" onClick={() => router.push('/teacher/battles')} className="mb-4 bg-background/80">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Battles
          </Button>
          <Card className="shadow-lg bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl">Edit Boss Battle</CardTitle>
              <CardDescription>
                Make changes to this battle. Your updates will be saved for future sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4 p-6 border rounded-lg bg-background/50">
                 <h3 className="text-xl font-semibold">Battle Details</h3>
                <div className="space-y-2">
                    <Label htmlFor="battle-name" className="text-base">Boss Battle Title</Label>
                    <Input id="battle-name" placeholder="e.g., The Ancient Karkorah" value={battleTitle} onChange={(e) => setBattleTitle(e.target.value)} disabled={isSaving} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="video-url" className="text-base">Intro Video URL (YouTube, etc.)</Label>
                    <Input id="video-url" placeholder="https://www.youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={isSaving} />
                </div>
              </div>

               <Separator />
               
               <div className="space-y-4 p-6 border rounded-lg bg-background/30">
                 <h3 className="text-xl font-semibold flex items-center gap-2"><ImageIcon className="text-primary" /> Boss Image</h3>
                  <div className="space-y-2 p-4 border rounded-md">
                    <Label className="text-base font-medium">Image Options</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="image-upload" className={cn(buttonVariants({ variant: 'default' }), "cursor-pointer")}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Custom Image
                      </Label>
                      <Input id="image-upload" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} className="hidden" disabled={isUploading}/>
                      <Button variant="outline" onClick={() => setIsBossImageGalleryOpen(true)}><Library className="mr-2 h-4 w-4"/> Choose From Library</Button>
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
                    <Label htmlFor="ai-image-prompt">Or, request an image from the Court Artist</Label>
                    <Textarea id="ai-image-prompt" placeholder="e.g., A giant three-headed dragon made of crystal, fantasy art" value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)} disabled />
                 </div>
                 <Button disabled>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Image
                 </Button>
                 {bossImageUrl && (
                    <div className="pt-4">
                        <Label>Current Boss Image</Label>
                        <div className="mt-2 flex justify-center items-center p-4 border rounded-md bg-background/50 h-64">
                            <img src={bossImageUrl} alt="Uploaded Boss" className="rounded-lg object-contain h-full" />
                        </div>
                    </div>
                 )}
               </div>

                <Separator />
                
                <div className="space-y-4 p-6 border rounded-lg bg-background/30">
                    <h3 className="text-xl font-semibold flex items-center gap-2"><Music className="text-primary" /> Battle Music</h3>
                    <div className="space-y-2 p-4 border rounded-md">
                        <Label className="text-base font-medium">Upload Music (.mp3, .wav)</Label>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="music-upload" className={cn(buttonVariants({ variant: 'default' }), "cursor-pointer")}>
                                <Upload className="mr-2 h-4 w-4" />
                                Choose File
                            </Label>
                            <Input id="music-upload" type="file" accept="audio/mpeg, audio/wav" onChange={(e) => setMusicFile(e.target.files ? e.target.files[0] : null)} className="hidden" disabled={isUploadingMusic}/>
                            {musicFile && (
                                <>
                                    <Button onClick={handleUploadMusic} disabled={!musicFile || isUploadingMusic}>
                                        {isUploadingMusic ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        Upload Music
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setMusicFile(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                        {musicFile && <p className="text-sm text-muted-foreground">Selected: {musicFile.name}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label>Or, select from the Music Library</Label>
                        <Button variant="outline" onClick={() => setIsMusicGalleryOpen(true)}>
                            <Library className="mr-2 h-4 w-4" />
                            Open Music Gallery
                        </Button>
                     </div>
                     {musicUrl && (
                        <div className="pt-4">
                            <Label>Current Music</Label>
                            <div className="mt-2 p-4 border rounded-md bg-background/50">
                                <audio src={musicUrl} controls className="w-full"></audio>
                            </div>
                        </div>
                     )}
                </div>


              <div className="space-y-4 p-6 border rounded-lg bg-background/30">
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
                    <Input id="ai-num-questions" type="number" min="1" max="10" value={aiNumQuestions} onChange={(e) => setAiNumQuestions(e.target.value)} disabled={isGeneratingQuestions}/>
                 </div>
                 <Button onClick={handleGenerateQuestions} disabled={isGeneratingQuestions || !aiSubject || !aiGradeLevel}>
                    {isGeneratingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                    Consult the Oracle
                 </Button>
              </div>

              <div className="space-y-6">
                 <h3 className="text-xl font-semibold">Questions</h3>
                {questions.map((q, qIndex) => (
                  <Card key={q.id} className="p-6 relative bg-background/80 shadow-md">
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
                            onChange={(e) => handleQuestionChange(q.id, 'questionText', e.target.value)}
                            className="text-base mt-2"
                            disabled={isSaving}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`q-image-url-${q.id}`} className="text-base">Image URL (Optional)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id={`q-image-url-${q.id}`}
                                placeholder="https://example.com/image.png"
                                value={q.imageUrl || ''}
                                onChange={(e) => handleQuestionChange(q.id, 'imageUrl', e.target.value)}
                                className="mt-2"
                                disabled={isSaving}
                            />
                            <Label htmlFor={`q-image-upload-${q.id}`} className={cn(buttonVariants({ variant: 'outline' }), "cursor-pointer")}>
                                <Upload className="h-4 w-4" />
                            </Label>
                             <Input 
                                id={`q-image-upload-${q.id}`}
                                type="file" 
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    if(e.target.files && e.target.files[0]){
                                        handleQuestionImageUpload(q.id, e.target.files[0])
                                    }
                                }}
                                disabled={uploadingQuestionImage === q.id}
                            />
                             {uploadingQuestionImage === q.id && <Loader2 className="h-5 w-5 animate-spin" />}
                        </div>
                        {q.imageUrl && <img src={q.imageUrl} alt="Question preview" width={100} height={100} className="rounded-md border mt-2" />}
                      </div>
                      <div>
                        <Label htmlFor={`q-damage-${q.id}`} className="text-base">Damage for Incorrect Answer</Label>
                        <Input
                            id={`q-damage-${q.id}`}
                            type="number"
                            placeholder="e.g., 1"
                            value={q.damage}
                            onChange={(e) => handleQuestionChange(q.id, 'damage', Number(e.target.value))}
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
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button size="lg" onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </>
  );
}
