
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookHeart, Swords, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { format } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface IndividualBattleSummary {
  id: string;
  battleName: string;
  savedAt?: { 
    seconds: number;
    nanoseconds: number;
  };
  startedAt?: any; // Keep for sorting
  status: 'WAITING' | 'BATTLE_ENDED';
}

interface GroupBattleSummary {
    id: string;
    battleName: string;
    score: number;
    totalQuestions: number;
    completedAt: {
        seconds: number;
        nanoseconds: number;
    };
}

const sortSummaries = (summaries: IndividualBattleSummary[]) => {
    return summaries.sort((a, b) => {
        const timeA = a.startedAt?.seconds ?? a.savedAt?.seconds ?? 0;
        const timeB = b.startedAt?.seconds ?? b.savedAt?.seconds ?? 0;
        return timeB - timeA; 
    });
};

export default function BattleSummariesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [individualSummaries, setIndividualSummaries] = useState<IndividualBattleSummary[]>([]);
  const [groupSummaries, setGroupSummaries] = useState<GroupBattleSummary[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [teacher, setTeacher] = useState<User | null>(null);

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

  const fetchIndividualSummaries = useCallback((user: User) => {
    const summariesRef = collection(db, 'teachers', user.uid, 'savedBattles');
    const q = query(summariesRef);
    return onSnapshot(q, (querySnapshot) => {
        const summariesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IndividualBattleSummary));
        setIndividualSummaries(sortSummaries(summariesData));
    }, (error) => {
        console.error("Error fetching individual summaries:", error);
        toast({ variant: 'destructive', title: 'Connection Error', description: 'Could not listen for individual battle updates.' });
    });
  }, [toast]);

  const fetchGroupSummaries = useCallback((user: User) => {
    const summariesRef = collection(db, 'teachers', user.uid, 'groupBattleSummaries');
    const q = query(summariesRef, orderBy('completedAt', 'desc'));
     return onSnapshot(q, (querySnapshot) => {
        const summariesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupBattleSummary));
        setGroupSummaries(summariesData);
    }, (error) => {
        console.error("Error fetching group summaries:", error);
        toast({ variant: 'destructive', title: 'Connection Error', description: 'Could not listen for group battle updates.' });
    });
  }, [toast]);

  useEffect(() => {
    if (!teacher) return;
    setIsLoading(true);
    const unsubIndividual = fetchIndividualSummaries(teacher);
    const unsubGroup = fetchGroupSummaries(teacher);
    setIsLoading(false);
    return () => {
        unsubIndividual();
        unsubGroup();
    };
  }, [teacher, fetchIndividualSummaries, fetchGroupSummaries]);

  const handleRefresh = async () => {
    if (!teacher) return;
    setIsRefreshing(true);
    await Promise.all([
        getDocs(query(collection(db, 'teachers', teacher.uid, 'savedBattles'))),
        getDocs(query(collection(db, 'teachers', teacher.uid, 'groupBattleSummaries'))),
    ]);
    setIsRefreshing(false);
    toast({title: "Archive Refreshed", description: "The list of battle archives is up to date."})
  };
  
  const handleCleanupArchives = async () => {
    if (!teacher) return;
    setIsCleaning(true);
    try {
        const savedBattlesRef = collection(db, 'teachers', teacher.uid, 'savedBattles');
        const groupBattlesRef = collection(db, 'teachers', teacher.uid, 'groupBattleSummaries');
        const savedSnapshot = await getDocs(savedBattlesRef);
        const groupSnapshot = await getDocs(groupBattlesRef);
        
        if (savedSnapshot.empty && groupSnapshot.empty) {
            toast({ title: 'No Archives Found', description: 'There are no saved battle archives to clean up.' });
            setIsCleaning(false);
            return;
        }

        const batch = writeBatch(db);
        savedSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        groupSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        toast({ title: 'Cleanup Successful', description: `Successfully deleted ${savedSnapshot.size + groupSnapshot.size} archived battle(s).` });
    } catch (error: any) {
        console.error("Error during summary cleanup:", error);
        toast({ variant: 'destructive', title: "Cleanup Failed", description: error.message });
    } finally {
        setIsCleaning(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-muted/40">
        <TeacherHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-a832e841-3a85-4ec7-91a5-3a2168391745.jpg?alt=media&token=c5608d4b-d703-455b-8664-32b7194f4a38')`}}
    >
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => router.push('/teacher/battles')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Battle Setup
            </Button>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing}>
                    {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isCleaning}>
                            {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Clear All Archives
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This will permanently delete ALL of your saved battle archives (both individual and group). This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCleanupArchives} disabled={isCleaning}>
                                {isCleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Yes, Delete All Archives
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </div>
          <Card className="shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="inline-block bg-primary/20 p-4 rounded-full mx-auto">
                <BookHeart className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-3xl font-headline mt-4">Battle Archives</CardTitle>
              <CardDescription>
                Review the tales of your guild's past battles.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="individual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="individual">Individual Battles</TabsTrigger>
                        <TabsTrigger value="group">Group Battles</TabsTrigger>
                    </TabsList>
                    <TabsContent value="individual" className="mt-4 space-y-4">
                        {individualSummaries.length === 0 ? (
                            <div className="text-center py-10 px-6 bg-secondary/50 rounded-lg">
                                <h3 className="text-xl font-semibold">No Individual Battles Found</h3>
                                <p className="text-muted-foreground mt-2">Completed Individual Battles will be recorded here.</p>
                            </div>
                        ) : (
                            individualSummaries.map(summary => (
                                <Link key={summary.id} href={`/teacher/battle/summary/${summary.id}`} passHref>
                                    <div className="block border p-4 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-semibold text-lg">{summary.battleName}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                {summary.status === 'BATTLE_ENDED' ? 'Concluded' : 'In Progress / Ended Early'}
                                                </p>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                            {(summary.startedAt || summary.savedAt) ? format(new Date((summary.startedAt || summary.savedAt)!.seconds * 1000), 'PPPp') : 'Date unknown'}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </TabsContent>
                    <TabsContent value="group" className="mt-4 space-y-4">
                         {groupSummaries.length === 0 ? (
                            <div className="text-center py-10 px-6 bg-secondary/50 rounded-lg">
                                <h3 className="text-xl font-semibold">No Group Battles Found</h3>
                                <p className="text-muted-foreground mt-2">Saved Group Battle summaries will be recorded here.</p>
                            </div>
                        ) : (
                           groupSummaries.map(summary => (
                                <Link key={summary.id} href={`/teacher/battle/group-summary/${summary.id}`} passHref>
                                    <div className="block border p-4 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-semibold text-lg">{summary.battleName}</h3>
                                                <p className="font-bold text-xl">Score: {summary.score} / {summary.totalQuestions}</p>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {summary.completedAt ? format(new Date(summary.completedAt.seconds * 1000), 'PPPp') : 'Date unknown'}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
