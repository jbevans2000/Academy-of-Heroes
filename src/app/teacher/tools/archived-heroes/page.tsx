
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Archive, ArchiveRestore, Loader2 } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { unarchiveStudent } from '@/ai/flows/manage-student';
import { useToast } from '@/hooks/use-toast';

export default function ArchivedHeroesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [archivedStudents, setArchivedStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [teacher, setTeacher] = useState<User | null>(null);
    const [isUnarchiving, setIsUnarchiving] = useState<string | null>(null);

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
        const q = query(collection(db, 'teachers', teacher.uid, 'students'), where('isArchived', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
            setArchivedStudents(studentsData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [teacher]);
    
    const handleUnarchive = async (studentUid: string) => {
        if (!teacher) return;
        setIsUnarchiving(studentUid);
        try {
            const result = await unarchiveStudent({ teacherUid: teacher.uid, studentUid });
            if (result.success) {
                toast({ title: "Student Unarchived", description: "The student has been restored and can log in again."});
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to unarchive student.' });
        } finally {
            setIsUnarchiving(null);
        }
    }


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                    <Card className="shadow-2xl">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Archive className="h-8 w-8 text-primary" />
                                <div>
                                    <CardTitle className="text-3xl">Archived Heroes</CardTitle>
                                    <CardDescription>
                                        This is a list of student accounts that have been archived after a data migration. Their login is disabled.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : archivedStudents.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No heroes have been archived yet.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Character Name</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Final Level</TableHead>
                                            <TableHead>Login Alias</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {archivedStudents.map(student => (
                                            <TableRow key={student.uid}>
                                                <TableCell className="font-bold">{student.characterName}</TableCell>
                                                <TableCell>{student.studentName}</TableCell>
                                                <TableCell>{student.level}</TableCell>
                                                <TableCell className="font-mono">{student.studentId}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleUnarchive(student.uid)}
                                                        disabled={isUnarchiving === student.uid}
                                                    >
                                                        {isUnarchiving === student.uid ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <ArchiveRestore className="mr-2 h-4 w-4" />
                                                        )}
                                                        Unarchive
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
