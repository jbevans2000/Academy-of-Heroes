
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { AdminHeader } from '@/components/admin/admin-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getGlobalSettings, updateGlobalSettings } from '@/ai/flows/manage-settings';
import { deleteFeedback } from '@/ai/flows/submit-feedback';
import { moderateStudent } from '@/ai/flows/manage-student';
import { deleteTeacher } from '@/ai/flows/manage-teacher';
import { Loader2, ToggleLeft, ToggleRight, RefreshCw, Star, Bug, Lightbulb, Trash2, Diamond, Wrench, ChevronDown, Upload, TestTube2, CheckCircle, XCircle, Box, ArrowUpDown, Send, MessageCircle } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { DirectPromptInterface } from '@/components/admin/direct-prompt-interface';
import { Textarea } from '@/components/ui/textarea';

type SortDirection = 'asc' | 'desc';
type TeacherSortKey = 'className' | 'name' | 'email' | 'schoolName' | 'studentCount' | 'createdAt';
type StudentSortKey = 'studentName' | 'characterName' | 'studentId' | 'teacherName' | 'createdAt';

interface Teacher {
    id: string;
    name: string;
    email: string;
    className: string;
    schoolName: string;
    studentCount: number;
    createdAt: Date | null;
}

interface Student {
    uid: string;
    studentId: string;
    studentName: string;
    characterName: string;
    teacherName: string;
    teacherId: string;
    createdAt: Date | null;
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
    teacherName?: string;
    teacherEmail?: string;
}

