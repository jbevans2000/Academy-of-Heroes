
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, LayoutDashboard, Edit, Trash2, Loader2, Eye, Wrench, Image as ImageIcon, Upload, X, Library, Users, BookOpen, Share } from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, onSnapshot, updateDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db, auth, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { QuestHub, Chapter, Company, LibraryHub } from '@/lib/quests';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import NextImage from 'next/image';
import Link from 'next/link';
import { WorldMapGallery } from '@/components/teacher/world-map-gallery';
import { deleteQuestHub, deleteChapter } from '@/ai/flows/manage-quests';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { shareHubsToLibrary } from '@/ai/flows/share-to-library';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";


interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  hubs: QuestHub[];
  allLibraryHubs: LibraryHub[];
  teacher: User | null;
  teacherSagas: string[];
}

const gradeLevels = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

function ShareDialog({ isOpen, onOpenChange, hubs, allLibraryHubs, teacher, teacherSagas }: ShareDialogProps) {
    const { toast } = useToast();
    const [selectedHubIds, setSelectedHubIds] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
    const [tags, setTags] = useState('');
    const [sagaType, setSagaType] = useState<'standalone' | 'ongoing'>('standalone');
    const [description, setDescription] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [selectedSaga, setSelectedSaga] = useState('');
    const [contentToShare, setContentToShare] = useState<'both' | 'story' | 'lesson'>('both');

    const alreadySharedHubIds = useMemo(() => {
        return new Set(allLibraryHubs.map(hub => hub.originalHubId));
    }, [allLibraryHubs]);

    const handleShare = async () => {
        if (!teacher || selectedHubIds.length === 0 || !subject || selectedGrades.length === 0) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select at least one hub and fill out all required fields.' });
            return;
        }
        if (sagaType === 'ongoing' && !selectedSaga) {
            toast({ variant: 'destructive', title: 'Saga Not Selected', description: 'Please select a saga for your ongoing series.' });
            return;
        }
        setIsSharing(true);
        try {
            const result = await shareHubsToLibrary({
                teacherUid: teacher.uid,
                hubIds: selectedHubIds,
                subject,
                gradeLevels: selectedGrades,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                sagaType,
                description,
                sagaName: sagaType === 'ongoing' ? selectedSaga : '',
                contentToShare,
            });

            if (result.success) {
                toast({ title: 'Content Shared!', description: `${result.sharedCount} hub(s) have been shared to the Royal Library.` });
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Sharing Failed', description: error.message });
        } finally {
            setIsSharing(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setSelectedHubIds([]);
            setSubject('');
            setSelectedGrades([]);
            setTags('');
            setSagaType('standalone');
            setDescription('');
            setSelectedSaga('');
            setContentToShare('both');
        }
    }, [isOpen]);

    const handleGradeSelect = (grade: string) => {
        setSelectedGrades(prev => 
            prev.includes(grade)
            ? prev.filter(g => g !== grade)
            : [...prev, grade]
        );
    };

    const selectedGradesText = selectedGrades.length > 0 ? selectedGrades.join(', ') : "Select grade(s)...";

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Share to the Royal Library</DialogTitle>
                    <DialogDescription>Select the hubs you wish to share and provide some details to help other teachers find them.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="font-bold">Select Hubs to Share</Label>
                        <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-2">
                            {hubs.map(hub => {
                                const isShared = alreadySharedHubIds.has(hub.id);
                                return (
                                <div key={hub.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`share-${hub.id}`}
                                        checked={selectedHubIds.includes(hub.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedHubIds(prev => checked ? [...prev, hub.id] : prev.filter(id => id !== hub.id));
                                        }}
                                        disabled={isShared}
                                    />
                                    <Label htmlFor={`share-${hub.id}`} className={isShared ? 'text-muted-foreground' : ''}>{hub.name}</Label>
                                    {isShared && <Badge variant="secondary">Shared</Badge>}
                                </div>
                            )})}
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., American History" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gradeLevel">Grade Level(s)</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <span className="truncate">{selectedGradesText}</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuLabel>Select Grade Levels</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {gradeLevels.map((grade) => (
                                        <DropdownMenuCheckboxItem
                                            key={grade}
                                            checked={selectedGrades.includes(grade)}
                                            onCheckedChange={() => handleGradeSelect(grade)}
                                            onSelect={(e) => e.preventDefault()} // Prevent closing on select
                                        >
                                            {grade}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g., Civil War, Fractions, Reading Comprehension" />
                    </div>
                     <div className="space-y-2">
                        <Label>Saga Type</Label>
                         <div className="flex gap-4 items-center">
                            <RadioGroup value={sagaType} onValueChange={(v) => setSagaType(v as any)} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="standalone" id="standalone" />
                                    <Label htmlFor="standalone">Standalone Hub</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="ongoing" id="ongoing" />
                                    <Label htmlFor="ongoing">Ongoing Saga</Label>
                                </div>
                            </RadioGroup>
                             {sagaType === 'ongoing' && (
                                 <Select value={selectedSaga} onValueChange={setSelectedSaga} disabled={teacherSagas.length === 0}>
                                    <SelectTrigger className="w-[250px]">
                                        <SelectValue placeholder="Select a Saga Name..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teacherSagas.length > 0 ? (
                                            teacherSagas.map(saga => <SelectItem key={saga} value={saga}>{saga}</SelectItem>)
                                        ) : (
                                            <SelectItem value="none" disabled>No sagas defined in your profile.</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Content to Share</Label>
                        <RadioGroup value={contentToShare} onValueChange={(v) => setContentToShare(v as any)} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="both" id="share-both" />
                                <Label htmlFor="share-both">Story & Lesson</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="story" id="share-story" />
                                <Label htmlFor="share-story">Story Only</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="lesson" id="share-lesson" />
                                <Label htmlFor="share-lesson">Lesson Only</Label>
                            </div>
                        </RadioGroup>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly describe what this quest hub is about." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleShare} disabled={isSharing}>
                        {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Share to Library
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function QuestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [hubs, setHubs] = useState<QuestHub[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [teacherData, setTeacherData] = useState<{sagas?: string[]}>({});
  
  // State for world map dialog
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [isWorldMapGalleryOpen, setIsWorldMapGalleryOpen] = useState(false);
  const [worldMapUrl, setWorldMapUrl] = useState('');
  const [mapImageFile, setMapImageFile] = useState<File | null>(null);
  const [isUploadingMap, setIsUploadingMap] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  // State for hub deletion
  const [hubToDelete, setHubToDelete] = useState<QuestHub | null>(null);
  const [isDeletingHub, setIsDeletingHub] = useState(false);

  // State for sharing
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [allLibraryHubs, setAllLibraryHubs] = useState<LibraryHub[]>([]);

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
    setIsLoading(true);

    const hubsRef = collection(db, 'teachers', teacher.uid, 'questHubs');
    const chaptersRef = collection(db, 'teachers', teacher.uid, 'chapters');
    const teacherRef = doc(db, 'teachers', teacher.uid);
    const companiesRef = collection(db, 'teachers', teacher.uid, 'companies');
    const libraryHubsRef = collection(db, 'library_hubs'); 

    const unsubHubs = onSnapshot(hubsRef, (querySnapshot) => {
        const hubsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
        setHubs(hubsData);
    });
    
    const unsubChapters = onSnapshot(chaptersRef, (querySnapshot) => {
        const chaptersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
        setChapters(chaptersData);
    });
    
    const unsubTeacher = onSnapshot(teacherRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setTeacherData(data); // Store all teacher data
            setWorldMapUrl(data.worldMapUrl || '');
        }
    });

    const unsubCompanies = onSnapshot(companiesRef, (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
    });
    
    const unsubLibrary = onSnapshot(libraryHubsRef, (snapshot) => {
        setAllLibraryHubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryHub)));
    });

    setIsLoading(false);

    return () => {
        unsubHubs();
        unsubChapters();
        unsubTeacher();
        unsubCompanies();
        unsubLibrary();
    };
  }, [teacher]);
  
    const sortedHubs = useMemo(() => {
        return [...hubs].sort((a, b) => {
            const aIsSideQuest = a.hubType === 'sidequest';
            const bIsSideQuest = b.hubType === 'sidequest';

            if (aIsSideQuest && !bIsSideQuest) return -1;
            if (!aIsSideQuest && bIsSideQuest) return 1;
            
            if(aIsSideQuest && bIsSideQuest) {
                return a.name.localeCompare(b.name);
            }

            return a.hubOrder - b.hubOrder;
        });
    }, [hubs]);

  const handleDeleteChapter = async (chapterId: string) => {
    if (!teacher) return;
    setIsDeleting(chapterId);
    try {
        const result = await deleteChapter({ teacherUid: teacher.uid, chapterId });
        if(result.success) {
            toast({
                title: 'Chapter Deleted',
                description: 'The chapter has been successfully removed.',
            });
        } else {
             throw new Error(result.error);
        }
    } catch (error: any) {
        console.error('Error deleting chapter:', error);
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: error.message || 'Could not delete the chapter.',
        });
    } finally {
        setIsDeleting(null);
    }
  };

  const handleDeleteHub = async () => {
    if (!teacher || !hubToDelete) return;
    setIsDeletingHub(true);
    try {
        const result = await deleteQuestHub({ teacherUid: teacher.uid, hubId: hubToDelete.id });
        if (result.success) {
            toast({ title: "Hub Deleted", description: `"${hubToDelete.name}" and all its chapters have been removed.` });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setIsDeletingHub(false);
        setHubToDelete(null);
    }
  };


  const handleWorldMapUpload = async () => {
    if (!mapImageFile || !teacher) return;
    setIsUploadingMap(true);
    try {
        const storage = getStorage(app);
        const imageId = uuidv4();
        const storageRef = ref(storage, `world-maps/${teacher.uid}/${imageId}`);
        
        await uploadBytes(storageRef, mapImageFile);
        const downloadUrl = await getDownloadURL(storageRef);

        const teacherRef = doc(db, 'teachers', teacher.uid);
        await updateDoc(teacherRef, { worldMapUrl: downloadUrl });

        toast({ title: 'World Map Updated!', description: 'Your new world map has been saved.' });
        setIsMapDialogOpen(false);
        setMapImageFile(null);
    } catch (error) {
        console.error("Error uploading world map:", error);
        toast({ variant: 'destructive', title: 'Upload Failed' });
    } finally {
        setIsUploadingMap(false);
    }
  };
  
  const handleSelectWorldMapFromGallery = async (url: string) => {
    if (!teacher) return;
    try {
        const teacherRef = doc(db, 'teachers', teacher.uid);
        await updateDoc(teacherRef, { worldMapUrl: url });
        toast({ title: 'World Map Updated!', description: 'Your new world map has been set from the gallery.' });
    } catch(error) {
        console.error("Error setting world map from gallery:", error);
        toast({ variant: 'destructive', title: 'Update Failed' });
    }
  };

  const handleRevertToDefault = async () => {
    if (!teacher) return;
    setIsReverting(true);
    try {
        const teacherRef = doc(db, 'teachers', teacher.uid);
        await updateDoc(teacherRef, { worldMapUrl: '' }); // Set to empty string to trigger fallback
        toast({ title: 'Map Reverted', description: 'Your world map has been reverted to the default image.' });
        setIsMapDialogOpen(false);
    } catch (error) {
        console.error("Error reverting world map:", error);
        toast({ variant: 'destructive', title: 'Revert Failed' });
    } finally {
        setIsReverting(false);
    }
  };

  return (
    <>
      <ShareDialog isOpen={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} hubs={sortedHubs} allLibraryHubs={allLibraryHubs} teacher={teacher} teacherSagas={teacherData?.sagas || []}/>
      <Dialog open={isMapDialogOpen} onOpenChange={setIsMapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your World Map Image</DialogTitle>
            <DialogDescription>
              Upload a new image or choose from the gallery to serve as the world map for your quests.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="flex items-center gap-2">
                <Label htmlFor="map-upload" className={cn(buttonVariants({ variant: 'default' }), "cursor-pointer")}>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File to Upload
                </Label>
                 <Button variant="outline" onClick={() => { setIsMapDialogOpen(false); setIsWorldMapGalleryOpen(true); }}>
                    <Library className="mr-2 h-4 w-4" />
                    Choose From Gallery
                 </Button>
                <Input id="map-upload" type="file" accept="image/*" onChange={(e) => setMapImageFile(e.target.files ? e.target.files[0] : null)} className="hidden" disabled={isUploadingMap}/>
                {mapImageFile && <p className="text-sm text-muted-foreground">{mapImageFile.name}</p>}
            </div>
            {mapImageFile && (
              <div className="border p-2 rounded-md">
                <NextImage 
                  src={URL.createObjectURL(mapImageFile)} 
                  alt="Map preview" 
                  width={400} 
                  height={300} 
                  className="w-full h-auto object-contain rounded-md"
                />
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isReverting}>
                        {isReverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Revert to Default Map
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove your custom world map and revert to the default image.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevertToDefault}>Yes, Revert</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsMapDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleWorldMapUpload} disabled={!mapImageFile || isUploadingMap}>
                {isUploadingMap ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Confirm Upload
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <WorldMapGallery 
        isOpen={isWorldMapGalleryOpen}
        onOpenChange={setIsWorldMapGalleryOpen}
        onMapSelect={handleSelectWorldMapFromGallery}
      />
      
      <AlertDialog open={!!hubToDelete} onOpenChange={() => setHubToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Hub: {hubToDelete?.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the entire hub and ALL of its chapters. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteHub} disabled={isDeletingHub} className="bg-destructive hover:bg-destructive/90">
                    {isDeletingHub ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Yes, Delete Hub
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">The Quest Archives</h1>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/teacher/dashboard')} variant="outline">
              <LayoutDashboard className="mr-2 h-5 w-5" />
              Return to Podium
            </Button>
             <Button variant="secondary" onClick={() => setIsMapDialogOpen(true)}>
                <ImageIcon className="mr-2 h-5 w-5" />
                Set World Map
            </Button>
            <Button variant="secondary" onClick={() => router.push('/teacher/library')}>
                <BookOpen className="mr-2 h-5 w-5" />
                Royal Library
            </Button>
            <Button onClick={() => setIsShareDialogOpen(true)}>
              <Share className="mr-2 h-5 w-5" />
              Share Your Quests
            </Button>
            <Button onClick={() => router.push('/teacher/quests/new')}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Quest
            </Button>
          </div>
        </div>
        
        {isLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        ) : hubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-20 text-center">
                <h2 className="text-xl font-semibold text-muted-foreground">No Quests Created Yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">This area will show a list of all the quests and chapters you have created.</p>
                <div className="flex gap-2 mt-4">
                    <Button onClick={() => router.push('/teacher/quests/new')}>
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Create Your First Chapter
                    </Button>
                     <Button variant="secondary" onClick={() => router.push('/teacher/quests/new?hubOnly=true')}>
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Create a Hub
                    </Button>
                </div>
            </div>
        ) : (
             <Card>
                <CardHeader>
                    <CardTitle>All Created Quests</CardTitle>
                    <CardDescription>Here are all the hubs and chapters you have created so far.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full">
                        {sortedHubs.map(hub => {
                            const hubChapters = chapters.filter(c => c.hubId === hub.id).sort((a,b) => a.chapterNumber - b.chapterNumber);
                            const assignedCompanies = hub.assignedCompanyIds?.map(id => companies.find(c => c.id === id)?.name).filter(Boolean);
                            const visibilityText = (hub.isVisibleToAll === false && assignedCompanies && assignedCompanies.length > 0)
                                ? assignedCompanies.join(', ')
                                : "All Students";
                            const isSideQuest = hub.hubType === 'sidequest';

                            return (
                                <AccordionItem key={hub.id} value={hub.id} className={cn(isSideQuest && "bg-yellow-100 dark:bg-yellow-900/30 rounded-md")}>
                                    <div className="flex items-center w-full">
                                        <AccordionTrigger className="text-xl hover:no-underline flex-grow">
                                            <div className="flex items-center gap-3">
                                                {isSideQuest && <BookOpen className="h-5 w-5 text-yellow-500" />}
                                                Hub: {hub.name}
                                            </div>
                                        </AccordionTrigger>
                                        <div className="flex items-center gap-4 pr-4">
                                            <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/quests/hub/edit/${hub.id}`)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit Hub
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setHubToDelete(hub)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                            <Link href={`/teacher/quests/new?hubId=${hub.id}`} passHref>
                                                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Write Chapter in this Hub
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                    <AccordionContent>
                                        <div className="pl-4 space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground pb-2">
                                                <Users className="h-4 w-4" />
                                                <span>Visible to: {visibilityText}</span>
                                            </div>
                                            {hubChapters.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {hubChapters.map(chapter => (
                                                        <li key={chapter.id} className="flex items-center justify-between p-3 rounded-md bg-secondary">
                                                            <span className="font-medium">Chapter {chapter.chapterNumber}: {chapter.title}</span>
                                                            <div className="flex items-center gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/map/${hub.id}/${chapter.id}?preview=true`)}>
                                                                    <Eye className="mr-2 h-4 w-4" /> Preview
                                                                </Button>
                                                                <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/quests/edit/${chapter.id}`)}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="destructive" size="sm" disabled={isDeleting === chapter.id}>
                                                                            {isDeleting === chapter.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                                            Delete
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                This action cannot be undone. This will permanently delete the chapter "{chapter.title}".
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDeleteChapter(chapter.id)}>
                                                                                Yes, delete chapter
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="pl-4 text-muted-foreground">No chapters have been created for this hub yet.</p>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                </CardContent>
            </Card>
        )}
      </main>
    </div>
    </>
  );
}
