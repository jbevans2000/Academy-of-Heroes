
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { Boon } from '@/lib/boons';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Gift, PlusCircle, MinusCircle, Loader2 } from 'lucide-react';
import { adjustStudentInventory } from '@/ai/flows/manage-inventory';

export default function ManageRewardsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [rewards, setRewards] = useState<Boon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null); // studentUid-boonId

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) setTeacher(user);
            else router.push('/teacher/login');
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!teacher) return;
        
        const studentsQuery = query(collection(db, 'teachers', teacher.uid, 'students'), orderBy('characterName'));
        const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));
            setIsLoading(false);
        });

        const rewardsQuery = query(collection(db, 'teachers', teacher.uid, 'boons'), orderBy('name'));
        const unsubRewards = onSnapshot(rewardsQuery, (snapshot) => {
            setRewards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boon)));
        });

        return () => {
            unsubStudents();
            unsubRewards();
        };
    }, [teacher]);

    const handleInventoryChange = async (studentUid: string, boonId: string, change: number) => {
        if (!teacher) return;
        const updateKey = `${studentUid}-${boonId}`;
        setIsUpdating(updateKey);
        try {
            const result = await adjustStudentInventory({
                teacherUid: teacher.uid,
                studentUid,
                boonId,
                change
            });
            if (!result.success) {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: error.message
            });
        } finally {
            setIsUpdating(null);
        }
    };

    const rewardsById = useMemo(() => {
        return rewards.reduce((acc, reward) => {
            acc[reward.id] = reward;
            return acc;
        }, {} as { [id: string]: Boon });
    }, [rewards]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Gift /> Manage Student Rewards</CardTitle>
                            <CardDescription>Manually bestow or revoke rewards from your students. Changes are saved in real-time.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="sticky left-0 bg-muted z-10">Student</TableHead>
                                            {rewards.map(reward => (
                                                <TableHead key={reward.id} className="text-center">{reward.name}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map(student => (
                                            <TableRow key={student.uid}>
                                                <TableCell className="font-semibold sticky left-0 bg-card z-10">{student.characterName}</TableCell>
                                                {rewards.map(reward => {
                                                    const quantity = student.inventory?.[reward.id] || 0;
                                                    const updateKey = `${student.uid}-${reward.id}`;
                                                    const isUpdatingThis = isUpdating === updateKey;
                                                    return (
                                                        <TableCell key={reward.id} className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-6 w-6"
                                                                    onClick={() => handleInventoryChange(student.uid, reward.id, -1)}
                                                                    disabled={isUpdatingThis || quantity === 0}
                                                                >
                                                                    <MinusCircle className="h-4 w-4" />
                                                                </Button>
                                                                {isUpdatingThis ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <span className="font-bold text-lg w-6">{quantity}</span>
                                                                )}
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-6 w-6"
                                                                    onClick={() => handleInventoryChange(student.uid, reward.id, 1)}
                                                                    disabled={isUpdatingThis}
                                                                >
                                                                    <PlusCircle className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