export default function AdminDashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isStudentRegistrationOpen, setIsStudentRegistrationOpen] = useState(true);
    const [isTeacherRegistrationOpen, setIsTeacherRegistrationOpen] = useState(true);
    const [isFeedbackPanelVisible, setIsFeedbackPanelVisible] = useState(false);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
    const [isDeletingFeedback, setIsDeletingFeedback] = useState(false);
    
    // Broadcast message state
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

    // Sorting state
    const [teacherSortConfig, setTeacherSortConfig] = useState<{ key: TeacherSortKey; direction: SortDirection } | null>({ key: 'className', direction: 'asc' });
    const [studentSortConfig, setStudentSortConfig] = useState<{ key: StudentSortKey; direction: SortDirection } | null>({ key: 'studentName', direction: 'asc' });

    // State for deleting students
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [isDeletingStudent, setIsDeletingStudent] = useState(false);
    
    // State for deleting teachers
    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
    const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

    // State for Phase Zero Permissions Verifier
    const [testFile, setTestFile] = useState<File | null>(null);
    const [fetchStatus, setFetchStatus] = useState<{ok: boolean, status: number} | null>(null);
    const [isTesting, setIsTesting] = useState(false);

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
                    createdAt: teacherInfo.createdAt?.toDate() || null,
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
                        createdAt: studentInfo.createdAt?.toDate() || null,
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

     const sortedTeachers = useMemo(() => {
        let sortableItems = [...teachers];
        if (teacherSortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[teacherSortConfig.key];
                const bValue = b[teacherSortConfig.key];
                if (aValue < bValue) return teacherSortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return teacherSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [teachers, teacherSortConfig]);

    const sortedStudents = useMemo(() => {
        let sortableItems = [...allStudents];
        if (studentSortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[studentSortConfig.key];
                const bValue = b[studentSortConfig.key];
                if (aValue < bValue) return studentSortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return teacherSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [allStudents, studentSortConfig]);

    const requestSort = (key: TeacherSortKey | StudentSortKey, type: 'teacher' | 'student') => {
        const config = type === 'teacher' ? teacherSortConfig : studentSortConfig;
        const setConfig = type === 'teacher' ? setTeacherSortConfig : setStudentSortConfig;
        
        let direction: SortDirection = 'asc';
        if (config && config.key === key && config.direction === 'asc') {
            direction = 'desc';
        }
        setConfig({ key, direction } as any);
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
            setIsStudentRegistrationOpen(settings.isStudentRegistrationOpen);
            setIsTeacherRegistrationOpen(settings.isTeacherRegistrationOpen);
            setIsFeedbackPanelVisible(settings.isFeedbackPanelVisible || false);
            setBroadcastMessage(settings.broadcastMessage || '');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load global settings.' });
        } finally {
            setIsSettingsLoading(false);
        }
    };
    
    const handleToggleStudentRegistration = async () => {
        setIsSettingsLoading(true);
        try {
            const newStatus = !isStudentRegistrationOpen;
            const result = await updateGlobalSettings({ isStudentRegistrationOpen: newStatus });
            if (result.success) {
                setIsStudentRegistrationOpen(newStatus);
                toast({
                    title: 'Settings Updated',
                    description: `Student account registration is now ${newStatus ? 'ENABLED' : 'DISABLED'}.`
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

    const handleToggleTeacherRegistration = async () => {
        setIsSettingsLoading(true);
        try {
            const newStatus = !isTeacherRegistrationOpen;
            const result = await updateGlobalSettings({ isTeacherRegistrationOpen: newStatus });
            if (result.success) {
                setIsTeacherRegistrationOpen(newStatus);
                toast({
                    title: 'Settings Updated',
                    description: `Teacher account registration is now ${newStatus ? 'ENABLED' : 'DISABLED'}.`
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

    const handleSendBroadcast = async () => {
        if (!broadcastMessage.trim()) {
            toast({ variant: 'destructive', title: 'Message Empty', description: 'Cannot send an empty broadcast message.' });
            return;
        }
        setIsSendingBroadcast(true);
        try {
            const result = await updateGlobalSettings({
                broadcastMessage: broadcastMessage,
                broadcastMessageId: new Date().toISOString(), // Unique ID for this message
            });
            if (result.success) {
                toast({ title: 'Broadcast Sent!', description: 'The message will be shown to teachers on their next login.' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Send Failed', description: error.message });
        } finally {
            setIsSendingBroadcast(false);
        }
    };
    
    const handleClearBroadcast = async () => {
        setIsSendingBroadcast(true);
        try {
            const result = await updateGlobalSettings({
                broadcastMessage: '',
                broadcastMessageId: '',
            });
            if (result.success) {
                setBroadcastMessage('');
                toast({ title: 'Broadcast Cleared', description: 'The announcement has been removed.' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Clear Failed', description: error.message });
        } finally {
            setIsSendingBroadcast(false);
        }
    };

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

    const handleTestPermissions = async () => {
        if (!testFile || !user) {
            toast({ variant: 'destructive', title: 'No File', description: 'Please select a .glb file to test.'});
            return;
        }
        setIsTesting(true);
        setFetchStatus(null);
        try {
            // 1. Upload the file with correct metadata
            const storage = getStorage(app);
            const storagePath = `permission-test-models/${user.uid}/${uuidv4()}_${testFile.name}`;
            const storageRef = ref(storage, storagePath);
            const metadata = { contentType: 'model/gltf-binary' };
            await uploadBytes(storageRef, testFile, metadata);
            const downloadUrl = await getDownloadURL(storageRef);
            
            // 2. Fetch the file via our server-side API proxy
            const response = await fetch(`/api/fetch-glb?url=${encodeURIComponent(downloadUrl)}`);
            setFetchStatus({ ok: response.ok, status: response.status });

            if(response.ok) {
                 toast({ title: 'Fetch Succeeded!', description: `Successfully fetched the file with status: ${response.status}` });
            } else {
                 toast({ variant: 'destructive', title: 'Fetch Failed', description: `Received status: ${response.status}. The file may not be publicly accessible or the API route failed.`});
            }
        } catch (error: any) {
            console.error("Permission Test Error:", error);
            const errorMessage = error.message || 'An unknown error occurred during upload or fetch.';
            toast({ variant: 'destructive', title: 'Permission Test Error', description: `Could not complete the test. ${errorMessage}` });
            setFetchStatus({ ok: false, status: 0 });
        } finally {
            setIsTesting(false);
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
            <main className="flex-1 p-4 md:p-6 lg:p-8 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                 
                 <div className="lg:col-span-3 space-y-6">
                    {/* Broadcast Message Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircle className="h-6 w-6 text-primary" />
                                Broadcast to Teachers
                            </CardTitle>
                            <CardDescription>
                                Send a pop-up message that all teachers will see on their next login. Useful for maintenance notices or announcements.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="Enter your announcement..."
                                value={broadcastMessage}
                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                rows={4}
                                disabled={isSendingBroadcast}
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleSendBroadcast} disabled={isSendingBroadcast || !broadcastMessage.trim()}>
                                    {isSendingBroadcast ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Send Broadcast
                                </Button>
                                {broadcastMessage && (
                                     <Button variant="destructive" onClick={handleClearBroadcast} disabled={isSendingBroadcast}>
                                        {isSendingBroadcast ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                        Clear Broadcast
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Direct Prompt Interface */}
                    <DirectPromptInterface />

                    {/* Phase Zero Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><TestTube2 className="h-6 w-6 text-primary" /> [Phase Zero] Permissions Verifier</CardTitle>
                            <CardDescription>A temporary tool to verify that a .glb file can be uploaded with public permissions and then fetched correctly.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="space-y-2">
                                <Label htmlFor="glb-file-input" className="font-medium">1. Select a .glb file to upload</Label>
                                <Input 
                                    id="glb-file-input"
                                    type="file"
                                    accept=".glb"
                                    onChange={(e) => setTestFile(e.target.files ? e.target.files[0] : null)}
                                />
                           </div>
                            <Button onClick={handleTestPermissions} disabled={isTesting || !testFile}>
                                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Upload & Test Fetch
                            </Button>
                            {fetchStatus && (
                                 <div className={cn(
                                     "p-4 rounded-md font-bold text-lg flex items-center gap-2",
                                     fetchStatus.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                 )}>
                                    {fetchStatus.ok ? <CheckCircle /> : <XCircle />}
                                    Fetch {fetchStatus.ok ? 'Succeeded' : 'Failed'}! Status: {fetchStatus.status}
                                 </div>
                            )}
                        </CardContent>
                    </Card>

                    <Collapsible>
                        <Card>
                            <CollapsibleTrigger asChild>
                                <div className="flex w-full cursor-pointer items-center justify-between p-6">
                                    <div>
                                        <CardTitle>All Guilds</CardTitle>
                                        <CardDescription>A list of all registered teachers and their guilds. Click the guild name to view that teacher's dashboard.</CardDescription>
                                    </div>
                                    <ChevronDown className="h-6 w-6 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('className', 'teacher')}>Guild Name <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('name', 'teacher')}>Leader (Teacher) <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead>Teacher UID</TableHead>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('email', 'teacher')}>Email <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('schoolName', 'teacher')}>School <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('studentCount', 'teacher')}>Students <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('createdAt', 'teacher')}>Date Created <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedTeachers.map((teacher) => (
                                                <TableRow key={teacher.id}>
                                                    <TableCell>
                                                        <Link href={`/teacher/dashboard?teacherId=${teacher.id}`} className="font-semibold underline hover:text-primary">
                                                            {teacher.className}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>{teacher.name}</TableCell>
                                                    <TableCell className="font-mono text-xs">{teacher.id}</TableCell>
                                                    <TableCell>{teacher.email}</TableCell>
                                                    <TableCell>{teacher.schoolName}</TableCell>
                                                    <TableCell>{teacher.studentCount}</TableCell>
                                                    <TableCell>{teacher.createdAt ? format(teacher.createdAt, 'PP') : 'N/A'}</TableCell>
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
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                    <Collapsible>
                        <Card>
                             <CollapsibleTrigger asChild>
                                <div className="flex w-full cursor-pointer items-center justify-between p-6">
                                    <div>
                                        <CardTitle>All Students</CardTitle>
                                        <CardDescription>A complete list of every student account in the system.</CardDescription>
                                    </div>
                                    <ChevronDown className="h-6 w-6 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                            </CollapsibleTrigger>
                             <CollapsibleContent>
                                <CardContent>
                                <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('studentName', 'student')}>Student Name <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('characterName', 'student')}>Character Name <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('studentId', 'student')}>Login Alias <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('teacherName', 'student')}>Guild / Teacher <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead><Button variant="ghost" onClick={() => requestSort('createdAt', 'student')}>Date Created <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedStudents.map(student => (
                                                <TableRow key={student.uid}>
                                                    <TableCell>{student.studentName}</TableCell>
                                                    <TableCell>{student.characterName}</TableCell>
                                                    <TableCell className="font-mono">{student.studentId}</TableCell>
                                                    <TableCell>
                                                        <Link href={`/teacher/dashboard?teacherId=${student.teacherId}`} className="underline hover:text-primary">
                                                            {student.teacherName}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>{student.createdAt ? format(student.createdAt, 'PP') : 'N/A'}</TableCell>
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
                             </CollapsibleContent>
                        </Card>
                    </Collapsible>
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
                                    <h4 className="font-semibold">Student Registration</h4>
                                    <p className={cn("text-sm font-bold", isStudentRegistrationOpen ? 'text-green-600' : 'text-red-600')}>
                                        {isStudentRegistrationOpen ? 'ACTIVE' : 'DISABLED'}
                                    </p>
                                </div>
                                <Button onClick={handleToggleStudentRegistration} disabled={isSettingsLoading} size="icon">
                                    {isSettingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isStudentRegistrationOpen ? <ToggleRight className="h-6 w-6"/> : <ToggleLeft className="h-6 w-6"/>}
                                </Button>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Teacher Registration</h4>
                                    <p className={cn("text-sm font-bold", isTeacherRegistrationOpen ? 'text-green-600' : 'text-red-600')}>
                                        {isTeacherRegistrationOpen ? 'ACTIVE' : 'DISABLED'}
                                    </p>
                                </div>
                                <Button onClick={handleToggleTeacherRegistration} disabled={isSettingsLoading} size="icon">
                                    {isSettingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isTeacherRegistrationOpen ? <ToggleRight className="h-6 w-6"/> : <ToggleLeft className="h-6 w-6"/>}
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
                            <CardTitle>Master Admin Tools</CardTitle>
                            <CardDescription>Tools for managing global assets.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <Button className="w-full justify-start" asChild>
                                <Link href="/admin/tools/global-forge">
                                    <Diamond className="mr-2 h-4 w-4" /> Global 2D Forge
                                </Link>
                            </Button>
                            <Button className="w-full justify-start" asChild>
                                <Link href="/admin/tools/global-3d-forge">
                                    <Box className="mr-2 h-4 w-4" /> Global 3D Forge
                                </Link>
                            </Button>
                            <Button className="w-full justify-start" asChild>
                                <Link href="/admin/tools/2d-sizer">
                                    <Wrench className="mr-2 h-4 w-4" /> 2D Sizer
                                </Link>
                            </Button>
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
                                                    <p className="text-xs text-muted-foreground">
                                                        From: {item.teacherName || 'Anonymous'} ({item.teacherEmail || 'N/A'})
                                                    </p>
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
                                    {isDeletingTeacher ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, Permanently Delete Teacher'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </main>
        </div>
    );
}
