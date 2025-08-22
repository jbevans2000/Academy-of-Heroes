
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
    const [isFeedbackPanelVisible, setIsFeedbackPanelVisible] = useState(false);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
    const [isDeletingFeedback, setIsDeletingFeedback] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const adminRef = doc(db, 'admins', currentUser.uid);
                const adminSnap = await getDoc(adminRef);

                if (adminSnap.exists()) {
                    setUser(currentUser);
                    fetchTeachers();
                    fetchSettings();
                    fetchFeedback();
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

    const fetchTeachers = async () => {
        setIsLoading(true);
        try {
            const teachersSnapshot = await getDocs(collection(db, 'teachers'));
            const teachersData = await Promise.all(teachersSnapshot.docs.map(async (teacherDoc) => {
                const studentsSnapshot = await getDocs(collection(db, 'teachers', teacherDoc.id, 'students'));
                const data = teacherDoc.data();
                return {
                    id: teacherDoc.id,
                    name: data.name || '[No Name]',
                    email: data.email || '[No Email]',
                    className: data.className || '[No Class Name]',
                    schoolName: data.schoolName || '[No School]',
                    studentCount: studentsSnapshot.size,
                };
            }));
            setTeachers(teachersData);
             toast({
                title: 'Data Refreshed',
                description: 'The latest guild and student data has been loaded.',
            });
        } catch (error) {
            console.error("Error fetching teachers:", error);
        } finally {
            setIsLoading(false);
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
            <main className="flex-1 p-4 md:p-6 lg:p-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 
                 <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Guilds</CardTitle>
                            <CardDescription>A list of all registered teachers and their guilds. Click a card to view that teacher's dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {teachers.map((teacher) => (
                                    <Link href={`/teacher/dashboard?teacherId=${teacher.id}`} key={teacher.id}>
                                        <Card className="h-full hover:shadow-lg hover:border-primary transition-all">
                                            <CardHeader>
                                                <CardTitle>{teacher.className}</CardTitle>
                                                <CardDescription>{teacher.name} - {teacher.schoolName}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="font-semibold">{teacher.studentCount} student(s)</p>
                                                <p className="text-sm text-muted-foreground">{teacher.email}</p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                            {teachers.length === 0 && !isLoading && (
                                <div className="text-center py-10">
                                    <p className="text-muted-foreground">No teachers have registered yet.</p>
                                </div>
                            )}
                    </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Teacher Feedback</CardTitle>
                            <CardDescription>Logs of all submitted bug reports and feature requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {feedback.length === 0 ? (
                                <p className="text-muted-foreground">No feedback has been submitted yet.</p>
                            ) : (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                    {feedback.map(item => (
                                        <div key={item.id} className="p-4 border rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-2 font-bold text-lg">
                                                         {item.feedbackType === 'bug' ? <Bug className="h-5 w-5 text-destructive" /> : <Lightbulb className="h-5 w-5 text-yellow-500" />}
                                                         <span>{item.feedbackType === 'bug' ? 'Bug Report' : 'Feature Request'}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">From: Anonymous</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <p className="text-xs text-muted-foreground">{format(new Date(item.createdAt.seconds * 1000), 'PPP p')}</p>
                                                    <div className="flex items-center space-x-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFeedbackToDelete(item.id)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                        <Checkbox
                                                            id={`feedback-${item.id}`}
                                                            checked={item.status === 'addressed'}
                                                            onCheckedChange={() => handleFeedbackStatusChange(item.id, item.status)}
                                                        />
                                                        <label
                                                            htmlFor={`feedback-${item.id}`}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                        >
                                                            Addressed
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="mt-2 whitespace-pre-wrap">{item.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                 </div>

                <div className="space-y-6">
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
                                <Button onClick={handleToggleRegistration} disabled={isSettingsLoading} size="lg">
                                    {isSettingsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isRegistrationOpen ? <ToggleRight className="mr-2 h-6 w-6"/> : <ToggleLeft className="mr-2 h-6 w-6"/>}
                                    {isRegistrationOpen ? 'Deactivate' : 'Activate'}
                                </Button>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Refresh Data</h4>
                                    <p className="text-sm text-muted-foreground">Reload all guild and student information.</p>
                                </div>
                                <Button onClick={fetchTeachers} disabled={isLoading} size="lg">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4"/>}
                                    Refresh
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Beta Features</CardTitle>
                            <CardDescription>Toggle experimental features for all users.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Teacher Feedback Panel</h4>
                                    <p className={cn("text-sm font-bold", isFeedbackPanelVisible ? 'text-green-600' : 'text-red-600')}>
                                        {isFeedbackPanelVisible ? 'ACTIVE' : 'INACTIVE'}
                                    </p>
                                </div>
                                 <Button onClick={handleToggleFeedbackPanel} disabled={isSettingsLoading} size="lg">
                                    {isSettingsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isFeedbackPanelVisible ? <ToggleRight className="mr-2 h-6 w-6"/> : <ToggleLeft className="mr-2 h-6 w-6"/>}
                                    {isFeedbackPanelVisible ? 'Deactivate' : 'Activate'}
                                </Button>
                            </div>
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
                </div>
            </main>
        </div>
    );
}
