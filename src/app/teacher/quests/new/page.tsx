
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react';
import { doc, setDoc, addDoc, collection, getDocs, serverTimestamp, query, orderBy, where, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { generateStory, generateSummary } from '@/ai/flows/story-generator';

export default function NewQuestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const worldMapImageUrl = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FWorld%20Map.JPG?alt=media&token=2d88af7d-a54c-4f34-b4c7-1a7c04485b8b";
  const [teacher, setTeacher] = useState<User | null>(null);

  // State for AI generator
  const [isOracleOpen, setIsOracleOpen] = useState(false);
  const [oracleMode, setOracleMode] = useState<'standalone' | 'saga' | null>(null);
  const [oracleGradeLevel, setOracleGradeLevel] = useState('');
  const [oracleKeyElements, setOracleKeyElements] = useState('');
  const [oraclePredecessorHub, setOraclePredecessorHub] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirmStandaloneOpen, setIsConfirmStandaloneOpen] = useState(false);


  // State for the new Hub creator
  const [hubs, setHubs] = useState<QuestHub[]>([]);
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
    const fetchHubs = async () => {
        setIsLoading(true);
        try {
            const hubsQuery = query(collection(db, 'teachers', teacher.uid, 'questHubs'), orderBy('hubOrder'));
            const hubsSnapshot = await getDocs(hubsQuery);
            const hubsData = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
            setHubs(hubsData);
            setNewHubOrder(hubsData.length + 1); // Default next hub order
        } catch (error) {
            console.error("Error fetching hubs: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch quest hubs.' });
        } finally {
            setIsLoading(false);
        }
    };
    fetchHubs();
  }, [teacher, toast]);
  
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

  const validateInputs = () => {
    if (!selectedHubId) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'You must select or create a Hub.' });
        return false;
    }
    if (selectedHubId === 'new' && (!newHubName || !newHubMapUrl || !newHubOrder)) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'New Hub Name, Map URL, and Order are required.' });
        return false;
    }
     if (!chapterTitle || chapterNumber === '' || !storyContent || !lessonContent) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out all required chapter fields: Title, Number, Story Content, and Lesson Content.' });
        return false;
    }
    return true;
  }
  
  const handleOracleGenerate = async () => {
    if (!oracleGradeLevel || !oracleMode || !teacher || !chapterTitle) {
        toast({ variant: 'destructive', title: "The Oracle's Query is Incomplete", description: 'Please provide all required elements for the Oracle.' });
        return;
    }
     if (oracleMode === 'standalone' && !oracleKeyElements) {
        toast({ variant: 'destructive', title: "The Oracle's Query is Incomplete", description: 'Please provide key elements for a standalone story.' });
        return;
    }
    setIsGenerating(true);

    try {
        let previousHubSummary: string | undefined;
        let currentHubSummary: string | undefined;
        let previousChapterStory: string | undefined;

        if (oracleMode === 'saga') {
            // Fetch predecessor hub summary if selected
            if (oraclePredecessorHub && oraclePredecessorHub !== 'none') {
                const hubRef = doc(db, 'teachers', teacher.uid, 'questHubs', oraclePredecessorHub);
                const hubSnap = await getDoc(hubRef);
                if (hubSnap.exists()) {
                    previousHubSummary = hubSnap.data().storySummary;
                }
            }
            // Fetch current hub summary
            if (selectedHubId && selectedHubId !== 'new') {
                 const currentHubRef = doc(db, 'teachers', teacher.uid, 'questHubs', selectedHubId);
                 const currentHubSnap = await getDoc(currentHubRef);
                 if (currentHubSnap.exists()) {
                    currentHubSummary = currentHubSnap.data().storySummary;
                 }
            }
            // Fetch previous chapter story
            if (selectedHubId && selectedHubId !== 'new' && typeof chapterNumber === 'number' && chapterNumber > 1) {
                const prevChapterQuery = query(
                    collection(db, 'teachers', teacher.uid, 'chapters'),
                    where('hubId', '==', selectedHubId),
                    where('chapterNumber', '==', chapterNumber - 1)
                );
                const prevChapterSnap = await getDocs(prevChapterQuery);
                if (!prevChapterSnap.empty) {
                    previousChapterStory = prevChapterSnap.docs[0].data().storyContent;
                }
            }
        }
        
        const result = await generateStory({
            gradeLevel: oracleGradeLevel as any,
            keyElements: oracleMode === 'standalone' ? oracleKeyElements : undefined,
            chapterTitle: chapterTitle,
            mode: oracleMode,
            previousHubSummary,
            currentHubSummary,
            previousChapterStory,
        });
        
        setChapterTitle(result.title);
        setStoryContent(result.storyContent);

        // If saga mode, update the hub's story summary
        if (oracleMode === 'saga' && selectedHubId && selectedHubId !== 'new') {
            const newSummary = await generateSummary(currentHubSummary, result.storyContent);
            const hubRef = doc(db, 'teachers', teacher.uid, 'questHubs', selectedHubId);
            await updateDoc(hubRef, { storySummary: newSummary });
        }

        toast({ title: 'The Oracle has Spoken!', description: 'The chapter title and story have been divined.' });
        setIsOracleOpen(false); // Close the main dialog
        setOracleMode(null); // Reset for next time

    } catch (error) {
        console.error("Error generating story from Oracle:", error);
        toast({ variant: 'destructive', title: 'The Oracle is Silent', description: 'The AI failed to generate a story.' });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSaveQuest = async () => {
    if (!validateInputs() || !teacher) return;
    setIsSaving(true);
    
    try {
        let finalHubId = selectedHubId;

        // 1. Create a new hub if necessary
        if (selectedHubId === 'new') {
            const newHubRef = doc(collection(db, 'teachers', teacher.uid, 'questHubs'));
            await setDoc(newHubRef, {
                name: newHubName,
                worldMapUrl: newHubMapUrl,
                coordinates: hubCoordinates,
                hubOrder: newHubOrder,
                createdAt: serverTimestamp(),
            });
            finalHubId = newHubRef.id;
        }

        // 2. Create the new chapter
        await addDoc(collection(db, 'teachers', teacher.uid, 'chapters'), {
            hubId: finalHubId,
            title: chapterTitle,
            chapterNumber: chapterNumber,
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
        });
        
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
                  {chapterNumber === 1 || chapterNumber === '' ? 'Begin the Saga' : 'Continue the Saga'}
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
                    Provide the Oracle with the core elements for a self-contained story. The Oracle will use the chapter title you've already written.
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
                    <Label>Key Story Elements</Label>
                    <Input placeholder="e.g., A greedy dragon, a stolen pie..." value={oracleKeyElements} onChange={e => setOracleKeyElements(e.target.value)} />
                 </div>
            </div>
            <AlertDialogFooter>
                <Button variant="ghost" onClick={() => setOracleMode(null)}>Back</Button>
                <AlertDialogAction onClick={() => { setIsOracleOpen(false); setIsConfirmStandaloneOpen(true); }} disabled={isGenerating || !oracleGradeLevel || !oracleKeyElements}>
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
                    The Oracle will consult its records of the past to write the next chapter based on the title you've already provided.
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
                <AlertDialogAction onClick={handleOracleGenerate} disabled={isGenerating || !oracleGradeLevel || !selectedHubId || selectedHubId === 'new'}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Write the Next Chapter
                </AlertDialogAction>
            </AlertDialogFooter>
            </>
        )
    }
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
              <CardTitle className="text-3xl">Create New Quest</CardTitle>
              <CardDescription>
                Design a new chapter for your students. Start by defining the Hub, then add the chapter content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              <div className="space-y-4 p-6 border rounded-lg">
                <h3 className="text-xl font-semibold">Phase 1: Quest Hub</h3>
                <p className="text-muted-foreground mb-4">A Hub is a location on the world map that contains multiple chapters, like a city or region.</p>
                
                {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <div className="space-y-4">
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
                        {selectedHubId === 'new' && (
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
                                <div className="space-y-2">
                                    <Label htmlFor="new-hub-map">URL for Hub's Regional Map</Label>
                                    <Input 
                                        id="new-hub-map"
                                        placeholder="https://example.com/map.png"
                                        value={newHubMapUrl}
                                        onChange={e => setNewHubMapUrl(e.target.value)}
                                        disabled={isSaving}
                                    />
                                </div>
                                <Label>Position New Hub on World Map</Label>
                                <div 
                                    className="relative aspect-[2048/1536] rounded-lg overflow-hidden bg-muted/50 border cursor-grab"
                                    onMouseDown={(e) => handleMapDrag(e, 'hub')}
                                >
                                    <Image
                                        src={worldMapImageUrl}
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
              
              <div className="space-y-6 p-6 border rounded-lg">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Phase 2: Chapter Content</h3>
                    <Button variant="outline" onClick={() => setIsOracleOpen(true)} disabled={!chapterTitle}>
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
                            <Input id="chapter-title" placeholder="e.g., A Summons from the Throne" value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="chapter-number">Chapter Number</Label>
                            <Input id="chapter-number" type="number" placeholder="e.g., 1" value={chapterNumber} onChange={e => setChapterNumber(e.target.value === '' ? '' : Number(e.target.value))} disabled={isSaving} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="story-content">Story Content</Label>
                        <RichTextEditor value={storyContent} onChange={setStoryContent} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="main-image-url">Main Image URL</Label>
                        <Input id="main-image-url" placeholder="https://example.com/main-image.png" value={mainImageUrl} onChange={e => setMainImageUrl(e.target.value)} disabled={isSaving} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="video-url">YouTube Video URL</Label>
                        <Input id="video-url" placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} disabled={isSaving} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="story-additional-content">Additional Story Content</Label>
                        <RichTextEditor value={storyAdditionalContent} onChange={setStoryAdditionalContent} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="deco-image-1">Decorative Image 1 URL</Label>
                            <Input id="deco-image-1" placeholder="https://example.com/deco1.png" value={decorativeImageUrl1} onChange={e => setDecorativeImageUrl1(e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deco-image-2">Decorative Image 2 URL</Label>
                            <Input id="deco-image-2" placeholder="https://example.com/deco2.png" value={decorativeImageUrl2} onChange={e => setDecorativeImageUrl2(e.target.value)} disabled={isSaving} />
                        </div>
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
                        <RichTextEditor value={lessonContent} onChange={setLessonContent} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lesson-main-image-url">Main Lesson Image URL</Label>
                        <Input id="lesson-main-image-url" placeholder="https://example.com/lesson-main.png" value={lessonMainImageUrl} onChange={e => setLessonMainImageUrl(e.target.value)} disabled={isSaving} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lesson-video-url">Lesson YouTube Video URL</Label>
                        <Input id="lesson-video-url" placeholder="https://youtube.com/watch?v=..." value={lessonVideoUrl} onChange={e => setLessonVideoUrl(e.target.value)} disabled={isSaving} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="lesson-additional-content">Additional Lesson Content</Label>
                        <RichTextEditor value={lessonAdditionalContent} onChange={setLessonAdditionalContent} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="lesson-deco-1">Lesson Decorative Image 1 URL</Label>
                            <Input id="lesson-deco-1" placeholder="https://example.com/lesson-deco1.png" value={lessonDecorativeImageUrl1} onChange={e => setLessonDecorativeImageUrl1(e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lesson-deco-2">Lesson Decorative Image 2 URL</Label>
                            <Input id="lesson-deco-2" placeholder="https://example.com/lesson-deco2.png" value={lessonDecorativeImageUrl2} onChange={e => setLessonDecorativeImageUrl2(e.target.value)} disabled={isSaving} />
                        </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button size="lg" onClick={handleSaveQuest} disabled={isSaving}>
                   {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Quest
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
