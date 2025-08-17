
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save, Sparkles, Upload, X } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp, query, orderBy, where, updateDoc } from 'firebase/firestore';
import { db, auth, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestHub, Chapter } from '@/lib/quests';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from '@/components/teacher/rich-text-editor';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateStory, generateSummary, type StoryGeneratorInput } from '@/ai/flows/story-generator';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

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
            <div className="flex items-center gap-2">
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
  const [isOracleOpen, setIsOracleOpen] = useState(false);
  const [oracleMode, setOracleMode] = useState<'standalone' | 'saga' | null>(null);
  const [oracleGradeLevel, setOracleGradeLevel] = useState('');
  const [oraclePredecessorHub, setOraclePredecessorHub] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirmStandaloneOpen, setIsConfirmStandaloneOpen] = useState(false);

  // State for Hubs
  const [hubs, setHubs] = useState<QuestHub[]>([]);
  
  // State for the Chapter
  const [chapter, setChapter] = useState<Partial<Chapter> | null>(null);
  const [selectedHubId, setSelectedHubId] = useState('');
  const [chapterCoordinates, setChapterCoordinates] = useState({ x: 50, y: 50 });

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

  // Fetch all hubs for the dropdown
  useEffect(() => {
    if (!teacher) return;
    const fetchHubs = async () => {
        try {
            const hubsQuery = query(collection(db, 'teachers', teacher.uid, 'questHubs'), orderBy('hubOrder'));
            const hubsSnapshot = await getDocs(hubsQuery);
            const hubsData = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
            setHubs(hubsData);
        } catch (error) {
            console.error("Error fetching hubs: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch quest hubs.' });
        }
    };
    fetchHubs();
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

  const validateInputs = () => {
    if (!selectedHubId) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'A Hub must be selected.' });
        return false;
    }
     if (!chapter?.title || chapter?.chapterNumber === undefined || chapter.chapterNumber === null || !chapter?.storyContent || !chapter?.lessonContent) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out all required chapter fields: Title, Number, Story Content, and Lesson Content.' });
        return false;
    }
    return true;
  }
  
  const handleOracleGenerate = async () => {
    if (!oracleGradeLevel || !oracleMode || !teacher) {
        toast({ variant: 'destructive', title: "The Oracle's Query is Incomplete", description: 'Please provide all required elements for the Oracle.' });
        return;
    }
    
    setIsGenerating(true);

    try {
        let previousHubSummary: string | undefined;
        let currentHubSummary: string | undefined;
        let previousChapterStory: string | undefined;

        if (oracleMode === 'saga') {
            if (oraclePredecessorHub && oraclePredecessorHub !== 'none') {
                const hubRef = doc(db, 'teachers', teacher.uid, 'questHubs', oraclePredecessorHub);
                const hubSnap = await getDoc(hubRef);
                if (hubSnap.exists()) {
                    previousHubSummary = hubSnap.data().storySummary;
                }
            }
            if (selectedHubId) {
                 const currentHubRef = doc(db, 'teachers', teacher.uid, 'questHubs', selectedHubId);
                 const currentHubSnap = await getDoc(currentHubRef);
                 if (currentHubSnap.exists()) {
                    currentHubSummary = currentHubSnap.data().storySummary;
                 }
            }
            if (selectedHubId && typeof chapter?.chapterNumber === 'number' && chapter.chapterNumber > 1) {
                const prevChapterQuery = query(
                    collection(db, 'teachers', teacher.uid, 'chapters'),
                    where('hubId', '==', selectedHubId),
                    where('chapterNumber', '==', chapter.chapterNumber - 1)
                );
                const prevChapterSnap = await getDocs(prevChapterQuery);
                if (!prevChapterSnap.empty) {
                    previousChapterStory = prevChapterSnap.docs[0].data().storyContent;
                }
            }
        }
        
        const input: StoryGeneratorInput = {
            gradeLevel: oracleGradeLevel as any,
            mode: oracleMode,
            previousHubSummary,
            currentHubSummary,
            previousChapterStory,
        };
        
        const result = await generateStory(input);
        
        handleFieldChange('title', result.title);
        handleFieldChange('storyContent', result.storyContent);

        if (oracleMode === 'saga' && selectedHubId) {
            const newSummary = await generateSummary(currentHubSummary, result.storyContent);
            const hubRef = doc(db, 'teachers', teacher.uid, 'questHubs', selectedHubId);
            await updateDoc(hubRef, { storySummary: newSummary });
        }

        toast({ title: 'The Oracle has Spoken!', description: 'The chapter title and story have been divined.' });
        setIsOracleOpen(false);
        setOracleMode(null);

    } catch (error) {
        console.error("Error generating story from Oracle:", error);
        toast({ variant: 'destructive', title: 'The Oracle is Silent', description: 'The AI failed to generate a story.' });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!validateInputs() || !chapter || !teacher) return;
    setIsSaving(true);
    
    try {
        const chapterRef = doc(db, 'teachers', teacher.uid, 'chapters', chapterId);
        await setDoc(chapterRef, {
            ...chapter,
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
  
  const renderOracleDialog = () => {
    if (!oracleMode) {
        return (
            <>
            <AlertDialogHeader>
                <AlertDialogTitle>The Oracle Awaits Your Query</AlertDialogTitle>
                <AlertDialogDescription>
                    How shall the Oracle weave its tale?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <Button variant="outline" onClick={() => setOracleMode('standalone')}>Create a Standalone Story</Button>
                <Button onClick={() => setOracleMode('saga')}>
                  {chapter?.chapterNumber === 1 ? 'Begin the Saga' : 'Continue the Saga'}
                </Button>
            </div>
             <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setOracleMode(null)}>Return to my own thoughts</AlertDialogCancel>
            </AlertDialogFooter>
            </>
        )
    }

    if (oracleMode === 'standalone') {
        return (
             <>
            <AlertDialogHeader>
                <AlertDialogTitle>A Standalone Tale</AlertDialogTitle>
                 <AlertDialogDescription>
                    Provide the Oracle with the grade level for a self-contained story. The Oracle will generate an appropriate title and story.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
                 <div className="space-y-2">
                    <Label>Grade Level</Label>
                    <Select onValueChange={setOracleGradeLevel} value={oracleGradeLevel}>
                        <SelectTrigger><SelectValue placeholder="For which students?" /></SelectTrigger>
                        <SelectContent>{['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
            </div>
            <AlertDialogFooter>
                <Button variant="ghost" onClick={() => setOracleMode(null)}>Back</Button>
                <AlertDialogAction onClick={() => { setIsOracleOpen(false); setIsConfirmStandaloneOpen(true); }} disabled={isGenerating || !oracleGradeLevel}>
                    Write a Standalone Chapter
                </AlertDialogAction>
            </AlertDialogFooter>
            </>
        )
    }
    
     if (oracleMode === 'saga') {
        return (
             <>
            <AlertDialogHeader>
                <AlertDialogTitle>Weave a Continuous Saga</AlertDialogTitle>
                 <AlertDialogDescription>
                    The Oracle will consult its records of the past to write the next chapter.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Grade Level</Label>
                     <Select onValueChange={setOracleGradeLevel} value={oracleGradeLevel}>
                        <SelectTrigger><SelectValue placeholder="For which students?" /></SelectTrigger>
                        <SelectContent>{['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
                  <div className="space-y-2">
                    <Label>Is this the first chapter of a sequel to a previous Hub? (Optional)</Label>
                     <Select onValueChange={setOraclePredecessorHub} value={oraclePredecessorHub}>
                        <SelectTrigger><SelectValue placeholder="Select previous hub..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {hubs.map(hub => <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
            <AlertDialogFooter>
                <Button variant="ghost" onClick={() => setOracleMode(null)} disabled={isGenerating}>Back</Button>
                <AlertDialogAction onClick={handleOracleGenerate} disabled={isGenerating || !oracleGradeLevel || !selectedHubId}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {chapter?.chapterNumber === 1 ? 'Begin the Saga' : 'Continue the Saga'}
                </AlertDialogAction>
            </AlertDialogFooter>
            </>
        )
    }
  }

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

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="outline" onClick={() => router.push('/teacher/quests')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Quests
          </Button>
          <Card className="shadow-lg">
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
                    <Button variant="outline" onClick={() => setIsOracleOpen(true)} disabled={isSaving}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Consult the Oracle
                    </Button>
                </div>
                <Tabs defaultValue="story" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="story">Story</TabsTrigger>
                        <TabsTrigger value="lesson">Lesson</TabsTrigger>
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
                        <div className="space-y-2">
                            <Label htmlFor="story-content">Story Content</Label>
                            <RichTextEditor value={chapter.storyContent || ''} onChange={value => handleFieldChange('storyContent', value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="story-additional-content">Additional Story Content</Label>
                             <RichTextEditor value={chapter.storyAdditionalContent || ''} onChange={value => handleFieldChange('storyAdditionalContent', value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="video-url">YouTube Video URL</Label>
                            <Input id="video-url" placeholder="https://youtube.com/watch?v=..." value={chapter.videoUrl || ''} onChange={e => handleFieldChange('videoUrl', e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <ImageUploader label="Main Story Image" imageUrl={chapter.mainImageUrl || ''} onUploadSuccess={(url) => handleFieldChange('mainImageUrl', url)} teacherUid={teacher.uid} storagePath="quest-images" />
                             <ImageUploader label="Decorative Image 1" imageUrl={chapter.decorativeImageUrl1 || ''} onUploadSuccess={(url) => handleFieldChange('decorativeImageUrl1', url)} teacherUid={teacher.uid} storagePath="quest-images" />
                             <ImageUploader label="Decorative Image 2" imageUrl={chapter.decorativeImageUrl2 || ''} onUploadSuccess={(url) => handleFieldChange('decorativeImageUrl2', url)} teacherUid={teacher.uid} storagePath="quest-images" />
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
                        <div className="space-y-2">
                            <Label htmlFor="lesson-content">Lesson Content</Label>
                            <RichTextEditor value={chapter.lessonContent || ''} onChange={value => handleFieldChange('lessonContent', value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="lesson-additional-content">Additional Lesson Content</Label>
                            <RichTextEditor value={chapter.lessonAdditionalContent || ''} onChange={value => handleFieldChange('lessonAdditionalContent', value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lesson-video-url">Lesson YouTube Video URL</Label>
                            <Input id="lesson-video-url" placeholder="https://youtube.com/watch?v=..." value={chapter.lessonVideoUrl || ''} onChange={e => handleFieldChange('lessonVideoUrl', e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageUploader label="Main Lesson Image" imageUrl={chapter.lessonMainImageUrl || ''} onUploadSuccess={(url) => handleFieldChange('lessonMainImageUrl', url)} teacherUid={teacher.uid} storagePath="quest-images" />
                            <ImageUploader label="Lesson Decorative Image 1" imageUrl={chapter.lessonDecorativeImageUrl1 || ''} onUploadSuccess={(url) => handleFieldChange('lessonDecorativeImageUrl1', url)} teacherUid={teacher.uid} storagePath="quest-images" />
                            <ImageUploader label="Lesson Decorative Image 2" imageUrl={chapter.lessonDecorativeImageUrl2 || ''} onUploadSuccess={(url) => handleFieldChange('lessonDecorativeImageUrl2', url)} teacherUid={teacher.uid} storagePath="quest-images" />
                        </div>
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
        <AlertDialog open={isOracleOpen} onOpenChange={setIsOracleOpen}>
            <AlertDialogContent>
                {renderOracleDialog()}
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isConfirmStandaloneOpen} onOpenChange={setIsConfirmStandaloneOpen}>
            <AlertDialogContent>
                 <AlertDialogHeader>
                    <AlertDialogTitle>A Word of Caution from the Oracle</AlertDialogTitle>
                    <AlertDialogDescription>
                         The Oracle prepares to tell a self-contained story, unbound by the past or future. Such tales are best kept in a dedicated tome.
                         <br/><br/>
                         For best organization, please create such chapters in a Hub named 'Independent Chapters'.
                         <strong>Are you in a Quest Hub named 'Independent Chapters'?</strong>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {setIsOracleOpen(true)}}>No, I must prepare</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {setIsConfirmStandaloneOpen(false); handleOracleGenerate()}}>
                        Yes, the tome is open
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
