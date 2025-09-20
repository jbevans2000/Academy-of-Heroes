
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Rss } from 'lucide-react';
import { format } from 'date-fns';

interface BroadcastMessage {
    id: string;
    message: string;
    sentAt: {
        seconds: number;
        nanoseconds: number;
    };
}

export default function BroadcastsPage() {
    const router = useRouter();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setTeacher(user);
                // Mark broadcasts as read when the user visits this page
                const teacherRef = doc(db, 'teachers', user.uid);
                await updateDoc(teacherRef, { lastSeenBroadcastTimestamp: serverTimestamp() });
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!teacher) return;
        
        const broadcastsRef = collection(db, 'settings', 'global', 'broadcasts');
        const q = query(broadcastsRef, orderBy('sentAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastMessage));
            setBroadcasts(msgs);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [teacher]);

    return (
        <div className="relative flex flex-col min-h-screen">
            <div
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-b2ed6807-b64f-48e1-9b8c-a2d0b719db78.jpg?alt=media&token=793c0484-06f3-49ab-9557-9ca0a9b0f6bf')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <div className="absolute inset-0 -z-10 bg-background/80" />
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Podium
                    </Button>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Rss className="h-6 w-6 text-primary" />
                                Announcements from the Grandmaster
                            </CardTitle>
                            <CardDescription>A history of all broadcast messages.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            ) : broadcasts.length === 0 ? (
                                <p className="text-center text-muted-foreground py-10">No announcements have been sent.</p>
                            ) : (
                                <div className="space-y-4">
                                    {broadcasts.map(msg => (
                                        <div key={msg.id} className="p-4 border rounded-lg bg-secondary/50">
                                            <p className="text-sm text-muted-foreground">
                                                {msg.sentAt ? format(new Date(msg.sentAt.seconds * 1000), 'PPPp') : 'Just now'}
                                            </p>
                                            <p className="mt-1">{msg.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
