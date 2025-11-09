'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { AdminHeader } from '@/components/admin/admin-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, ListChecks } from 'lucide-react';
import type { Student } from '@/lib/data';

interface InactiveTeacher {
    id: string;
    name: string;
    email: string;
    schoolName: string;
    className: string;
    createdAt: Date | null;
    inactivityReasons: string[];
    studentCount: number;
}

interface InactiveStudent extends Student {
    teacherName: string;
    inactivityReasons: string[];
}

export default function InactiveAccountsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [inactiveTeachers, setInactiveTeachers] = useState<InactiveTeacher[]>([]);
    const [inactiveStudents, setInactiveStudents] = useState<InactiveStudent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchInactiveData = useCallback(async () => {
        setIsLoading(true);
        try {
            const allTeachersSnapshot = await getDocs(query(collection(db, 'teachers'), orderBy('createdAt', 'desc')));
            const foundInactiveTeachers: InactiveTeacher[] = [];
            const foundInactiveStudents: InactiveStudent[] = [];

            for (const teacherDoc of allTeachersSnapshot.docs) {
                const teacherData = teacherDoc.data();
                const teacherId = teacherDoc.id;
                const reasons: string[] = [];

                const studentsSnapshot = await getDocs(collection(db, 'teachers', teacherId, 'students'));
                const pendingStudentsSnapshot = await getDocs(collection(db, 'teachers', teacherId, 'pendingStudents'));
                const hubsSnapshot = await getDocs(collection(db, 'teachers', teacherId, 'questHubs'));
                const chaptersSnapshot = await getDocs(collection(db, 'teachers', teacherId, 'chapters'));
                const boonsSnapshot = await getDocs(collection(db, 'teachers', teacherId, 'boons'));
                
                const hasOneOrFewerStudents = studentsSnapshot.size <= 1;
                const hasNoPendingStudents = pendingStudentsSnapshot.empty;
                const hasNoCreatedHubs = hubsSnapshot.empty || (hubsSnapshot.size === 1 && hubsSnapshot.docs[0].data().name === 'Independent Chapters');
                const hasNoChapters = chaptersSnapshot.empty;
                const hasNoBoons = boonsSnapshot.empty;
                
                if (hasOneOrFewerStudents) reasons.push('1 or fewer students');
                if (hasNoPendingStudents) reasons.push('No pending students');
                if (hasNoCreatedHubs) reasons.push('No custom Quest Hubs');
                if (hasNoChapters) reasons.push('No Chapters');
                if (hasNoBoons) reasons.push('No custom rewards');
                
                // A teacher is inactive if they meet ANY of the criteria.
                if (reasons.length > 0) {
                     foundInactiveTeachers.push({
                        id: teacherId,
                        name: teacherData.name,
                        email: teacherData.email,
                        schoolName: teacherData.schoolName,
                        className: teacherData.className,
                        createdAt: teacherData.createdAt?.toDate() || null,
                        inactivityReasons: reasons,
                        studentCount: studentsSnapshot.size,
                    });
                }
                
                for (const studentDoc of studentsSnapshot.docs) {
                    const studentData = studentDoc.data() as Student;
                    const studentReasons: string[] = [];
                    
                    if ((studentData.xp ?? 0) === 0) studentReasons.push('0 XP');
                    if ((studentData.gold ?? 0) === 0) studentReasons.push('0 Gold');
                    if ((studentData.level ?? 1) === 1) studentReasons.push('Level 1');
                    if (!studentData.questProgress || Object.keys(studentData.questProgress).length === 0) {
                        studentReasons.push('No quest progress');
                    }
                    
                    const isStudentInactive = studentReasons.length === 4;
                    
                    if (isStudentInactive) {
                        foundInactiveStudents.push({
                            ...studentData,
                            uid: studentDoc.id,
                            teacherName: teacherData.name,
                            inactivityReasons: studentReasons,
                        });
                    }
                }
            }
            setInactiveTeachers(foundInactiveTeachers);
            setInactiveStudents(foundInactiveStudents.sort((a, b) => a.studentName.localeCompare(b.studentName)));

        } catch (error) {
            console.error("Error fetching inactive accounts:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load inactive account data.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const adminRef = doc(db, 'admins', currentUser.uid);
                const adminSnap = await getDoc(adminRef);
                if (adminSnap.exists()) {
                    setUser(currentUser);
                    fetchInactiveData();
                } else {
                    router.push('/teacher/login');
                }
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router, fetchInactiveData]);

    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
        );
    }
    
    const renderTeacherTable = () => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Teacher Name</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Guild Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date Registered</TableHead>
                    <TableHead>Student Count</TableHead>
                    <TableHead>Inactivity Criteria</TableHead>
                    <TableHead>Teacher UID</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {inactiveTeachers.map(t => (
                    <TableRow key={t.id}>
                        <TableCell>{t.name}</TableCell>
                        <TableCell>{t.schoolName}</TableCell>
                        <TableCell>{t.className}</TableCell>
                        <TableCell>{t.email}</TableCell>
                        <TableCell>{t.createdAt ? format(t.createdAt, 'PP') : 'N/A'}</TableCell>
                        <TableCell className="text-center font-bold">{t.studentCount}</TableCell>
                        <TableCell>
                            <ul className="list-disc list-inside text-xs">
                                {t.inactivityReasons.map(reason => <li key={reason}>{reason}</li>)}
                            </ul>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    const renderStudentTable = () => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Character Name</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Inactivity Criteria</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {inactiveStudents.map(s => (
                    <TableRow key={s.uid}>
                        <TableCell>{s.studentName}</TableCell>
                        <TableCell>{s.characterName}</TableCell>
                        <TableCell>{s.teacherName}</TableCell>
                         <TableCell>
                             <ul className="list-disc list-inside text-xs">
                                {s.inactivityReasons.map(reason => <li key={reason}>{reason}</li>)}
                            </ul>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <AdminHeader onOpenMessageCenter={() => {}} onMarkAllRead={() => {}} isMarkingRead={false} hasUnreadMessages={false} />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Dashboard
                    </Button>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ListChecks className="h-6 w-6"/> Inactive Account Explorer</CardTitle>
                            <CardDescription>
                                This tool identifies accounts with no significant gameplay or setup activity, helping you gauge user engagement.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-10 w-1/2" />
                                    <Skeleton className="h-48 w-full" />
                                </div>
                            ) : (
                                <Tabs defaultValue="teachers">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="teachers">Inactive Teachers ({inactiveTeachers.length})</TabsTrigger>
                                        <TabsTrigger value="students">Inactive Students ({inactiveStudents.length})</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="teachers" className="mt-4">
                                        {inactiveTeachers.length > 0 ? renderTeacherTable() : <p className="text-center text-muted-foreground p-8">No inactive teachers found.</p>}
                                    </TabsContent>
                                    <TabsContent value="students" className="mt-4">
                                        {inactiveStudents.length > 0 ? renderStudentTable() : <p className="text-center text-muted-foreground p-8">No inactive students found.</p>}
                                    </TabsContent>
                                </Tabs>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
