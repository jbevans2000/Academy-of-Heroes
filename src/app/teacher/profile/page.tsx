
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, CreditCard } from 'lucide-react';
import { updateTeacherProfile } from '@/ai/flows/manage-teacher';

interface TeacherProfile {
    name: string;
    schoolName: string;
    className: string;
}

export default function TeacherProfilePage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [profile, setProfile] = useState<TeacherProfile>({ name: '', schoolName: '', className: '' });
    const [initialProfile, setInitialProfile] = useState<TeacherProfile>({ name: '', schoolName: '', className: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setTeacher(user);
                const docRef = doc(db, 'teachers', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as TeacherProfile;
                    setProfile(data);
                    setInitialProfile(data);
                }
                setIsLoading(false);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const hasChanges = JSON.stringify(profile) !== JSON.stringify(initialProfile);

    const handleSaveChanges = async () => {
        if (!teacher || !hasChanges) return;
        setIsSaving(true);
        try {
            const result = await updateTeacherProfile({
                teacherUid: teacher.uid,
                name: profile.name,
                schoolName: profile.schoolName,
                className: profile.className,
            });

            if (result.success) {
                toast({ title: "Profile Updated", description: "Your information has been successfully saved." });
                setInitialProfile(profile);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Error saving profile: ", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message || "An unexpected error occurred." });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle>My Profile</CardTitle>
                            <CardDescription>Update your personal and school information here.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" name="name" value={profile.name} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="schoolName">School Name</Label>
                                <Input id="schoolName" name="schoolName" value={profile.schoolName} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="className">Guild Name (Class Name)</Label>
                                <Input id="className" name="className" value={profile.className} onChange={handleInputChange} />
                            </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle>Billing & Subscription</CardTitle>
                            <CardDescription>Manage your Academy of Heroes plan.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-start gap-4">
                            <div className="p-4 border rounded-md w-full">
                                <p className="font-semibold">Current Plan: <span className="text-primary">Premium</span></p>
                                <p className="text-sm text-muted-foreground">Your plan renews on September 1, 2025.</p>
                            </div>
                            <Button disabled><CreditCard className="mr-2 h-4 w-4" /> Manage Subscription</Button>
                             <p className="text-xs text-muted-foreground">Subscription management is handled by our secure third-party provider.</p>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveChanges} disabled={!hasChanges || isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}
