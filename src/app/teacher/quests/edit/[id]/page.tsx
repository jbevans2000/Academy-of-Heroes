
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestHub, Chapter } from '@/lib/quests';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EditQuestPage() {
  const router = useRouter();
  const params = useParams();
  const chapterId = params.id as string;
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State for Hubs
  const [hubs, setHubs] = useState<QuestHub[]>([]);
  
  // State for the Chapter
  const [chapter, setChapter] = useState<Partial<Chapter> | null>(null);
  const [selectedHubId, setSelectedHubId] = useState('');
  const [chapterCoordinates, setChapterCoordinates] = useState({ x: 50, y: 50 });

  // Fetch all hubs for the dropdown
  useEffect(() => {
    const fetchHubs = async () => {
        try {
            const hubsSnapshot = await getDocs(collection(db, 'questHubs'));
            const hubsData = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
            setHubs(hubsData);
        } catch (error) {
            console.error("Error fetching hubs: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch quest hubs.' });
        }
    };
    fetchHubs();
  }, [toast]);
  
  // Fetch the specific chapter data to edit
  useEffect(() => {
    if (!chapterId) return;
    const fetchChapter = async () => {
        setIsLoading(true);
        try {
            const chapterRef = doc(db, 'chapters', chapterId);
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
  }, [chapterId, router, toast]);

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

  const handleSaveChanges = async () => {
    if (!validateInputs() || !chapter) return;
    setIsSaving(true);
    
    try {
        const chapterRef = doc(db, 'chapters', chapterId);
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

  if (isLoading || !chapter) {
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
                                <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              </div>
              
              <div className="space-y-6 p-6 border rounded-lg">
                <h3 className="text-xl font-semibold">Chapter Content</h3>
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
                            <Textarea id="story-content" placeholder="Write the story for this chapter... Use \n for new paragraphs." value={chapter.storyContent || ''} onChange={e => handleFieldChange('storyContent', e.target.value)} disabled={isSaving} rows={8}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="main-image-url">Main Image URL</Label>
                            <Input id="main-image-url" placeholder="https://example.com/main-image.png" value={chapter.mainImageUrl || ''} onChange={e => handleFieldChange('mainImageUrl', e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="video-url">YouTube Video URL</Label>
                            <Input id="video-url" placeholder="https://youtube.com/watch?v=..." value={chapter.videoUrl || ''} onChange={e => handleFieldChange('videoUrl', e.target.value)} disabled={isSaving} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="story-additional-content">Additional Story Content</Label>
                            <Textarea id="story-additional-content" placeholder="Add any extra notes, quotes, or content for the story tab..." value={chapter.storyAdditionalContent || ''} onChange={e => handleFieldChange('storyAdditionalContent', e.target.value)} disabled={isSaving} rows={4}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="deco-image-1">Decorative Image 1 URL</Label>
                                <Input id="deco-image-1" placeholder="https://example.com/deco1.png" value={chapter.decorativeImageUrl1 || ''} onChange={e => handleFieldChange('decorativeImageUrl1', e.target.value)} disabled={isSaving} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="deco-image-2">Decorative Image 2 URL</Label>
                                <Input id="deco-image-2" placeholder="https://example.com/deco2.png" value={chapter.decorativeImageUrl2 || ''} onChange={e => handleFieldChange('decorativeImageUrl2', e.target.value)} disabled={isSaving} />
                            </div>
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
                            <Textarea id="lesson-content" placeholder="Write the educational content for this chapter... Use \n for new paragraphs." value={chapter.lessonContent || ''} onChange={e => handleFieldChange('lessonContent', e.target.value)} disabled={isSaving} rows={8}/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="lesson-main-image-url">Main Lesson Image URL</Label>
                            <Input id="lesson-main-image-url" placeholder="https://example.com/lesson-main.png" value={chapter.lessonMainImageUrl || ''} onChange={e => handleFieldChange('lessonMainImageUrl', e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lesson-video-url">Lesson YouTube Video URL</Label>
                            <Input id="lesson-video-url" placeholder="https://youtube.com/watch?v=..." value={chapter.lessonVideoUrl || ''} onChange={e => handleFieldChange('lessonVideoUrl', e.target.value)} disabled={isSaving} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="lesson-additional-content">Additional Lesson Content</Label>
                            <Textarea id="lesson-additional-content" placeholder="Add any extra notes, quotes, or content for the lesson tab..." value={chapter.lessonAdditionalContent || ''} onChange={e => handleFieldChange('lessonAdditionalContent', e.target.value)} disabled={isSaving} rows={4}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="lesson-deco-1">Lesson Decorative Image 1 URL</Label>
                                <Input id="lesson-deco-1" placeholder="https://example.com/lesson-deco1.png" value={chapter.lessonDecorativeImageUrl1 || ''} onChange={e => handleFieldChange('lessonDecorativeImageUrl1', e.target.value)} disabled={isSaving} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lesson-deco-2">Lesson Decorative Image 2 URL</Label>
                                <Input id="lesson-deco-2" placeholder="https://example.com/lesson-deco2.png" value={chapter.lessonDecorativeImageUrl2 || ''} onChange={e => handleFieldChange('lessonDecorativeImageUrl2', e.target.value)} disabled={isSaving} />
                            </div>
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
      </main>
    </div>
  );
}
