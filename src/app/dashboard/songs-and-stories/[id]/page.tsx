
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Star, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BattleSummary {
    id: string;
    battleName: string;
    endedAt: {
        seconds: number;
        nanoseconds: number;
    }
    xpGained: number;
    goldGained: number;
}

export default function BattleSummaryDetailPage() {
    const router = useRouter();
    const params = useParams();
    const summaryId = params.id as string;
    const { toast } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [summary, setSummary] = useState<BattleSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
        if (!user || !teacherUid || !summaryId) return;

        const fetchSummary = async () => {
            setIsLoading(true);
            try {
                const summaryRef = doc(db, 'teachers', teacherUid, 'students', user.uid, 'battleSummaries', summaryId);
                const docSnap = await getDoc(summaryRef);
                if (docSnap.exists()) {
                    setSummary({ id: docSnap.id, ...docSnap.data() } as BattleSummary);
                } else {
                    toast({ variant: 'destructive', title: 'Not Found', description: 'This battle report could not be found.' });
                    router.push('/dashboard/songs-and-stories');
                }
            } catch (error) {
                console.error("Error fetching summary:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load the battle report.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, [user, teacherUid, summaryId, router, toast]);

    if (isLoading || !summary) {
        return (
            <div className="flex flex-col min-h-screen bg-muted/40">
                 <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                    <Skeleton className="h-10 w-48" />
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <Skeleton className="h-64 w-full" />
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
                <Button variant="outline" onClick={() => router.push('/dashboard/songs-and-stories')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Battle Reports
                </Button>
            </header>
             <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
                <Card className="shadow-2xl bg-card/80 backdrop-blur-sm w-full max-w-2xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-4xl font-headline">{summary.battleName}</CardTitle>
                        <CardDescription>
                            Battle concluded on {summary.endedAt ? format(new Date(summary.endedAt.seconds * 1000), 'PPPp') : 'Date unknown'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-2xl font-semibold">Your Spoils of War</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-lg">
                                <Star className="h-12 w-12 text-yellow-400 mb-2" />
                                <p className="text-3xl font-bold">{summary.xpGained}</p>
                                <p className="text-muted-foreground">Experience Gained</p>
                            </div>
                             <div className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-lg">
                                <Coins className="h-12 w-12 text-amber-500 mb-2" />
                                <p className="text-3xl font-bold">{summary.goldGained}</p>
                                <p className="text-muted-foreground">Gold Gained</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
             </main>
        </div>
    );
}
