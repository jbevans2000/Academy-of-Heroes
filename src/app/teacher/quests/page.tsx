
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, LayoutDashboard, Edit, Trash2, Loader2, Eye, Wrench, Image as ImageIcon, Upload, X } from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { QuestHub, Chapter } from '@/lib/quests';
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

export default function QuestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [hubs, setHubs] = useState<QuestHub[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<User | null>(null);
  
  // State for world map dialog
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [worldMapUrl, setWorldMapUrl] = useState('');
  const [mapImageFile, setMapImageFile] = useState<File | null>(null);
  const [isUploadingMap, setIsUploadingMap] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

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

    const unsubHubs = onSnapshot(hubsRef, (querySnapshot) => {
        const hubsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
        hubsData.sort((a,b) => a.hubOrder - b.hubOrder);
        setHubs(hubsData);
    });
    
    const unsubChapters = onSnapshot(chaptersRef, (querySnapshot) => {
        const chaptersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
        setChapters(chaptersData);
    });
    
    const unsubTeacher = onSnapshot(teacherRef, (docSnap) => {
        if (docSnap.exists()) {
            setWorldMapUrl(docSnap.data().worldMapUrl || '');
        }
        setIsLoading(false);
    });

    return () => {
        unsubHubs();
        unsubChapters();
        unsubTeacher();
    };
  }, [teacher]);

  const handleDeleteChapter = async (chapterId: string) => {
    if (!teacher) return;
    setIsDeleting(chapterId);
    try {
        await deleteDoc(doc(db, 'teachers', teacher.uid, 'chapters', chapterId));
        toast({
            title: 'Chapter Deleted',
            description: 'The chapter has been successfully removed.',
        });
    } catch (error) {
        console.error('Error deleting chapter:', error);
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: 'Could not delete the chapter. Please try again.',
        });
    } finally {
        setIsDeleting(null);
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
    <div className="flex min-h-screen w-full flex-col">
       <Dialog open={isMapDialogOpen} onOpenChange={setIsMapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your World Map Image</DialogTitle>
            <DialogDescription>
              Upload a new image to serve as the world map for your quests.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="flex items-center gap-2">
                <Label htmlFor="map-upload" className={cn(buttonVariants({ variant: 'default' }), "cursor-pointer")}>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                </Label>
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
          <DialogFooter className="sm:justify-end">
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
                            This will remove your custom world map and revert to the default image. Your hub positions will be kept.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevertToDefault} className="bg-destructive hover:bg-destructive/90">
                            Yes, Revert
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
                <Button onClick={() => router.push('/teacher/quests/new')} className="mt-4">
                <PlusCircle className="mr-2 h-5 w-5" />
                Create Your First Quest
                </Button>
            </div>
        ) : (
             <Card>
                <CardHeader>
                    <CardTitle>All Created Quests</CardTitle>
                    <CardDescription>Here are all the hubs and chapters you have created so far.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full">
                        {hubs.map(hub => {
                            const hubChapters = chapters.filter(c => c.hubId === hub.id).sort((a,b) => a.chapterNumber - b.chapterNumber);
                            return (
                                <AccordionItem key={hub.id} value={hub.id}>
                                    <AccordionTrigger className="text-xl hover:no-underline">
                                        Hub: {hub.name}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        {hubChapters.length > 0 ? (
                                            <ul className="space-y-2 pl-4">
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
  );
}
