
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { AdminHeader } from '@/components/admin/admin-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BattleTestPanel } from '@/components/admin/battle-test-panel';

interface Teacher {
    id: string;
    name: string;
    email: string;
    className: string;
    schoolName: string;
    studentCount: number;
}

export default function AdminDashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Verify if the user is an admin
                const adminRef = doc(db, 'admins', currentUser.uid);
                const adminSnap = await getDoc(adminRef);

                if (adminSnap.exists()) {
                    setUser(currentUser);
                    fetchTeachers();
                } else {
                    // Not an admin, redirect to teacher dashboard
                    router.push('/teacher/dashboard');
                }
            } else {
                // No user logged in, redirect to login
                router.push('/teacher/login');
            }
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const fetchTeachers = async () => {
        setIsLoading(true);
        try {
            const teachersSnapshot = await getDocs(collection(db, 'teachers'));
            const teachersData = await Promise.all(teachersSnapshot.docs.map(async (teacherDoc) => {
                const studentsSnapshot = await getDocs(collection(db, 'teachers', teacherDoc.id, 'students'));
                return {
                    id: teacherDoc.id,
                    name: teacherDoc.data().name,
                    email: teacherDoc.data().email,
                    className: teacherDoc.data().className,
                    schoolName: teacherDoc.data().schoolName,
                    studentCount: studentsSnapshot.size,
                };
            }));
            setTeachers(teachersData);
        } catch (error: any) {
            console.error("Error fetching teachers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading || !user) {
        return (
            <div className="flex min-h-screen w-full flex-col">
                <AdminHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <Skeleton className="h-10 w-1/3 mb-6" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                    </div>
                </main>
            </div>
        );
    }


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <AdminHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
                 <BattleTestPanel adminUid={user.uid} />
                 
                 <Card>
                    <CardHeader>
                        <CardTitle>All Guilds</CardTitle>
                        <CardDescription>A list of all registered teachers and their guilds.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {teachers.map((teacher) => (
                                <Card key={teacher.id}>
                                    <CardHeader>
                                        <CardTitle>{teacher.className}</CardTitle>
                                        <CardDescription>{teacher.name} - {teacher.schoolName}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="font-semibold">{teacher.studentCount} student(s)</p>
                                        <p className="text-sm text-muted-foreground">{teacher.email}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        {teachers.length === 0 && !isLoading && (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">No teachers have registered yet.</p>
                            </div>
                        )}
                   </CardContent>
                </Card>
            </main>
        </div>
    );
}
