
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, writeBatch, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookHeart, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
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
import { format } from 'date-fns';

interface SavedBattle {
    id: string;
    battleName: string;
    savedAt: {
        seconds: number;
        nanoseconds: number;
    };
    responsesByRound: {
        [roundIndex: string]: {
            responses: {
                studentUid: string;
            }[];
        };
    };
}

export default function SongsAndStoriesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [summaries, setSummaries] = useState<SavedBattle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const studentMetaRef = doc(db, 'students', currentUser.uid);
                const studentMetaSnap = await getDoc(studentMetaRef);
                if (studentMetaSnap.exists()) {
                    setTeacherUid(studentMetaSnap.data().teacherUid);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not identify your guild.' });
                    router.push('/dashboard');
                }
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router, toast]);

    useEffect(() => {
        if (!user || !teacherUid) return;

        const fetchSummaries = async () => {
            setIsLoading(true);
            const summariesRef = collection(db, 'teachers', teacherUid, 'savedBattles');
            const q = query(summariesRef, orderBy('savedAt', 'desc'));
            const querySnapshot = await getDocs(q);

            const allSummaries = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedBattle));
            
            // Filter summaries to only include those where the current student participated
            const studentSummaries = allSummaries.filter(summary => {
                return Object.values(summary.responsesByRound || {}).some(round => 
                    (round.responses || []).some(response => response.studentUid === user.uid)
                );
            });

            setSummaries(studentSummaries);
            setIsLoading(false);
        };
        fetchSummaries();
    }, [user, teacherUid]);
    
    // NOTE: Students cannot clear their own history from this page. 
    // This action would need to be re-thought as it would now delete from the teacher's collection.

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-muted/40">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                    <Button variant="outline" onClick={() => router.push('/dashboard')}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div 
            className="flex flex-col min-h-screen bg-cover bg-center"
            style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-a832e841-3a85-4ec7-91a5-3a2168391745.jpg?alt=media&token=c5608d4b-d703-455b-8664-32b7194f4a38')`}}
        >
             <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>
            </header>
             <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                     <Card className="shadow-lg bg-card/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <div className="inline-block bg-primary/20 p-4 rounded-full mx-auto">
                                <BookHeart className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl font-headline mt-4">Songs and Stories</CardTitle>
                            <CardDescription>
                                Review the tales of your past battles and relive your moments of glory.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {summaries.length === 0 ? (
                                <div className="text-center py-10 px-6 bg-secondary/50 rounded-lg">
                                    <h3 className="text-xl font-semibold">The Archives are Quiet</h3>
                                    <p className="text-muted-foreground mt-2">
                                        You have not yet completed any boss battles. Your heroic deeds will be recorded here once you do!
                                    </p>
                                </div>
                            ) : (
                                summaries.map(summary => (
                                    <Link key={summary.id} href={`/dashboard/songs-and-stories/${summary.id}`} passHref>
                                        <div className="block border p-4 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-semibold text-lg">{summary.battleName}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {summary.savedAt ? format(new Date(summary.savedAt.seconds * 1000), 'PPP') : 'Date unknown'}
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
