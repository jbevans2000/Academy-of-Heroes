
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { doc, setDoc, addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestHub } from '@/lib/quests';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NewQuestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const worldMapImageUrl = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FWorld%20Map.JPG?alt=media&token=2d88af7d-a54c-4f34-b4c7-1a7c04485b8b";


  // State for the new Hub creator
  const [hubs, setHubs] = useState<QuestHub[]>([]);
  const [selectedHubId, setSelectedHubId] = useState('');
  const [newHubName, setNewHubName] = useState('');
  const [newHubMapUrl, setNewHubMapUrl] = useState('');
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
    const fetchHubs = async () => {
        setIsLoading(true);
        try {
            const hubsSnapshot = await getDocs(collection(db, 'questHubs'));
            const hubsData = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
            setHubs(hubsData);
        } catch (error) {
            console.error("Error fetching hubs: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch quest hubs.' });
        } finally {
            setIsLoading(false);
        }
    };
    fetchHubs();
  }, [toast]);
  
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
    if (selectedHubId === 'new' && (!newHubName || !newHubMapUrl)) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'New Hub Name and Map URL are required.' });
        return false;
    }
     if (!chapterTitle || chapterNumber === '' || !storyContent || !lessonContent) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out all chapter fields: Title, Number, Story, and Lesson.' });
        return false;
    }
    return true;
  }

  const handleSaveQuest = async () => {
    if (!validateInputs()) return;
    setIsSaving(true);
    
    try {
        let finalHubId = selectedHubId;

        // 1. Create a new hub if necessary
        if (selectedHubId === 'new') {
            const newHubRef = doc(collection(db, 'questHubs'));
            await setDoc(newHubRef, {
                name: newHubName,
                worldMapUrl: newHubMapUrl,
                coordinates: hubCoordinates,
                createdAt: serverTimestamp(),
            });
            finalHubId = newHubRef.id;
        }

        // 2. Create the new chapter
        await addDoc(collection(db, 'chapters'), {
            hubId: finalHubId,
            title: chapterTitle,
            chapterNumber: chapterNumber,
            storyContent,
            mainImageUrl,
            videoUrl,
            decorativeImageUrl1,
            decorativeImageUrl2,
            storyAdditionalContent,
            lessonContent,
            lessonMainImageUrl,
            lessonVideoUrl,
            lessonDecorativeImageUrl1,
            lessonDecorativeImageUrl2,
            lessonAdditionalContent,
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
                                        <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
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
                <h3 className="text-xl font-semibold">Phase 2: Chapter Content</h3>
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
                        <Textarea id="story-content" placeholder="Write the story for this chapter... Use \n for new paragraphs." value={storyContent} onChange={e => setStoryContent(e.target.value)} disabled={isSaving} rows={8}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="main-image-url">Main Image URL</Label>
                        <Input id="main-image-url" placeholder="https://example.com/main-image.png" value={mainImageUrl} onChange={e => setMainImageUrl(e.target.value)} disabled={isSaving} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="video-url">YouTube Video URL</Label>
                        <Input id="video-url" placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} disabled={isSaving} />
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
                     <div className="space-y-2">
                        <Label htmlFor="story-additional-content">Additional Story Content</Label>
                        <Textarea id="story-additional-content" placeholder="Add any extra notes, quotes, or content for the story tab..." value={storyAdditionalContent} onChange={e => setStoryAdditionalContent(e.target.value)} disabled={isSaving} rows={4}/>
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
                        <Textarea id="lesson-content" placeholder="Write the educational content for this chapter... Use \n for new paragraphs." value={lessonContent} onChange={e => setLessonContent(e.target.value)} disabled={isSaving} rows={8}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lesson-main-image-url">Main Lesson Image URL</Label>
                        <Input id="lesson-main-image-url" placeholder="https://example.com/lesson-main.png" value={lessonMainImageUrl} onChange={e => setLessonMainImageUrl(e.target.value)} disabled={isSaving} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lesson-video-url">Lesson YouTube Video URL</Label>
                        <Input id="lesson-video-url" placeholder="https://youtube.com/watch?v=..." value={lessonVideoUrl} onChange={e => setLessonVideoUrl(e.target.value)} disabled={isSaving} />
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
                     <div className="space-y-2">
                        <Label htmlFor="lesson-additional-content">Additional Lesson Content</Label>
                        <Textarea id="lesson-additional-content" placeholder="Add any extra notes, quotes, or content for the lesson tab..." value={lessonAdditionalContent} onChange={e => setLessonAdditionalContent(e.target.value)} disabled={isSaving} rows={4}/>
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
      </main>
    </div>
  );
}
