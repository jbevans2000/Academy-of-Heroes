
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Loader2, DatabaseZap, ArchiveRestore } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { deleteStudentData } from '@/ai/flows/admin-actions';
import { initiateStudentDeletion } from '@/ai/flows/manage-student';


export default function DataManagementPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Dialog states
    const [studentToAction, setStudentToAction] = useState<Student | null>(null);
    const [isDataDeleteDialogOpen, setIsDataDeleteDialogOpen] = useState(false);
    const [isFlagConfirmOpen, setIsFlagConfirmOpen] = useState(false);

    // Loading states
    const [isDeletingData, setIsDeletingData] = useState(false);
    const [isFlagging, setIsFlagging] = useState(false);

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
    
    const activeStudents = useMemo(() => students.filter(s => !s.isArchived), [students]);
    const archivedStudents = useMemo(() => students.filter(s => s.isArchived), [students]);

    const handleDeleteData = async () => {
        if (!teacher || !studentToAction) return;
        setIsDeletingData(true);
        
        try {
            const result = await deleteStudentData({
                teacherUid: teacher.uid,
                studentUid: studentToAction.uid
            });

            if (result.success) {
                toast({
                    title: 'Data Archived',
                    description: `${studentToAction.studentName}'s classroom data has been archived. You can now flag their login for permanent deletion.`,
                    duration: 6000,
                });
            } else {
                throw new Error(result.error || 'An unknown error occurred during data archiving.');
            }
        } catch (error: any) {
            console.error("Error deleting student data:", error);
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: error.message,
            });
        } finally {
            setIsDeletingData(false);
            setIsDataDeleteDialogOpen(false);
            setStudentToAction(null);
        }
    };

    const handleFlagForRemoval = async () => {
        if (!teacher || !studentToAction) return;
        setIsFlagging(true);
        try {
            const result = await initiateStudentDeletion({
                teacherUid: teacher.uid,
                studentUid: studentToAction.uid,
            });

            if (result.success) {
                 toast({
                    title: 'Account Flagged for Deletion',
                    description: `${studentToAction.studentName}'s login will be deleted on their next attempt.`,
                    duration: 8000,
                });
                // Remove the student from the local state to update UI immediately
                setStudents(prev => prev.filter(s => s.uid !== studentToAction.uid));
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Flagging Failed',
                description: error.message,
            });
        } finally {
            setIsFlagging(false);
            setIsFlagConfirmOpen(false);
            setStudentToAction(null);
        }
    }


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
                                {!student.isArchived ? (
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => { setStudentToAction(student); setIsDataDeleteDialogOpen(true); }}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Data
                                    </Button>
                                ) : (
                                     <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => { setStudentToAction(student); setIsFlagConfirmOpen(true); }}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Flag for Removal
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
                                    Use this two-step process to permanently delete student accounts.
                                    <br /><strong>Step 1:</strong> Delete the student's classroom data. This archives their account.
                                    <br /><strong>Step 2:</strong> Flag the archived account for permanent login removal.
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
                                            <TabsTrigger value="archived">Archived Students ({archivedStudents.length})</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="active">
                                            {renderStudentTable(activeStudents)}
                                        </TabsContent>
                                        <TabsContent value="archived">
                                            {renderStudentTable(archivedStudents)}
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
                        <AlertDialogTitle>Delete Student Data for {studentToAction?.characterName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete all of this student's classroom data (progress, inventory, etc.) and move them to the "Archived" tab. Their login account will NOT be deleted yet. This is the first step in the permanent deletion process.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingData}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteData} disabled={isDeletingData} className="bg-destructive hover:bg-destructive/90">
                            {isDeletingData ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete Data'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <AlertDialog open={isFlagConfirmOpen} onOpenChange={setIsFlagConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Flag {studentToAction?.characterName} for Final Removal?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This will permanently flag the student's login account for deletion. The next time they try to log in, their account will be erased. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isFlagging}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleFlagForRemoval} disabled={isFlagging} className="bg-destructive hover:bg-destructive/90">
                            {isFlagging ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Flag for Removal'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
