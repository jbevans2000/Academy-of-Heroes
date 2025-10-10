
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Mission } from '@/lib/missions';
import type { Student } from '@/lib/data';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, BookMarked, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface Submission {
    id: string;
    status: 'draft' | 'submitted' | 'completed';
}

interface MissionWithSubmission extends Mission {
    submissionStatus?: 'draft' | 'submitted' | 'completed' | 'Not Started';
}

export default function StudentMissionsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [missions, setMissions] = useState<MissionWithSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const studentMetaRef = doc(db, 'students', currentUser.uid);
                const metaSnap = await getDoc(studentMetaRef);
                if (metaSnap.exists()) {
                    const teacherUid = metaSnap.data().teacherUid;
                    const studentRef = doc(db, 'teachers', teacherUid, 'students', currentUser.uid);
                    const studentSnap = await getDoc(studentRef);
                    if (studentSnap.exists()) {
                        setStudent({ uid: studentSnap.id, teacherUid, ...studentSnap.data() } as Student);
                    }
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not find your student data.' });
                    router.push('/dashboard');
                }
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router, toast]);
    
    useEffect(() => {
        if (!student?.teacherUid || !student?.uid) return;

        setIsLoading(true);
        const missionsRef = collection(db, 'teachers', student.teacherUid, 'missions');
        const q = query(missionsRef, where('isAssigned', '==', true));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const assignedMissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
            
            const submissionsRef = collection(db, 'teachers', student.teacherUid, 'missions');
            const missionPromises = assignedMissions.map(async (mission) => {
                const subRef = doc(submissionsRef, mission.id, 'submissions', student.uid);
                const subSnap = await getDoc(subRef);
                const submissionStatus = subSnap.exists() ? (subSnap.data() as Submission).status : 'Not Started';
                return { ...mission, submissionStatus };
            });

            const missionsWithStatus = await Promise.all(missionPromises);
            
            setMissions(missionsWithStatus);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching missions: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load your missions.' });
            setIsLoading(false);
        });

        return () => unsubscribe();

    }, [student, toast]);


    return (
        <div 
            className="flex min-h-screen w-full flex-col bg-cover bg-center"
            style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-a78eccd5-9dd1-4ce7-bad4-44d11234177c.jpg?alt=media&token=bfe048b0-1e6c-4281-9d4e-523263132966')`}}
        >
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/dashboard')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                    <Card className="bg-card/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <BookMarked className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="text-3xl font-headline mt-2">Special Missions</CardTitle>
                            <CardDescription>Here are the special assignments from your Guild Leader.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? (
                                <div className="flex justify-center items-center py-10">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                </div>
                            ) : missions.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <p>You have no special missions at this time. Check back later!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {missions.map(mission => {
                                        let buttonText = 'View Mission';
                                        if (mission.submissionStatus === 'completed') {
                                            buttonText = 'View Report';
                                        } else if (mission.submissionStatus === 'submitted') {
                                            buttonText = 'Pending Review';
                                        }

                                        return (
                                            <Card key={mission.id} className="hover:bg-muted/50 transition-colors">
                                                 <CardHeader className="flex flex-row items-center justify-between p-4">
                                                    <div>
                                                        <CardTitle>{mission.title}</CardTitle>
                                                        <CardDescription>Status: <span className="font-bold">{mission.submissionStatus || 'Not Started'}</span></CardDescription>
                                                    </div>
                                                    <Button asChild>
                                                        <Link href={`/dashboard/missions/${mission.id}`}>{buttonText}</Link>
                                                    </Button>
                                                </CardHeader>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
