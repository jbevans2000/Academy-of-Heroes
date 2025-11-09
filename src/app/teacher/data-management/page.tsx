
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trash2, Loader2, DatabaseZap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteStudent } from '@/ai/flows/admin-actions';


export default function DataManagementPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
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
        const studentsQuery = query(collection(db, "teachers", teacher.uid, "students"), orderBy("studentName"));
        const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
            setStudents(studentsData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [teacher]);

    const activeStudents = useMemo(() => students.filter(s => !s.isHidden), [students]);
    const hiddenStudents = useMemo(() => students.filter(s => s.isHidden), [students]);

    const handleDelete = async () => {
        if (!teacher || !studentToDelete) return;
        setIsDeleting(true);
        
        try {
            const result = await deleteStudent({
                teacherUid: teacher.uid,
                studentUid: studentToDelete.uid
            });

            if (result.success) {
                toast({
                    title: 'Student Deleted',
                    description: `${studentToDelete.studentName}'s account and all associated data have been permanently deleted.`,
                });
                // The onSnapshot listener will automatically update the UI
            } else {
                throw new Error(result.error || 'An unknown error occurred during deletion.');
            }

        } catch (error: any) {
            console.error("Error deleting student:", error);
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: error.message,
            });
        } finally {
            setIsDeleting(false);
            setStudentToDelete(null);
        }
    };


    const renderStudentTable = (studentList: Student[]) => {
        if (studentList.length === 0) {
            return <p className="text-center text-muted-foreground p-8">No students in this category.</p>;
        }
        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Character Name</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {studentList.map(student => (
                        <TableRow key={student.uid}>
                            <TableCell className="font-medium">{student.studentName}</TableCell>
                            <TableCell>{student.characterName}</TableCell>
                            <TableCell>{student.level}</TableCell>
                            <TableCell className="text-right">
                                <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => setStudentToDelete(student)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Podium
                        </Button>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><DatabaseZap /> Data Management</CardTitle>
                                <CardDescription>
                                    Use this tool to permanently delete a student's login account and all of their associated game data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ) : (
                                    <Tabs defaultValue="active">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="active">Active Students ({activeStudents.length})</TabsTrigger>
                                            <TabsTrigger value="hidden">Hidden Students ({hiddenStudents.length})</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="active">
                                            {renderStudentTable(activeStudents)}
                                        </TabsContent>
                                        <TabsContent value="hidden">
                                            {renderStudentTable(hiddenStudents)}
                                        </TabsContent>
                                    </Tabs>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
             <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the login account and all game data for <strong className="font-bold">{studentToDelete?.studentName} ({studentToDelete?.characterName})</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete Account & Data'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
