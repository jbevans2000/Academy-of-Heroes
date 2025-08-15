
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, LayoutDashboard, Edit, Trash2, Loader2, Eye } from 'lucide-react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
import { useToast } from '@/hooks/use-toast';

export default function QuestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [hubs, setHubs] = useState<QuestHub[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchQuests = async () => {
      setIsLoading(true);
      try {
          const hubsSnapshot = await getDocs(collection(db, 'questHubs'));
          const hubsData = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
          setHubs(hubsData);

          const chaptersSnapshot = await getDocs(collection(db, 'chapters'));
          const chaptersData = chaptersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
          setChapters(chaptersData);
      } catch (error) {
          console.error("Error fetching quests: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load quest data.' });
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchQuests();
  }, [toast]);

  const handleDeleteChapter = async (chapterId: string) => {
    setIsDeleting(chapterId);
    try {
        await deleteDoc(doc(db, 'chapters', chapterId));
        toast({
            title: 'Chapter Deleted',
            description: 'The chapter has been successfully removed.',
        });
        // Refresh the list locally to avoid a full re-fetch
        setChapters(prevChapters => prevChapters.filter(c => c.id !== chapterId));
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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Quests</h1>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/teacher/dashboard')} variant="outline">
              <LayoutDashboard className="mr-2 h-5 w-5" />
              Return to Dashboard
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
                                                            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/map/${chapter.hubId}/${chapter.id}?from=teacher`)}>
                                                                <Eye className="mr-2 h-4 w-4" /> View
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
