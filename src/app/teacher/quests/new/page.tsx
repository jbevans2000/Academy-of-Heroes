
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save, Sparkles, Upload, X, Library, Trash2, PlusCircle } from 'lucide-react';
import { doc, setDoc, addDoc, collection, getDocs, serverTimestamp, query, orderBy, where, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestHub, Chapter, QuizQuestion, Quiz } from '@/lib/quests';
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
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { MapGallery } from '@/components/teacher/map-gallery';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

// A reusable component for the image upload fields
const ImageUploader = ({ label, imageUrl, onUploadSuccess, teacherUid, storagePath, onGalleryOpen }: {
  label: string;
  imageUrl: string;
  onUploadSuccess: (url: string) => void;
  teacherUid: string;
  storagePath: string;
  onGalleryOpen?: () => void;
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
                {onGalleryOpen && (
                    <Button variant="outline" onClick={onGalleryOpen}>
                        <Library className="mr-2 h-4 w-4" /> Choose From Library
                    </Button>
                )}
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


function NewQuestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const defaultWorldMap = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FWorld%20Map.JPG?alt=media&token=2d88af7d-a54c-4f34-b4c7-1a7c04485b8b";
  const [teacher, setTeacher] = useState<User | null>(null);
  const [teacherWorldMapUrl, setTeacherWorldMapUrl] = useState(defaultWorldMap);
  const [isHubOnlyMode, setIsHubOnlyMode] = useState(false);

  // State for AI generator
  const [isOracleOpen, setIsOracleOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // State for the new Hub creator
  const [hubs, setHubs] = useState<QuestHub[]>([]);
  const [chaptersInHub, setChaptersInHub] = useState<Chapter[]>([]);
  const [selectedHubId, setSelectedHubId] = useState('');
  const [newHubName, setNewHubName] = useState('');
  const [newHubMapUrl, setNewHubMapUrl] = useState('');
  const [newHubOrder, setNewHubOrder] = useState<number>(1);
  const [hubCoordinates, setHubCoordinates] = useState({ x: 50, y: 50 });

  // State for the new Chapter creator
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState<number | ''>('');
  const [storyContent, setStoryContent] = useState('');
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [decorativeImageUrl1, setDecorativeImageUrl1] = useState('');
  const [decorativeImageUrl2, setDecorativeImageUrl2] = useState('');
  const [storyAdditionalContent, setStoryAdditionalContent] = useState('');
  
  const [lessonContent, setLessonContent] = useState('');
  const [lessonMainImageUrl, setLessonMainImageUrl] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonDecorativeImageUrl1, setLessonDecorativeImageUrl1] = useState('');
  const [lessonDecorativeImageUrl2, setLessonDecorativeImageUrl2] = useState('');
  const [lessonAdditionalContent, setLessonAdditionalContent] = useState('');
  
  const [chapterCoordinates, setChapterCoordinates] = useState({ x: 50, y: 50 });
  
  // State for the Quiz
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [requirePassing, setRequirePassing] = useState(true);
  const [passingScore, setPassingScore] = useState(80);


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
    if (!teacher) return;
    setIsHubOnlyMode(searchParams.get('hubOnly') === 'true');
    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            // Fetch Hubs
            const hubsQuery = query(collection(db, 'teachers', teacher.uid, 'questHubs'), orderBy('hubOrder'));
            const hubsSnapshot = await getDocs(hubsQuery);
            const hubsData = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
            setHubs(hubsData);
            setNewHubOrder(hubsData.length + 1);

            // Fetch Teacher's custom world map
            const teacherRef = doc(db, 'teachers', teacher.uid);
            const teacherSnap = await getDoc(teacherRef);
            if (teacherSnap.exists() && teacherSnap.data().worldMapUrl) {
                setTeacherWorldMapUrl(teacherSnap.data().worldMapUrl);
            }

            // Check for hubId from query params to pre-select it
            const preselectedHubId = searchParams.get('hubId');
            if (preselectedHubId) {
                setSelectedHubId(preselectedHubId);
            }

        } catch (error) {
            console.error("Error fetching initial data: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch initial quest data.' });
        } finally {
            setIsLoading(false);
        }
    };
    fetchInitialData();
  }, [teacher, toast, searchParams]);

  useEffect(() => {
    if (!selectedHubId || selectedHubId === 'new' || !teacher) {
      setChaptersInHub([]);
      return;
    }
    const fetchChaptersForHub = async () => {
        const q = query(collection(db, 'teachers', teacher.uid, 'chapters'), where('hubId', '==', selectedHubId));
        const snapshot = await getDocs(q);
        const chaptersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
        chaptersData.sort((a, b) => a.chapterNumber - b.chapterNumber); // Sort client-side
        setChaptersInHub(chaptersData);
        setChapterNumber(chaptersData.length + 1);
    };
    fetchChaptersForHub();
  }, [selectedHubId, teacher]);
  
  const handleMapDrag = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, type: 'hub' | 'chapter') => {
    const map = e.currentTarget;
    const rect = map.getBoundingClientRect();

    const updatePosition = (moveEvent: MouseEvent) => {
        const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
        
        if (type === 'hub') {
            setHubCoordinates({ x, y });
        } else {
            setChapterCoordinates({ x, y });
        }
    };

    const stopDragging = () => {
        document.removeEventListener('mousemove', updatePosition);
        document.removeEventListener('mouseup', stopDragging);
    };

    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseup', stopDragging);
  };
  
  const selectedHub = hubs.find(h => h.id === selectedHubId);
  const hubMapUrl = selectedHub ? selectedHub.worldMapUrl : newHubMapUrl;

    const handleAddQuizQuestion = () => {
        setQuizQuestions(prev => [...prev, { id: uuidv4(), text: '', answers: ['', '', '', ''], correctAnswerIndex: 0 }]);
    };
    const handleQuizQuestionChange = (id: string, text: string) => {
        setQuizQuestions(prev => prev.map(q => q.id === id ? { ...q, text } : q));
    };
    const handleQuizAnswerChange = (qId: string, aIndex: number, text: string) => {
        setQuizQuestions(prev => prev.map(q => q.id === qId ? { ...q, answers: q.answers.map((a, i) => i === aIndex ? text : a) } : q));
    };
    const handleCorrectQuizAnswerChange = (qId: string, aIndex: number) => {
        setQuizQuestions(prev => prev.map(q => q.id === qId ? { ...q, correctAnswerIndex: aIndex } : q));
    };
    const handleRemoveQuizQuestion = (id: string) => {
        setQuizQuestions(prev => prev.filter(q => q.id !== id));
    };


  const validateInputs = () => {
    if (isHubOnlyMode) {
         if (!newHubName || !newHubMapUrl) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'New Hub Name and a Map Image are required.' });
            return false;
        }
    } else {
        if (!selectedHubId) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'You must select or create a Hub.' });
            return false;
        }
        if (selectedHubId === 'new' && (!newHubName || !newHubMapUrl)) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'New Hub Name and a Map Image are required.' });
            return false;
        }
        if (!chapterTitle || chapterNumber === '') {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Chapter Title and Number are required.' });
            return false;
        }
    }
    return true;
  }

  const handleSaveQuest = async () => {
    if (!validateInputs() || !teacher) return;
    setIsSaving(true);
    
    try {
        let finalHubId = selectedHubId;

        // Create a new hub if 'new' is selected
        if (selectedHubId === 'new' || isHubOnlyMode) {
            const newHubRef = doc(collection(db, 'teachers', teacher.uid, 'questHubs'));
            await setDoc(newHubRef, {
                name: newHubName,
                worldMapUrl: newHubMapUrl,
                coordinates: hubCoordinates,
                hubOrder: newHubOrder,
                createdAt: serverTimestamp(),
            });
            finalHubId = newHubRef.id;
            toast({ title: 'Hub Created!', description: 'The new quest hub has been added to your world map.' });
            
            // If we are in hub-only mode, we are done.
            if (isHubOnlyMode) {
                router.push('/teacher/quests');
                return;
            }
        }

        const chapterData: Partial<Chapter> = {
            hubId: finalHubId,
            title: chapterTitle,
            chapterNumber: Number(chapterNumber),
            storyContent,
            mainImageUrl,
            videoUrl,
            storyAdditionalContent,
            decorativeImageUrl1,
            decorativeImageUrl2,
            lessonContent,
            lessonMainImageUrl,
            lessonVideoUrl,
            lessonAdditionalContent,
            lessonDecorativeImageUrl1,
            lessonDecorativeImageUrl2,
            coordinates: chapterCoordinates,
            createdAt: serverTimestamp(),
        };

        if (quizQuestions.length > 0) {
            chapterData.quiz = {
                questions: quizQuestions,
                settings: {
                    requirePassing,
                    passingScore
                }
            };
        }

        // Create the new chapter
        await addDoc(collection(db, 'teachers', teacher.uid, 'chapters'), chapterData);
        
        toast({
            title: 'Quest Created!',
            description: 'The new chapter has been saved and is now live for students.',
        });
        
        router.push('/teacher/quests');

    } catch (error) {
        console.error("Error saving quest:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'There was an error saving your quest. Please try again.' });
    } finally {
        setIsSaving(false);
    }
  }
  
    if (isLoading) {
        return (
             <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin" /></main>
            </div>
        )
    }

  return (
    <>
      <MapGallery isOpen={isGalleryOpen} onOpenChange={setIsGalleryOpen} onMapSelect={setNewHubMapUrl} />
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
                <CardTitle className="text-3xl">{isHubOnlyMode ? 'Create New Quest Hub' : 'Create New Quest'}</CardTitle>
                <CardDescription>
                  {isHubOnlyMode 
                      ? 'Define a new region on your world map where chapters can be placed.'
                      : 'Design a new chapter for your students. Start by defining the Hub, then add the chapter content.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                
                <div className="space-y-4 p-6 border rounded-lg">
                  <h3 className="text-xl font-semibold">
                      {isHubOnlyMode ? 'New Hub Details' : 'Phase 1: Quest Hub'}
                  </h3>
                  <p className="text-muted-foreground mb-4">A Hub is a location on the world map that contains multiple chapters, like a city or region.</p>
                  
                  {isLoading || !teacher ? (
                      <Skeleton className="h-10 w-full" />
                  ) : (
                      <div className="space-y-4">
                          {!isHubOnlyMode && (
                              <div>
                                  <Label htmlFor="hub-select">Select an Existing Hub or Create a New One</Label>
                                  <Select onValueChange={setSelectedHubId} value={selectedHubId} disabled={isSaving}>
                                      <SelectTrigger id="hub-select">
                                          <SelectValue placeholder="Choose a Hub..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="new">-- Create a New Hub --</SelectItem>
                                          {hubs.map(hub => (
                                              <SelectItem key={hub.id} value={hub.id}>{hub.name} (Order: {hub.hubOrder})</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                              </div>
                          )}
                          {(selectedHubId === 'new' || isHubOnlyMode) && (
                              <div className="p-4 border bg-secondary/50 rounded-md space-y-4">
                                  <h4 className="font-semibold text-md">New Hub Details</h4>
                                  <div className="space-y-2">
                                      <Label htmlFor="new-hub-name">New Hub Name</Label>
                                      <Input 
                                          id="new-hub-name"
                                          placeholder="e.g., The Whispering Woods"
                                          value={newHubName}
                                          onChange={e => setNewHubName(e.target.value)}
                                          disabled={isSaving}
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="new-hub-order">Hub Order</Label>
                                      <Input 
                                          id="new-hub-order"
                                          type="number"
                                          placeholder="e.g., 2"
                                          value={newHubOrder}
                                          onChange={e => setNewHubOrder(Number(e.target.value))}
                                          disabled={isSaving}
                                      />
                                  </div>
                                  <ImageUploader label="Hub's Regional Map" imageUrl={newHubMapUrl} onUploadSuccess={setNewHubMapUrl} teacherUid={teacher.uid} storagePath="hub-maps" onGalleryOpen={() => setIsGalleryOpen(true)} />
                                  <Label>Position New Hub on World Map</Label>
                                  <div 
                                      className="relative aspect-[2048/1536] rounded-lg overflow-hidden bg-muted/50 border cursor-grab"
                                      onMouseDown={(e) => handleMapDrag(e, 'hub')}
                                  >
                                      <Image
                                          src={teacherWorldMapUrl}
                                          alt="World Map for Placement"
                                          fill
                                          className="object-contain"
                                          priority
                                      />
                                      <div
                                          className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grabbing"
                                          style={{
                                              left: `${hubCoordinates.x}%`,
                                              top: `${hubCoordinates.y}%`,
                                          }}
                                      >
                                          <div className="w-5 h-5 bg-yellow-400 rounded-full ring-2 ring-white shadow-xl animate-pulse-glow"></div>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
                </div>
                
                {teacher && !isHubOnlyMode && (
                  <div className="space-y-6 p-6 border rounded-lg">
                      <div className="flex justify-between items-center">
                          <h3 className="text-xl font-semibold">Phase 2: Chapter Content</h3>
                          <Button variant="outline" onClick={() => setIsOracleOpen(true)} disabled>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Consult the Oracle
                          </Button>
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
                                  <Input id="chapter-title" placeholder="e.g., A Summons from the Throne" value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} disabled={isSaving} />
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="chapter-number">Chapter Number</Label>
                                  <Input id="chapter-number" type="number" placeholder="e.g., 1" value={chapterNumber} onChange={e => setChapterNumber(e.target.value === '' ? '' : Number(e.target.value))} disabled={isSaving} />
                              </div>
                          </div>
                          <ImageUploader label="Main Story Image" imageUrl={mainImageUrl} onUploadSuccess={setMainImageUrl} teacherUid={teacher.uid} storagePath="quest-images" />
                          <div className="space-y-2">
                              <Label htmlFor="story-content">Story Content</Label>
                              <RichTextEditor value={storyContent} onChange={setStoryContent} />
                          </div>
                          <ImageUploader label="Decorative Image 1" imageUrl={decorativeImageUrl1} onUploadSuccess={setDecorativeImageUrl1} teacherUid={teacher.uid} storagePath="quest-images" />
                          <div className="space-y-2">
                              <Label htmlFor="story-additional-content">Additional Story Content</Label>
                              <RichTextEditor value={storyAdditionalContent} onChange={setStoryAdditionalContent} />
                          </div>
                          <ImageUploader label="Decorative Image 2" imageUrl={decorativeImageUrl2} onUploadSuccess={setDecorativeImageUrl2} teacherUid={teacher.uid} storagePath="quest-images" />
                          <div className="space-y-2">
                              <Label htmlFor="video-url">YouTube Video URL</Label>
                              <Input id="video-url" placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} disabled={isSaving} />
                          </div>
                          {hubMapUrl && (
                              <div className="pt-4 space-y-2">
                                  <Label>Position Chapter on Hub Map</Label>
                                  <div 
                                      className="relative aspect-[2048/1152] rounded-lg overflow-hidden bg-muted/50 border cursor-grab"
                                      onMouseDown={(e) => handleMapDrag(e, 'chapter')}
                                  >
                                      <Image
                                          src={hubMapUrl}
                                          alt="Hub Map for Placement"
                                          fill
                                          className="object-contain"
                                          priority
                                      />
                                      <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                                          {chaptersInHub.slice(0, -1).map((chapter, index) => {
                                              const nextChapter = chaptersInHub[index + 1];
                                              return (
                                                  <line key={`line-${chapter.id}`} x1={`${chapter.coordinates.x}%`} y1={`${chapter.coordinates.y}%`} x2={`${nextChapter.coordinates.x}%`} y2={`${nextChapter.coordinates.y}%`} stroke="#10B981" strokeWidth="3" />
                                              )
                                          })}
                                           {chaptersInHub.length > 0 && (
                                                <line x1={`${chaptersInHub[chaptersInHub.length - 1].coordinates.x}%`} y1={`${chaptersInHub[chaptersInHub.length - 1].coordinates.y}%`} x2={`${chapterCoordinates.x}%`} y2={`${chapterCoordinates.y}%`} stroke="#10B981" strokeWidth="3" />
                                           )}
                                      </svg>
                                      {chaptersInHub.map(chapter => (
                                          <div key={chapter.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${chapter.coordinates.x}%`, top: `${chapter.coordinates.y}%`}}>
                                            <div className="w-5 h-5 bg-green-500 rounded-full ring-2 ring-white shadow-xl"></div>
                                          </div>
                                      ))}
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
                          <ImageUploader label="Main Lesson Image" imageUrl={lessonMainImageUrl} onUploadSuccess={setLessonMainImageUrl} teacherUid={teacher.uid} storagePath="quest-images" />
                          <div className="space-y-2">
                              <Label htmlFor="lesson-content">Lesson Content</Label>
                              <RichTextEditor value={lessonContent} onChange={setLessonContent} />
                          </div>
                          <ImageUploader label="Lesson Decorative Image 1" imageUrl={lessonDecorativeImageUrl1} onUploadSuccess={setLessonDecorativeImageUrl1} teacherUid={teacher.uid} storagePath="quest-images" />
                          <div className="space-y-2">
                              <Label htmlFor="lesson-additional-content">Additional Lesson Content</Label>
                              <RichTextEditor value={lessonAdditionalContent} onChange={setLessonAdditionalContent} />
                          </div>
                          <ImageUploader label="Lesson Decorative Image 2" imageUrl={lessonDecorativeImageUrl2} onUploadSuccess={setLessonDecorativeImageUrl2} teacherUid={teacher.uid} storagePath="quest-images" />
                          <div className="space-y-2">
                              <Label htmlFor="lesson-video-url">Lesson YouTube Video URL</Label>
                              <Input id="lesson-video-url" placeholder="https://youtube.com/watch?v=..." value={lessonVideoUrl} onChange={e => setLessonVideoUrl(e.target.value)} disabled={isSaving} />
                          </div>
                      </TabsContent>
                      <TabsContent value="quiz" className="mt-6 space-y-6">
                            <h3 className="text-xl font-semibold">Quiz Editor</h3>
                            <div className="p-4 border rounded-md space-y-4">
                               <div className="flex items-center space-x-2">
                                    <Switch id="require-passing" checked={requirePassing} onCheckedChange={setRequirePassing} />
                                    <Label htmlFor="require-passing">Require Minimum Score to Advance</Label>
                                </div>
                                {requirePassing && (
                                    <div className="space-y-2 animate-in fade-in-50">
                                        <Label htmlFor="passing-score">Passing Score (%)</Label>
                                        <Input id="passing-score" type="number" min="0" max="100" value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} />
                                    </div>
                                )}
                            </div>
                            {quizQuestions.map((q, qIndex) => (
                                <Card key={q.id} className="p-4 bg-secondary/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <Label className="font-semibold">Question {qIndex + 1}</Label>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveQuizQuestion(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                    <div className="space-y-2">
                                        <Input placeholder="Question text" value={q.text} onChange={e => handleQuizQuestionChange(q.id, e.target.value)} />
                                        <RadioGroup value={q.correctAnswerIndex.toString()} onValueChange={value => handleCorrectQuizAnswerChange(q.id, Number(value))}>
                                            {q.answers.map((ans, aIndex) => (
                                                <div key={aIndex} className="flex items-center gap-2">
                                                    <RadioGroupItem value={aIndex.toString()} id={`q${q.id}-a${aIndex}`} />
                                                    <Input placeholder={`Answer ${aIndex + 1}`} value={ans} onChange={e => handleQuizAnswerChange(q.id, aIndex, e.target.value)} />
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                </Card>
                            ))}
                            <Button variant="outline" onClick={handleAddQuizQuestion}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                            </Button>
                      </TabsContent>
                      </Tabs>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button size="lg" onClick={handleSaveQuest} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {isHubOnlyMode ? 'Save Hub' : 'Save Quest'}
                  </Button>
                </div>

              </CardContent>
            </Card>
          </div>
          <AlertDialog open={isOracleOpen} onOpenChange={setIsOracleOpen}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>The Oracle Is Resting</AlertDialogTitle>
                      <AlertDialogDescription>
                          The AI story generation feature is temporarily disabled. Please write your story manually.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogAction onClick={() => setIsOracleOpen(false)}>I Understand</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </>
  );
}

export default function NewQuestPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen w-full flex-col bg-muted/40"><TeacherHeader /><main className="flex-1 p-4 md:p-6 lg:p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin" /></main></div>}>
            <NewQuestForm />
        </Suspense>
    )
}
