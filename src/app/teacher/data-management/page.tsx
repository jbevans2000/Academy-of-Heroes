
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Loader2, DatabaseZap, ArchiveRestore, EyeOff, Eye } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { deleteStudentData } from '@/ai/flows/admin-actions';
import { initiateStudentDeletion, unarchiveStudent, toggleStudentVisibility } from '@/ai/flows/manage-student';


export default function DataManagementPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [studentToAction, setStudentToAction] = useState<Student | null>(null);
    const [isDataDeleteDialogOpen, setIsDataDeleteDialogOpen] = useState(false);
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
    
    const activeStudents = useMemo(() => students.filter(s => !s.isArchived && !s.isHidden), [students]);
    const hiddenStudents = useMemo(() => students.filter(s => !s.isArchived && s.isHidden), [students]);
    const archivedStudents = useMemo(() => students.filter(s => s.isArchived), [students]);

    const handleDeleteStudentData = async () => {
        if (!teacher || !studentToAction) return;
        setIsDeleting(true);
        
        try {
            const result = await deleteStudentData({
                teacherUid: teacher.uid,
                studentUid: studentToAction.uid
            });

            if (result.success) {
                toast({
                    title: 'Student Data Deleted',
                    description: `${studentToAction.studentName}'s classroom data has been permanently removed.`,
                    duration: 6000,
                });
                // Optimistically remove from UI
                setStudents(prev => prev.filter(s => s.uid !== studentToAction.uid));
            } else {
                throw new Error(result.error || 'An unknown error occurred during data deletion.');
            }
        } catch (error: any) {
            console.error("Error deleting student data:", error);
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: error.message,
            });
        } finally {
            setIsDeleting(false);
            setIsDataDeleteDialogOpen(false);
            setStudentToAction(null);
        }
    };
    
    const handleToggleVisibility = async (student: Student, isHidden: boolean) => {
        if (!teacher) return;
        try {
            const result = await toggleStudentVisibility({ teacherUid: teacher.uid, studentUid: student.uid, isHidden });
            if (!result.success) throw new Error(result.error);
            toast({ title: `Student ${isHidden ? 'Hidden' : 'Revealed'}`, description: `${student.characterName} is now ${isHidden ? 'hidden from the main dashboard' : 'visible again'}.` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }
    
    const handleUnarchive = async (student: Student) => {
        // This function is kept for safety but the UI path to it is removed.
        if (!teacher) return;
        try {
            const result = await unarchiveStudent({ teacherUid: teacher.uid, studentUid: student.uid });
            if (result.success) {
                toast({ title: 'Student Unarchived', description: `${student.studentName} has been restored.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }


    const renderStudentTable = (studentList: Student[], type: 'active' | 'hidden') => {
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
                            <TableCell className="text-right space-x-2">
                               {type === 'active' && (
                                   <>
                                     <Button 
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleVisibility(student, true)}
                                    >
                                        <EyeOff className="mr-2 h-4 w-4" /> Hide
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => { setStudentToAction(student); setIsDataDeleteDialogOpen(true); }}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Data
                                    </Button>
                                   </>
                               )}
                               {type === 'hidden' && (
                                   <Button 
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleToggleVisibility(student, false)}
                                    >
                                        <Eye className="mr-2 h-4 w-4" /> Unhide
                                    </Button>
                               )}
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
                    <div className="w-full max-w-4xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Podium
                        </Button>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><DatabaseZap /> Data Management</CardTitle>
                                <CardDescription>
                                    Use this tool to permanently delete a student's classroom data. This action cannot be undone. Hiding a student only removes them from view on the main dashboard.
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
                                            <TabsTrigger value="active">Active ({activeStudents.length})</TabsTrigger>
                                            <TabsTrigger value="hidden">Hidden ({hiddenStudents.length})</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="active">
                                            {renderStudentTable(activeStudents, 'active')}
                                        </TabsContent>
                                        <TabsContent value="hidden">
                                            {renderStudentTable(hiddenStudents, 'hidden')}
                                        </TabsContent>
                                    </Tabs>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
            
            <AlertDialog open={isDataDeleteDialogOpen} onOpenChange={setIsDataDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Data for {studentToAction?.characterName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This will permanently delete all of this student's classroom data (progress, inventory, etc.) and remove them from your dashboard. Their login account will remain, but it will be unusable. This is the first step in permanent account deletion. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStudentData} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete All Data'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
