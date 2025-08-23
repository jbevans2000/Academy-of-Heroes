
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { AdminHeader } from '@/components/admin/admin-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getGlobalSettings, updateGlobalSettings } from '@/ai/flows/manage-settings';
import { deleteFeedback } from '@/ai/flows/submit-feedback';
import { moderateStudent } from '@/ai/flows/manage-student';
import { deleteTeacher } from '@/ai/flows/manage-teacher';
import { Loader2, ToggleLeft, ToggleRight, RefreshCw, Star, Bug, Lightbulb, Trash2 } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';

interface Teacher {
    id: string;
    name: string;
    email: string;
    className: string;
    schoolName: string;
    studentCount: number;
}

interface Student {
    uid: string;
    studentId: string;
    studentName: string;
    characterName: string;
    teacherName: string;
    teacherId: string;
}

interface Feedback {
    id: string;
    feedbackType: 'bug' | 'feature';
    message: string;
    createdAt: {
        seconds: number;
        nanoseconds: number;
    };
    status: 'new' | 'addressed';
}

export default function AdminDashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
    const [isFeedbackPanelVisible, setIsFeedbackPanelVisible] = useState(false);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
    const [isDeletingFeedback, setIsDeletingFeedback] = useState(false);
    
    // State for deleting students
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [isDeletingStudent, setIsDeletingStudent] = useState(false);
    
    // State for deleting teachers
    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
    const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const adminRef = doc(db, 'admins', currentUser.uid);
                const adminSnap = await getDoc(adminRef);

                if (adminSnap.exists()) {
                    setUser(currentUser);
                    fetchInitialData();
                } else {
                    router.push('/teacher/dashboard');
                }
            } else {
                router.push('/teacher/login');
            }
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        await Promise.all([
            fetchTeachersAndStudents(),
            fetchSettings(),
            fetchFeedback()
        ]);
        setIsLoading(false);
    };

    const fetchTeachersAndStudents = async () => {
        try {
            const teachersSnapshot = await getDocs(collection(db, 'teachers'));
            const teachersData: Teacher[] = [];
            const studentsData: Student[] = [];

            for (const teacherDoc of teachersSnapshot.docs) {
                const teacherInfo = teacherDoc.data();
                const studentsSnapshot = await getDocs(collection(db, 'teachers', teacherDoc.id, 'students'));
                
                teachersData.push({
                    id: teacherDoc.id,
                    name: teacherInfo.name || '[No Name]',
                    email: teacherInfo.email || '[No Email]',
                    className: teacherInfo.className || '[No Class Name]',
                    schoolName: teacherInfo.schoolName || '[No School]',
                    studentCount: studentsSnapshot.size,
                });

                studentsSnapshot.forEach(studentDoc => {
                    const studentInfo = studentDoc.data();
                    studentsData.push({
                        uid: studentDoc.id,
                        studentId: studentInfo.studentId || '[No Alias]',
                        studentName: studentInfo.studentName || '[No Name]',
                        characterName: studentInfo.characterName || '[No Character]',
                        teacherName: teacherInfo.name || '[No Teacher]',
                        teacherId: teacherDoc.id,
                    });
                });
            }
            
            setTeachers(teachersData);
            setAllStudents(studentsData);

             toast({
                title: 'Data Refreshed',
                description: 'The latest guild and student data has been loaded.',
            });
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load teacher and student data.' });
        }
    };
    
    const fetchFeedback = async () => {
        try {
            const feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
            const feedbackSnapshot = await getDocs(feedbackQuery);
            const feedbackData = feedbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
            setFeedback(feedbackData);
        } catch (error) {
             console.error("Error fetching feedback:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not load feedback submissions.' });
        }
    }

    const fetchSettings = async () => {
        setIsSettingsLoading(true);
        try {
            const settings = await getGlobalSettings();
            setIsRegistrationOpen(settings.isRegistrationOpen);
            setIsFeedbackPanelVisible(settings.isFeedbackPanelVisible || false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load global settings.' });
        } finally {
            setIsSettingsLoading(false);
        }
    };
    
    const handleToggleRegistration = async () => {
        setIsSettingsLoading(true);
        try {
            const newStatus = !isRegistrationOpen;
            const result = await updateGlobalSettings({ isRegistrationOpen: newStatus });
            if (result.success) {
                setIsRegistrationOpen(newStatus);
                toast({
                    title: 'Settings Updated',
                    description: `New account registration is now ${newStatus ? 'ENABLED' : 'DISABLED'}.`
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSettingsLoading(false);
        }
    }
    
    const handleToggleFeedbackPanel = async () => {
        setIsSettingsLoading(true);
        try {
            const newStatus = !isFeedbackPanelVisible;
            const result = await updateGlobalSettings({ isFeedbackPanelVisible: newStatus });
            if (result.success) {
                setIsFeedbackPanelVisible(newStatus);
                toast({
                    title: 'Settings Updated',
                    description: `Beta Feedback Panel is now ${newStatus ? 'VISIBLE' : 'HIDDEN'}.`
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSettingsLoading(false);
        }
    }

    const handleFeedbackStatusChange = async (feedbackId: string, currentStatus: 'new' | 'addressed') => {
        const newStatus = currentStatus === 'new' ? 'addressed' : 'new';
        try {
            const feedbackRef = doc(db, 'feedback', feedbackId);
            await updateDoc(feedbackRef, { status: newStatus });
            setFeedback(prev => prev.map(item => item.id === feedbackId ? { ...item, status: newStatus } : item));
        } catch (error) {
            console.error("Error updating feedback status:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update feedback status.' });
        }
    };
    
    const handleDeleteFeedback = async () => {
        if (!feedbackToDelete) return;
        setIsDeletingFeedback(true);
        try {
            const result = await deleteFeedback(feedbackToDelete);
            if(result.success) {
                toast({ title: 'Feedback Deleted', description: 'The entry has been removed.' });
                setFeedback(prev => prev.filter(item => item.id !== feedbackToDelete));
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not delete the feedback entry.' });
        } finally {
            setIsDeletingFeedback(false);
            setFeedbackToDelete(null);
        }
    };

    const handleDeleteStudent = async () => {
        if (!studentToDelete) return;
        setIsDeletingStudent(true);
        try {
            const result = await moderateStudent({
                teacherUid: studentToDelete.teacherId,
                studentUid: studentToDelete.uid,
                action: 'delete'
            });
            if (result.success) {
                toast({ title: "Student Deleted", description: `${studentToDelete.characterName} has been removed from the system.`});
                setAllStudents(prev => prev.filter(s => s.uid !== studentToDelete.uid));
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message || 'Could not delete the student.' });
        } finally {
            setIsDeletingStudent(false);
            setStudentToDelete(null);
        }
    }
    
    const handleDeleteTeacher = async () => {
        if (!teacherToDelete) return;
        setIsDeletingTeacher(true);
        try {
            const result = await deleteTeacher(teacherToDelete.id);
            if (result.success) {
                 toast({ title: "Teacher Deleted", description: `${teacherToDelete.name}'s guild has been removed from the system.`});
                 // Refetch all data to update the UI correctly
                 fetchInitialData();
            } else {
                 throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message || 'Could not delete the teacher.' });
        } finally {
            setIsDeletingTeacher(false);
            setTeacherToDelete(null);
        }
    }


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
            <main className="flex-1 p-4 md:p-6 lg:p-8 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                 
                 <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Guilds</CardTitle>
                            <CardDescription>A list of all registered teachers and their guilds. Click the guild name to view that teacher's dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Guild Name</TableHead>
                                        <TableHead>Leader (Teacher)</TableHead>
                                        <TableHead>School</TableHead>
                                        <TableHead>Students</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {teachers.map((teacher) => (
                                        <TableRow key={teacher.id}>
                                            <TableCell>
                                                <Link href={`/teacher/dashboard?teacherId=${teacher.id}`} className="font-semibold underline hover:text-primary">
                                                    {teacher.className}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{teacher.name}</TableCell>
                                            <TableCell>{teacher.schoolName}</TableCell>
                                            <TableCell>{teacher.studentCount}</TableCell>
                                            <TableCell className="text-right">
                                                 <Button variant="destructive" size="sm" onClick={() => setTeacherToDelete(teacher)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                            {teachers.length === 0 && !isLoading && (
                                <div className="text-center py-10">
                                    <p className="text-muted-foreground">No teachers have registered yet.</p>
                                </div>
                            )}
                    </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>All Students</CardTitle>
                            <CardDescription>A complete list of every student account in the system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student Name</TableHead>
                                        <TableHead>Character Name</TableHead>
                                        <TableHead>Login Alias</TableHead>
                                        <TableHead>Guild / Teacher</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allStudents.map(student => (
                                        <TableRow key={student.uid}>
                                            <TableCell>{student.studentName}</TableCell>
                                            <TableCell>{student.characterName}</TableCell>
                                            <TableCell className="font-mono">{student.studentId}</TableCell>
                                            <TableCell>
                                                 <Link href={`/teacher/dashboard?teacherId=${student.teacherId}`} className="underline hover:text-primary">
                                                    {student.teacherName}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="destructive" size="sm" onClick={() => setStudentToDelete(student)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                 </div>

                <div className="space-y-6 lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Global Settings</CardTitle>
                            <CardDescription>Control application-wide settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Account Registration</h4>
                                    <p className={cn("text-sm font-bold", isRegistrationOpen ? 'text-green-600' : 'text-red-600')}>
                                        {isRegistrationOpen ? 'ACTIVE' : 'DISABLED'}
                                    </p>
                                </div>
                                <Button onClick={handleToggleRegistration} disabled={isSettingsLoading} size="icon">
                                    {isSettingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isRegistrationOpen ? <ToggleRight className="h-6 w-6"/> : <ToggleLeft className="h-6 w-6"/>}
                                </Button>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Refresh Data</h4>
                                    <p className="text-sm text-muted-foreground">Reload all guild and student info.</p>
                                </div>
                                <Button onClick={fetchTeachersAndStudents} disabled={isLoading} size="icon">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Beta Features</CardTitle>
                            <CardDescription>Toggle experimental features.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Feedback Panel</h4>
                                    <p className={cn("text-sm font-bold", isFeedbackPanelVisible ? 'text-green-600' : 'text-red-600')}>
                                        {isFeedbackPanelVisible ? 'ACTIVE' : 'INACTIVE'}
                                    </p>
                                </div>
                                 <Button onClick={handleToggleFeedbackPanel} disabled={isSettingsLoading} size="icon">
                                    {isSettingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isFeedbackPanelVisible ? <ToggleRight className="h-6 w-6"/> : <ToggleLeft className="h-6 w-6"/>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Teacher Feedback</CardTitle>
                            <CardDescription>Bug reports and feature requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {feedback.length === 0 ? (
                                <p className="text-muted-foreground">No feedback yet.</p>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                    {feedback.map(item => (
                                        <div key={item.id} className="p-3 border rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-2 font-bold">
                                                         {item.feedbackType === 'bug' ? <Bug className="h-4 w-4 text-destructive" /> : <Lightbulb className="h-4 w-4 text-yellow-500" />}
                                                         <span>{item.feedbackType === 'bug' ? 'Bug' : 'Feature'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <p className="text-xs text-muted-foreground">{format(new Date(item.createdAt.seconds * 1000), 'PPp')}</p>
                                                    <div className="flex items-center space-x-1">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFeedbackToDelete(item.id)}>
                                                            <Trash2 className="h-3 w-3 text-destructive" />
                                                        </Button>
                                                        <Checkbox
                                                            id={`feedback-${item.id}`}
                                                            checked={item.status === 'addressed'}
                                                            onCheckedChange={() => handleFeedbackStatusChange(item.id, item.status)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="mt-1 text-sm">{item.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <AlertDialog open={!!feedbackToDelete} onOpenChange={(isOpen) => !isOpen && setFeedbackToDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will permanently delete this feedback entry. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeletingFeedback}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteFeedback} disabled={isDeletingFeedback}>
                                    {isDeletingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog open={!!studentToDelete} onOpenChange={(isOpen) => !isOpen && setStudentToDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Student: {studentToDelete?.characterName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will permanently delete the student's account and all their character data. This action is irreversible.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeletingStudent}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteStudent} disabled={isDeletingStudent} className="bg-destructive hover:bg-destructive/90">
                                    {isDeletingStudent ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Permanently Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                     <AlertDialog open={!!teacherToDelete} onOpenChange={(isOpen) => !isOpen && setTeacherToDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Teacher: {teacherToDelete?.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will permanently delete the teacher's account and ALL associated data, including all their students, quests, and battles. This action is irreversible and cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeletingTeacher}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteTeacher} disabled={isDeletingTeacher} className="bg-destructive hover:bg-destructive/90">
                                    {isDeletingTeacher ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Permanently Delete Teacher'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </main>
        </div>
    );
}
