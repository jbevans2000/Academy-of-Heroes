
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

interface BattleSummary {
    id: string;
    battleName: string;
    endedAt: {
        seconds: number;
        nanoseconds: number;
    }
}

export default function SongsAndStoriesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [summaries, setSummaries] = useState<BattleSummary[]>([]);
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
            const summariesRef = collection(db, 'teachers', teacherUid, 'students', user.uid, 'battleSummaries');
            const q = query(summariesRef, orderBy('endedAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const summariesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BattleSummary));
            setSummaries(summariesData);
            setIsLoading(false);
        };
        fetchSummaries();
    }, [user, teacherUid]);
    
    const handleClearHistory = async () => {
        if (!user || !teacherUid) return;
        setIsDeleting(true);

        try {
            const summariesRef = collection(db, 'teachers', teacherUid, 'students', user.uid, 'battleSummaries');
            const snapshot = await getDocs(summariesRef);
            if (snapshot.empty) {
                toast({ title: "History is already clear." });
                return;
            }
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            setSummaries([]);
            toast({ title: "Battle History Cleared", description: "All your past battle reports have been removed."});

        } catch (error) {
            console.error("Error clearing summaries:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not clear your battle history." });
        } finally {
            setIsDeleting(false);
        }
    };

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
                <div className="ml-auto">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={summaries.length === 0 || isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Clear History
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to clear your history?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. All of your saved battle reports will be permanently deleted.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearHistory}>Yes, Clear History</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
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
                                                    {summary.endedAt ? format(new Date(summary.endedAt.seconds * 1000), 'PPP') : 'Date unknown'}
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
