
'use client';

// This is a new file for Phase 1.
// It will serve as the content management hub for armor and hairstyles.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Diamond, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export default function GlobalForgePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const adminRef = doc(db, 'admins', currentUser.uid);
                const adminSnap = await getDoc(adminRef);
                if (adminSnap.exists()) {
                    setUser(currentUser);
                } else {
                    router.push('/teacher/dashboard');
                }
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);


    // Placeholder functions for future implementation
    const handleAddNewArmor = () => {
        toast({ title: "Coming Soon!", description: "Functionality to add new armor pieces will be implemented here." });
    }

    const handleAddNewHairstyle = () => {
        toast({ title: "Coming Soon!", description: "Functionality to add new hairstyles will be implemented here." });
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-4xl mx-auto space-y-6">
                     <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Admin Dashboard
                    </Button>
                    <Card className="shadow-2xl">
                        <CardHeader className="text-center">
                             <div className="flex justify-center mb-2">
                                <Diamond className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl">Global Forge</CardTitle>
                            <CardDescription>
                                Your central hub for creating and managing all game assets. Items created here will appear in the respective sizer tools.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Armor Management</CardTitle>
                                    <CardDescription>Create new armor pieces and manage existing ones.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button className="w-full" onClick={handleAddNewArmor}>Add New Armor Piece</Button>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Hairstyle Management</CardTitle>
                                    <CardDescription>Create new hairstyle styles and add color variations.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <Button className="w-full" onClick={handleAddNewHairstyle}>Add New Hairstyle</Button>
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
