
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { AdminHeader } from '@/components/admin/admin-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getGlobalSettings, updateGlobalSettings } from '@/ai/flows/manage-settings';
import { Loader2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
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

    const fetchSettings = async () => {
        setIsSettingsLoading(true);
        try {
            const settings = await getGlobalSettings();
            setIsRegistrationOpen(settings.isRegistrationOpen);
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
                 
                 <Card className="lg:col-span-2">
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
            </main>
        </div>
    );
}
