
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Loader2, UserX, AlertCircle, Archive, ArrowUpDown } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { deleteStudentData } from '@/ai/flows/admin-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type SortableKey = 'studentName' | 'characterName' | 'level';
type SortDirection = 'ascending' | 'descending';

export default function DataManagementPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [studentToAction, setStudentToAction] = useState<Student | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [isFirstConfirmOpen, setIsFirstConfirmOpen] = useState(false);
    const [isSecondConfirmOpen, setIsSecondConfirmOpen] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
    
    const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: SortDirection } | null>({ key: 'studentName', direction: 'ascending'});


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
    
    const { activeStudents, hiddenStudents } = useMemo(() => {
        let active = students.filter(s => !s.isArchived && !s.isHidden);
        let hidden = students.filter(s => !s.isArchived && s.isHidden);

        const sortFunction = (a: Student, b: Student) => {
            if (!sortConfig) return 0;
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        };

        active.sort(sortFunction);
        hidden.sort(sortFunction);

        return { activeStudents: active, hiddenStudents: hidden };
    }, [students, sortConfig]);

    const requestSort = (key: SortableKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const openDeleteDialog = (student: Student) => {
        setStudentToAction(student);
        setIsFirstConfirmOpen(true);
    };

    const handleFirstConfirm = () => {
        setIsFirstConfirmOpen(false);
        setIsSecondConfirmOpen(true);
    };

    const handleDeleteStudent = async () => {
        if (!teacher || !studentToAction || deleteConfirmationText !== studentToAction.studentName) {
            toast({
                variant: 'destructive',
                title: 'Confirmation Failed',
                description: "The name entered does not match. Deletion cancelled."
            });
            return;
        }
        setIsDeleting(true);
        
        try {
            const result = await deleteStudentData({
                teacherUid: teacher.uid,
                studentUid: studentToAction.uid
            });

            if (result.success) {
                toast({
                    title: 'Student Deleted',
                    description: `${studentToAction.studentName}'s classroom data and login account have been permanently removed.`,
                    duration: 6000,
                });
            } else {
                throw new Error(result.error || 'An unknown error occurred during data deletion.');
            }
        } catch (error: any) {
            console.error("Error deleting student data and account:", error);
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: error.message,
            });
        } finally {
            setIsDeleting(false);
            setIsSecondConfirmOpen(false);
            setStudentToAction(null);
            setDeleteConfirmationText('');
        }
    };

    const renderStudentTable = (studentList: Student[]) => {
        if (studentList.length === 0 && !isLoading) {
            return <p className="text-center text-muted-foreground p-8">No students found in this category.</p>;
        }
        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                             <Button variant="ghost" onClick={() => requestSort('studentName')}>
                                Student Name <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                             <Button variant="ghost" onClick={() => requestSort('characterName')}>
                                Character Name <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                             <Button variant="ghost" onClick={() => requestSort('level')}>
                                Level <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
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
                                <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => openDeleteDialog(student)}
                                >
                                    <UserX className="mr-2 h-4 w-4" /> Delete Student
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
                    <div className="w-full max-w-4xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Podium
                        </Button>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Archive /> Retire Heroes</CardTitle>
                                <CardDescription>
                                    Permanently remove a student's data and account from the game. This action is irreversible.
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
                                        <TabsContent value="active" className="mt-4">
                                            {renderStudentTable(activeStudents)}
                                        </TabsContent>
                                        <TabsContent value="hidden" className="mt-4">
                                            {renderStudentTable(hiddenStudents)}
                                        </TabsContent>
                                    </Tabs>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
            
            <AlertDialog open={isFirstConfirmOpen} onOpenChange={setIsFirstConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This will permanently delete all data <span className="font-bold">AND</span> the login account for <span className="font-bold">{studentToAction?.studentName}</span>. This is irreversible and the student will need a new account to play again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleFirstConfirm} className="bg-destructive hover:bg-destructive/90">
                            I Understand, Proceed to Final Confirmation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <AlertDialog open={isSecondConfirmOpen} onOpenChange={setIsSecondConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                         <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive h-6 w-6"/> Final Confirmation</AlertDialogTitle>
                        <AlertDialogDescription>
                           To confirm, please type the student's full name: <span className="font-bold">{studentToAction?.studentName}</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                         <Input
                            value={deleteConfirmationText}
                            onChange={(e) => setDeleteConfirmationText(e.target.value)}
                            placeholder="Type the student's name here..."
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                             onClick={handleDeleteStudent} 
                             disabled={isDeleting || deleteConfirmationText !== studentToAction?.studentName} 
                             className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Permanently Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
