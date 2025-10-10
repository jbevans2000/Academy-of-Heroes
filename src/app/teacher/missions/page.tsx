
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Mission } from '@/lib/missions';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, BookOpen, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function MissionsPage() {
    const router = useRouter();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
        const missionsRef = collection(db, 'teachers', teacher.uid, 'missions');
        const q = query(missionsRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission)));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [teacher]);

    return (
        <div 
            className="flex min-h-screen w-full flex-col bg-cover bg-center"
            style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-a78eccd5-9dd1-4ce7-bad4-44d11234177c.jpg?alt=media&token=bfe048b0-1e6c-4281-9d4e-523263132966')`}}
        >
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={() => router.push('/teacher/dashboard')} className="bg-background/80">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Podium
                        </Button>
                        <Button onClick={() => router.push('/teacher/missions/new')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create New Mission
                        </Button>
                    </div>

                    <Card className="bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BookOpen /> Special Missions</CardTitle>
                            <CardDescription>Manage your custom assignments. Students will see assigned missions on their dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            ) : missions.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-muted-foreground">You haven't created any special missions yet.</p>
                                    <Button onClick={() => router.push('/teacher/missions/new')} className="mt-4">Create Your First Mission</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {missions.map(mission => (
                                        <Card key={mission.id} className="hover:bg-muted/50 transition-colors">
                                             <CardHeader className="flex flex-row items-center justify-between p-4">
                                                <div>
                                                    <CardTitle className="flex items-center gap-2">
                                                        {mission.title}
                                                        <Badge variant={mission.isAssigned ? 'default' : 'secondary'}>
                                                            {mission.isAssigned ? 'Assigned' : 'Draft'}
                                                        </Badge>
                                                    </CardTitle>
                                                    <CardDescription>Created on {mission.createdAt ? format(new Date(mission.createdAt.seconds * 1000), 'PP') : 'date unknown'}</CardDescription>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/teacher/missions/edit/${mission.id}`}>Edit</Link>
                                                    </Button>
                                                     <Button variant="secondary" size="sm" asChild>
                                                        <Link href={`/teacher/missions/submissions/${mission.id}`}>Submissions</Link>
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
