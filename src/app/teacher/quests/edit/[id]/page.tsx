
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, Trash2, Eye, GitBranch, Loader2, Save, Sparkles, Image as ImageIcon, Upload, X, Music, Library, BookCopy, ArrowRight } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp, query, orderBy, where, updateDoc } from 'firebase/firestore';
import { db, auth, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestHub, Chapter, QuizQuestion, Quiz, LessonPart } from '@/lib/quests';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from '@/components/teacher/rich-text-editor';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { MapGallery } from '@/components/teacher/map-gallery';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { generateStory } from '@/ai/flows/story-generator';
import { generateQuestions } from '@/ai/flows/question-generator';
import { generateQuestionsFromText } from '@/ai/flows/generate-questions-from-text';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const gradeLevels = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

// A reusable component for the image upload fields
const ImageUploader = ({ label, imageUrl, onUploadSuccess, teacherUid, storagePath }: {
  label: string;
  imageUrl: string;
  onUploadSuccess: (url: string) => void;
  teacherUid: string;
  storagePath: string;
}) => {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async () => {
        if (!file || !teacherUid) {
            toast({ variant: 'destructive', title: 'No File Selected' });
            return;
        }
        setIsUploading(true);
        try {
            const storage = getStorage(app);
            const imageId = uuidv4();
            const fullStoragePath = `${storagePath}/${teacherUid}/${imageId}`;
            const storageRef = ref(storage, fullStoragePath);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            onUploadSuccess(downloadUrl);
            toast({ title: 'Upload Successful!', description: `${label} image has been updated.` });
        } catch (error) {
            console.error("Error uploading image:", error);
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
            setFile(null);
        }
    };

    return (
        <div className="space-y-2 p-3 border rounded-md">
            <Label className="text-base font-medium">{label}</Label>
            <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor={`upload-${label}`} className={cn(buttonVariants({ variant: 'outline' }), "cursor-pointer")}>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                </Label>
                <Input id={`upload-${label}`} type="file" accept="image/*" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="hidden" disabled={isUploading}/>
                
                {file && (
                    <>
                        <Button onClick={handleUpload} disabled={!file || isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Upload
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="h-4 w-4" /></Button>
                    </>
                )}
            </div>
            {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
            {imageUrl && (
                <div className="mt-2">
                    <Image src={imageUrl} alt={`${label} preview`} width={200} height={100} className="rounded-md object-contain border bg-secondary" />
                </div>
            )}
        </div>
    );
};


export default function EditQuestPage() {
  const router = useRouter();
  const params = useParams();
  const chapterId = params.id as string;
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teacher, setTeacher] = useState<User | null>(null);

  // State for AI generator
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  
  // AI Question Generation State
  const [aiSubject, setAiSubject] = useState('');
  const [aiGradeLevel, setAiGradeLevel] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState<number | string>(5);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  
  // State for Hubs
  const [hubs, setHubs] = useState<QuestHub[]>([]);
  const [chaptersInHub, setChaptersInHub] = useState<Chapter[]>([]);
  
  // State for the Chapter
  const [chapter, setChapter] = useState<Partial<Chapter> | null>(null);
  const [selectedHubId, setSelectedHubId] = useState('');
  const [chapterCoordinates, setChapterCoordinates] = useState({ x: 50, y: 50 });
  const [worldMapUrl, setWorldMapUrl] = useState('');

  // New Lesson Part State
  const [currentLessonPartIndex, setCurrentLessonPartIndex] = useState(0);

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

  // Fetch all hubs for the dropdown and teacher's world map
  useEffect(() => {
    if (!teacher) return;
    const fetchHubsAndMap = async () => {
        try {
            const hubsQuery = query(collection(db, 'teachers', teacher.uid, 'questHubs'), orderBy('hubOrder'));
            const hubsSnapshot = await getDocs(hubsQuery);
            const hubsData = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
            setHubs(hubsData);

            const teacherRef = doc(db, 'teachers', teacher.uid);
            const teacherSnap = await getDoc(teacherRef);
            if (teacherSnap.exists() && teacherSnap.data().worldMapUrl) {
                setWorldMapUrl(teacherSnap.data().worldMapUrl);
            }

        } catch (error) {
            console.error("Error fetching hubs/map: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch quest hubs.' });
        }
    };
    fetchHubsAndMap();
  }, [teacher, toast]);
  
  // Fetch the specific chapter data to edit
  useEffect(() => {
    if (!chapterId || !teacher) return;
    const fetchChapter = async () => {
        setIsLoading(true);
        try {
            const chapterRef = doc(db, 'teachers', teacher.uid, 'chapters', chapterId);
            const chapterSnap = await getDoc(chapterRef);

            if (chapterSnap.exists()) {
                const data = chapterSnap.data() as Chapter;
                // Migration for old structure
                if (data.lessonContent && (!data.lessonParts || data.lessonParts.length === 0)) {
                    data.lessonParts = [{ id: uuidv4(), content: data.lessonContent }];
                } else if (!data.lessonParts) {
                    data.lessonParts = [];
                }
                if (data.quiz && data.quiz.questions) {
                    data.quiz.questions = data.quiz.questions.map(q => ({
                        ...q,
                        questionType: q.questionType || 'single',
                        correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswerIndex],
                    }));
                }


                setChapter(data);
                setSelectedHubId(data.hubId);
                setChapterCoordinates(data.coordinates || { x: 50, y: 50 });
            } else {
                 toast({ variant: 'destructive', title: 'Not Found', description: 'This chapter could not be found.' });
                 router.push('/teacher/quests');
            }
        } catch (error) {
            console.error("Error fetching chapter:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load chapter data.' });
        } finally {
            setIsLoading(false);
        }
    }
    fetchChapter();
  }, [chapterId, router, toast, teacher]);
  
   // Fetch chapters for the currently selected hub
  useEffect(() => {
    if (!selectedHubId || !teacher) {
        setChaptersInHub([]);
        return;
    }
    const fetchChaptersForHub = async () => {
        const q = query(collection(db, 'teachers', teacher.uid, 'chapters'), where('hubId', '==', selectedHubId));
        const snapshot = await getDocs(q);
        const chaptersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
        chaptersData.sort((a, b) => a.chapterNumber - b.chapterNumber); // Sort client-side
        setChaptersInHub(chaptersData);
    };
    fetchChaptersForHub();
  }, [selectedHubId, teacher]);

  const handleMapDrag = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const map = e.currentTarget;
    const rect = map.getBoundingClientRect();

    const updatePosition = (moveEvent: MouseEvent) => {
        const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
        setChapterCoordinates({ x, y });
    };

    const stopDragging = () => {
        document.removeEventListener('mousemove', updatePosition);
        document.removeEventListener('mouseup', stopDragging);
    };

    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseup', stopDragging);
  };
  
  const selectedHub = hubs.find(h => h.id === selectedHubId);
  const hubMapUrl = selectedHub?.worldMapUrl;

  const handleFieldChange = (field: keyof Chapter, value: any) => {
      setChapter(prev => prev ? ({ ...prev, [field]: value }) : null);
  }
  
    const handleQuizChange = (field: keyof Quiz, value: any) => {
        setChapter(prev => {
            if (!prev) return null;
            const currentQuiz = prev.quiz || { questions: [], settings: { requirePassing: true, passingScore: 80 } };
            const updatedQuiz = { ...currentQuiz, [field]: value };
            return { ...prev, quiz: updatedQuiz as Quiz };
        });
    };

    const handleQuizQuestionChange = (id: string, field: 'text' | 'questionType', value: string) => {
        const updatedQuestions = chapter?.quiz?.questions.map(q => {
            if (q.id === id) {
                const updatedQ = { ...q, [field]: value };
                if (field === 'questionType') {
                    updatedQ.correctAnswer = [];
                }
                return updatedQ;
            }
            return q;
        }) || [];
        handleQuizChange('questions', updatedQuestions);
    };

    const handleQuizAnswerChange = (qId: string, aIndex: number, text: string) => {
        const updatedQuestions = chapter?.quiz?.questions.map(q => q.id === qId ? { ...q, answers: q.answers.map((a, i) => i === aIndex ? text : a) } : q) || [];
        handleQuizChange('questions', updatedQuestions);
    };
    
    const handleAddAnswerChoice = (qId: string) => {
        const updatedQuestions = chapter?.quiz?.questions.map(q => 
            q.id === qId ? { ...q, answers: [...q.answers, ''] } : q
        ) || [];
        handleQuizChange('questions', updatedQuestions);
    };

    const handleRemoveAnswerChoice = (qId: string, aIndex: number) => {
        const updatedQuestions = chapter?.quiz?.questions.map(q => {
            if (q.id === qId && q.answers.length > 2) {
                const newAnswers = q.answers.filter((_, i) => i !== aIndex);
                const newCorrectAnswer = q.correctAnswer.filter(i => i !== aIndex).map(i => i > aIndex ? i - 1 : i);
                return { ...q, answers: newAnswers, correctAnswer: newCorrectAnswer };
            }
            return q;
        }) || [];
        handleQuizChange('questions', updatedQuestions);
    };

    const handleCorrectQuizAnswerChange = (qId: string, aIndex: number) => {
        const updatedQuestions = chapter?.quiz?.questions.map(q => {
            if (q.id === qId) {
                if (q.questionType === 'single') {
                    return { ...q, correctAnswer: [aIndex] };
                } else {
                    const newCorrect = q.correctAnswer.includes(aIndex) 
                        ? q.correctAnswer.filter(i => i !== aIndex)
                        : [...q.correctAnswer, aIndex];
                    return { ...q, correctAnswer: newCorrect.sort((a,b) => a-b) };
                }
            }
            return q;
        }) || [];
        handleQuizChange('questions', updatedQuestions);
    };
    
    const handleAddQuizQuestion = () => {
        const newQuestion: QuizQuestion = { id: uuidv4(), text: '', answers: ['', '', '', ''], correctAnswer: [], questionType: 'single' };
        const updatedQuestions = [...(chapter?.quiz?.questions || []), newQuestion];
        handleQuizChange('questions', updatedQuestions);
    };

    const handleRemoveQuizQuestion = (id: string) => {
        const updatedQuestions = chapter?.quiz?.questions.filter(q => q.id !== id) || [];
        handleQuizChange('questions', updatedQuestions);
    };

  const handleGenerateStory = async () => {
    setIsGeneratingStory(true);
    try {
        const result = await generateStory();
        handleFieldChange('title', result.title);
        handleFieldChange('storyContent', result.storyContent);
        toast({ title: "Story Generated!", description: "The Oracle has provided a new tale for your heroes." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Generation Failed', description: 'The Oracle is silent. Please try again.' });
    } finally {
        setIsGeneratingStory(false);
    }
  }
  
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
        const newQuestions: QuizQuestion[] = result.questions.map(q => ({
            id: uuidv4(),
            text: q.questionText,
            answers: q.answers,
            correctAnswer: [q.correctAnswerIndex],
            questionType: 'single'
        }));
        
        handleQuizChange('questions', [...(chapter?.quiz?.questions || []), ...newQuestions]);
        toast({ title: 'Questions Generated!', description: `${newQuestions.length} questions have been added to the quiz.` });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
    } finally {
        setIsGeneratingQuestions(false);
    }
  }

  const handleGenerateQuestionsFromText = async () => {
        if (!aiNumQuestions) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please enter the number of questions to generate.' });
            return;
        }
        const lessonText = chapter?.lessonParts?.map(part => part.content).join('\n\n') || '';
        if (!lessonText.trim()) {
             toast({ variant: 'destructive', title: 'No Content', description: 'There is no lesson content to generate questions from.' });
            return;
        }
        setIsGeneratingQuestions(true);
         try {
            const result = await generateQuestionsFromText({
                lessonContent: lessonText,
                numQuestions: Number(aiNumQuestions),
            });
            const newQuestions: QuizQuestion[] = result.questions.map(q => ({
                id: uuidv4(),
                text: q.questionText,
                answers: q.answers,
                correctAnswer: [q.correctAnswerIndex],
                questionType: 'single'
            }));
            
            handleQuizChange('questions', [...(chapter?.quiz?.questions || []), ...newQuestions]);
            toast({ title: 'Questions Generated!', description: `${newQuestions.length} questions have been generated from your lesson.` });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
        } finally {
            setIsGeneratingQuestions(false);
        }
    }

  const validateInputs = () => {
    if (!selectedHubId) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'A Hub must be selected.' });
        return false;
    }
     if (!chapter?.title || chapter?.chapterNumber === undefined || chapter.chapterNumber === null) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out required chapter fields: Title and Number.' });
        return false;
    }
    return true;
  }
  
  const handleSaveChanges = async () => {
    if (!validateInputs() || !chapter || !teacher) return;
    setIsSaving(true);
    
    const chapterToSave = { ...chapter };
    delete chapterToSave.lessonContent; // Remove deprecated field

    // Clean up quiz data before saving
    if (chapterToSave.quiz && chapterToSave.quiz.questions) {
        chapterToSave.quiz.questions = chapterToSave.quiz.questions.map(q => {
            // Ensure correctAnswer is an array
            const correctAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswerIndex];
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { correctAnswerIndex, ...rest } = q; // Remove old index
            return { ...rest, correctAnswer };
        });
    } else {
        delete chapterToSave.quiz;
    }

    try {
        const chapterRef = doc(db, 'teachers', teacher.uid, 'chapters', chapterId);
        await setDoc(chapterRef, {
            ...chapterToSave,
            hubId: selectedHubId,
            coordinates: chapterCoordinates,
        }, { merge: true });
        
        toast({
            title: 'Quest Updated!',
            description: 'The chapter has been saved successfully.',
        });
        
        router.push('/teacher/quests');

    } catch (error) {
        console.error("Error saving quest:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'There was an error saving your quest. Please try again.' });
    } finally {
        setIsSaving(false);
    }
  }
  
  const handleLessonPartChange = (index: number, content: string) => {
    const newParts = [...(chapter?.lessonParts || [])];
    newParts[index] = { ...newParts[index], content };
    handleFieldChange('lessonParts', newParts);
  };

  const handleAddLessonPart = () => {
    const newPart: LessonPart = { id: uuidv4(), content: '' };
    const newParts = [...(chapter?.lessonParts || []), newPart];
    handleFieldChange('lessonParts', newParts);
    setCurrentLessonPartIndex(newParts.length - 1);
  };

  const handleDeleteLessonPart = (index: number) => {
    if (chapter?.lessonParts && chapter.lessonParts.length > 1) {
        const newParts = chapter.lessonParts.filter((_, i) => i !== index);
        handleFieldChange('lessonParts', newParts);
        setCurrentLessonPartIndex(Math.max(0, index - 1));
    } else {
        toast({ variant: 'destructive', title: 'Cannot Delete', description: 'A lesson must have at least one part.' });
    }
  };


  if (isLoading || !chapter || !teacher) {
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
  
  const hasQuizQuestions = (chapter?.quiz?.questions?.length || 0) > 0;
  const currentLessonPart = chapter?.lessonParts?.[currentLessonPartIndex];

  return (
    <div className="relative flex min-h-screen w-full flex-col">
        {worldMapUrl && (
            <div 
              className="absolute inset-0 -z-10"
              style={{
                  backgroundImage: `url('${worldMapUrl}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.5,
              }}
            />
        )}
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="outline" onClick={() => router.push('/teacher/quests')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Quests
          </Button>
          <Card className="shadow-lg bg-card/90">
            <CardHeader>
              <CardTitle className="text-3xl">Edit Quest</CardTitle>
              <CardDescription>
                Make changes to this chapter and its content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              <div className="space-y-4 p-6 border rounded-lg">
                <h3 className="text-xl font-semibold">Quest Hub</h3>
                <div>
                    <Label htmlFor="hub-select">Select Chapter's Hub</Label>
                    <Select onValueChange={setSelectedHubId} value={selectedHubId} disabled={isSaving}>
                        <SelectTrigger id="hub-select">
                            <SelectValue placeholder="Choose a Hub..." />
                        </SelectTrigger>
                        <SelectContent>
                            {hubs.map(hub => (
                                <SelectItem key={hub.id} value={hub.id}>{hub.name} (Order: {hub.hubOrder})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              </div>
              
              <div className="space-y-6 p-6 border rounded-lg">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Chapter Content</h3>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="outline" disabled={isGeneratingStory}>
                                {isGeneratingStory ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Story
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will replace any existing content in the Chapter Title and Story Content fields with a new, AI-generated story. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleGenerateStory}>
                                    {isGeneratingStory ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Generate Story"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                <Tabs defaultValue="story" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="story">Story</TabsTrigger>
                        <TabsTrigger value="lesson">Lesson</TabsTrigger>
                         <TabsTrigger value="quiz">Quiz</TabsTrigger>
                    </TabsList>
                    <TabsContent value="story" className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="chapter-title">Chapter Title</Label>
                                <Input id="chapter-title" placeholder="e.g., A Summons from the Throne" value={chapter.title || ''} onChange={e => handleFieldChange('title', e.target.value)} disabled={isSaving} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="chapter-number">Chapter Number</Label>
                                <Input id="chapter-number" type="number" placeholder="e.g., 1" value={chapter.chapterNumber ?? ''} onChange={e => handleFieldChange('chapterNumber', e.target.value === '' ? '' : Number(e.target.value))} disabled={isSaving} />
                            </div>
                        </div>
                        <ImageUploader label="Main Story Image" imageUrl={chapter.mainImageUrl || ''} onUploadSuccess={(url) => handleFieldChange('mainImageUrl', url)} teacherUid={teacher.uid} storagePath="quest-images" />
                        <div className="space-y-2">
                            <Label htmlFor="story-content">Story Content</Label>
                            <RichTextEditor value={chapter.storyContent || ''} onChange={value => handleFieldChange('storyContent', value)} />
                        </div>
                        <ImageUploader label="Decorative Image 1" imageUrl={chapter.decorativeImageUrl1 || ''} onUploadSuccess={(url) => handleFieldChange('decorativeImageUrl1', url)} teacherUid={teacher.uid} storagePath="quest-images" />
                        <div className="space-y-2">
                            <Label htmlFor="story-additional-content">Additional Story Content</Label>
                             <RichTextEditor value={chapter.storyAdditionalContent || ''} onChange={value => handleFieldChange('storyAdditionalContent', value)} />
                        </div>
                        <ImageUploader label="Decorative Image 2" imageUrl={chapter.decorativeImageUrl2 || ''} onUploadSuccess={(url) => handleFieldChange('decorativeImageUrl2', url)} teacherUid={teacher.uid} storagePath="quest-images" />
                        <div className="space-y-2">
                            <Label htmlFor="video-url">YouTube Video URL</Label>
                            <Input id="video-url" placeholder="https://youtube.com/watch?v=..." value={chapter.videoUrl || ''} onChange={e => handleFieldChange('videoUrl', e.target.value)} disabled={isSaving} />
                        </div>
                        {hubMapUrl && (
                            <div className="pt-4 space-y-2">
                                <Label>Position Chapter on Hub Map</Label>
                                <div 
                                    className="relative aspect-[2048/1152] rounded-lg overflow-hidden bg-muted/50 border cursor-grab"
                                    onMouseDown={(e) => handleMapDrag(e)}
                                >
                                    <Image
                                        src={hubMapUrl}
                                        alt="Hub Map for Placement"
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                    <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                                        {chaptersInHub.map((c, index) => {
                                             if (c.id === chapterId) return null;
                                             const nextChapter = chaptersInHub.find(nextC => nextC.chapterNumber === c.chapterNumber + 1);
                                             if (nextChapter && nextChapter.id !== chapterId) {
                                                return (
                                                    <line key={`line-${c.id}`} x1={`${c.coordinates.x}%`} y1={`${c.coordinates.y}%`} x2={`${nextChapter.coordinates.x}%`} y2={`${nextChapter.coordinates.y}%`} stroke="#10B981" strokeWidth="3" />
                                                )
                                             }
                                             return null;
                                        })}
                                    </svg>
                                    {chaptersInHub.map(c => {
                                        if (c.id === chapterId) return null;
                                        return (
                                            <div key={c.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${c.coordinates.x}%`, top: `${c.coordinates.y}%`}}>
                                                <div className="w-5 h-5 bg-green-500 rounded-full ring-2 ring-white shadow-xl"></div>
                                            </div>
                                        )
                                    })}
                                    <div
                                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grabbing"
                                        style={{
                                            left: `${chapterCoordinates.x}%`,
                                            top: `${chapterCoordinates.y}%`,
                                        }}
                                    >
                                        <div className="w-5 h-5 bg-yellow-400 rounded-full ring-2 ring-white shadow-xl animate-pulse-glow"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="lesson" className="mt-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold">Lesson Parts</h3>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleAddLessonPart}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Part
                                </Button>
                                {chapter.lessonParts && chapter.lessonParts.length > 1 && (
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteLessonPart(currentLessonPartIndex)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Current Part
                                    </Button>
                                )}
                            </div>
                        </div>
                        {currentLessonPart ? (
                             <div className="p-4 border rounded-md bg-background/50 space-y-4">
                                <RichTextEditor
                                    value={currentLessonPart.content}
                                    onChange={(content) => handleLessonPartChange(currentLessonPartIndex, content)}
                                />
                                <div className="flex justify-between items-center mt-4">
                                    <Button onClick={() => setCurrentLessonPartIndex(p => p - 1)} disabled={currentLessonPartIndex === 0}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                                    </Button>
                                    <span className="text-sm font-semibold text-muted-foreground">
                                        Part {currentLessonPartIndex + 1} of {chapter.lessonParts?.length || 0}
                                    </span>
                                    <Button onClick={() => setCurrentLessonPartIndex(p => p + 1)} disabled={currentLessonPartIndex === (chapter.lessonParts?.length || 0) - 1}>
                                        Next <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                             <div className="text-center p-8 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">This lesson has no content parts yet.</p>
                                <Button onClick={handleAddLessonPart} className="mt-4">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add the First Part
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="quiz" className="mt-6 space-y-6">
                        <div className="space-y-4 p-6 border rounded-lg bg-background/30">
                            <h3 className="text-xl font-semibold flex items-center gap-2"><Sparkles className="text-primary" /> Generate Questions with the Oracle</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ai-subject">Subject / Topic (for general questions)</Label>
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
                            <div className="flex gap-2">
                                <Button onClick={handleGenerateQuestions} disabled={isGeneratingQuestions || !aiSubject || !aiGradeLevel}>
                                    {isGeneratingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Generate by Subject
                                </Button>
                                <Button onClick={handleGenerateQuestionsFromText} variant="secondary" disabled={isGeneratingQuestions || !aiNumQuestions}>
                                    {isGeneratingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BookCopy className="mr-2 h-4 w-4" />}
                                    Generate From Lesson
                                </Button>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold">Quiz Editor</h3>
                        <div className="p-4 border rounded-md space-y-4">
                           <div className="flex items-center space-x-2">
                                <Switch 
                                    id="require-passing" 
                                    checked={chapter.quiz?.settings?.requirePassing ?? true} 
                                    onCheckedChange={checked => handleQuizChange('settings', { ...(chapter.quiz?.settings || { requirePassing: true, passingScore: 80 }), requirePassing: checked })}
                                    disabled={!hasQuizQuestions}
                                />
                                <Label htmlFor="require-passing" className={cn(!hasQuizQuestions && "text-muted-foreground")}>Require Minimum Score to Advance</Label>
                            </div>
                            {(chapter.quiz?.settings?.requirePassing ?? true) && (
                                <div className="space-y-2 animate-in fade-in-50">
                                    <Label htmlFor="passing-score" className={cn(!hasQuizQuestions && "text-muted-foreground")}>Passing Score (%)</Label>
                                    <Input 
                                        id="passing-score" 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        value={chapter.quiz?.settings?.passingScore ?? 80} 
                                        onChange={(e) => handleQuizChange('settings', { ...(chapter.quiz?.settings || { requirePassing: true, passingScore: 80 }), passingScore: Number(e.target.value)})} 
                                        disabled={!hasQuizQuestions}
                                    />
                                </div>
                            )}
                        </div>
                        {(chapter.quiz?.questions || []).map((q, qIndex) => (
                            <Card key={q.id} className="p-4 bg-secondary/50">
                                <div className="flex justify-between items-center mb-2">
                                    <Label className="font-semibold">Question {qIndex + 1}</Label>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveQuizQuestion(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                                <div className="space-y-2">
                                    <Textarea placeholder="Question text" value={q.text} onChange={e => handleQuizQuestionChange(q.id, 'text', e.target.value)} />
                                    <Select value={q.questionType} onValueChange={(value) => handleQuizQuestionChange(q.id, 'questionType', value)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="single">Single Choice (Radio Buttons)</SelectItem>
                                            <SelectItem value="multiple">Multiple Choice (Checkboxes)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    
                                    <div className="space-y-2 pt-2">
                                        <Label>Answers (Select correct one(s))</Label>
                                        {q.answers.map((ans, aIndex) => (
                                            <div key={aIndex} className="flex items-center gap-2">
                                                {q.questionType === 'single' ? (
                                                    <RadioGroup value={String(q.correctAnswer[0])} onValueChange={value => handleCorrectQuizAnswerChange(q.id, Number(value))} className="flex items-center">
                                                        <RadioGroupItem value={String(aIndex)} id={`q${q.id}-a${aIndex}`} />
                                                    </RadioGroup>
                                                ) : (
                                                    <Checkbox id={`q${q.id}-a${aIndex}`} checked={q.correctAnswer.includes(aIndex)} onCheckedChange={() => handleCorrectQuizAnswerChange(q.id, aIndex)} />
                                                )}
                                                <Input placeholder={`Answer ${aIndex + 1}`} value={ans} onChange={e => handleQuizAnswerChange(q.id, aIndex, e.target.value)} />
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveAnswerChoice(q.id, aIndex)} disabled={q.answers.length <= 2}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                     <Button variant="outline" size="sm" onClick={() => handleAddAnswerChoice(q.id)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Answer Choice
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        <Button variant="outline" onClick={handleAddQuizQuestion}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                        </Button>
                      </TabsContent>
                      </Tabs>
                  </div>
              

              <div className="flex justify-end pt-4 border-t">
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
  );
}
