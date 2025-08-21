
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookHeart, Swords, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { format } from 'date-fns';

interface SavedBattleSummary {
  id: string;
  battleName: string;
  savedAt: {
    seconds: number;
    nanoseconds: number;
  };
}

export default function BattleSummariesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [summaries, setSummaries] = useState<SavedBattleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const fetchSummaries = useCallback(async (user: User) => {
    if (isRefreshing) return; // Prevent multiple fetches
    setIsLoading(true);
    try {
      const summariesRef = collection(db, 'teachers', user.uid, 'savedBattles');
      const q = query(summariesRef, orderBy('savedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const summariesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SavedBattleSummary));
      setSummaries(summariesData);
    } catch (error) {
      console.error("Error fetching summaries:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch battle summaries.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, isRefreshing]);

  useEffect(() => {
    if (!teacher) return;
  
    const summariesRef = collection(db, 'teachers', teacher.uid, 'savedBattles');
    const q = query(summariesRef, orderBy('savedAt', 'desc'));
  
    // Initial load and real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const summariesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SavedBattleSummary));
      setSummaries(summariesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error with real-time listener:", error);
      toast({ variant: 'destructive', title: 'Connection Error', description: 'Could not listen for real-time updates.' });
      setIsLoading(false);
    });
  
    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, [teacher, toast]);

  const handleRefresh = async () => {
    if (!teacher) return;
    setIsRefreshing(true);
    await fetchSummaries(teacher);
    setTimeout(() => setIsRefreshing(false), 500); // give some visual feedback
  };

  if (isLoading && summaries.length === 0) {
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
            <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh the Archive
            </Button>
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
            <CardContent className="space-y-4">
              {summaries.length === 0 && !isLoading ? (
                <div className="text-center py-10 px-6 bg-secondary/50 rounded-lg">
                  <h3 className="text-xl font-semibold">Your Guild Has No History of Battle!</h3>
                  <p className="text-muted-foreground mt-2">
                    Once you complete a boss battle, a summary report will be archived here.
                  </p>
                  <Button className="mt-4" onClick={() => router.push('/teacher/battles')}>
                      <Swords className="mr-2 h-4 w-4" /> Go to Battles
                  </Button>
                </div>
              ) : (
                summaries.map(summary => (
                  <Link key={summary.id} href={`/teacher/battle/summary/${summary.id}`} passHref>
                    <div className="block border p-4 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg">{summary.battleName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {summary.savedAt ? format(new Date(summary.savedAt.seconds * 1000), 'PPPp') : 'Date unknown'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
