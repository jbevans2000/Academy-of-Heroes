
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Boon } from '@/lib/boons';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';
import { ArrowLeft, PlusCircle, Edit, Trash2, Loader2, Star, Coins } from 'lucide-react';
import Image from 'next/image';
import { deleteBoon } from '@/ai/flows/manage-boons';

export default function BoonsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [boons, setBoons] = useState<Boon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
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
        
        const boonsQuery = query(collection(db, 'teachers', teacher.uid, 'boons'), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(boonsQuery, (snapshot) => {
            setBoons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boon)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching boons: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch boons data.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [teacher, toast]);

    const handleDelete = async (boonId: string) => {
        if (!teacher) return;
        setIsDeleting(boonId);
        try {
            const result = await deleteBoon(teacher.uid, boonId);
            if (result.success) {
                toast({ title: "Boon Deleted", description: "The boon has been removed from your store." });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Error deleting boon: ", error);
            toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold flex items-center gap-2"><Star className="text-yellow-400"/> Boons Workshop</h1>
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                            </Button>
                            <Button onClick={() => router.push('/teacher/boons/new')}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create New Boon
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
                        </div>
                    ) : boons.length === 0 ? (
                        <Card className="text-center py-20">
                            <CardHeader>
                                <CardTitle>The Workshop is Empty</CardTitle>
                                <CardDescription>You haven't created any boons yet. Create one to get started!</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <Button onClick={() => router.push('/teacher/boons/new')}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Boon
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {boons.map(boon => (
                                <Card key={boon.id} className="flex flex-col">
                                    <CardHeader>
                                        <div className="aspect-square relative w-full bg-secondary rounded-md overflow-hidden">
                                            <Image src={boon.imageUrl || 'https://placehold.co/400x400.png'} alt={boon.name} fill className="object-cover" data-ai-hint="fantasy item" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-2">
                                        <CardTitle>{boon.name}</CardTitle>
                                        <div className="flex items-center gap-2 text-lg font-bold text-amber-600">
                                            <Coins className="h-5 w-5" />
                                            <span>{boon.cost}</span>
                                        </div>
                                        <CardDescription>{boon.description}</CardDescription>
                                    </CardContent>
                                    <CardFooter className="flex gap-2">
                                        <Button variant="outline" className="w-full" onClick={() => router.push(`/teacher/boons/edit/${boon.id}`)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" className="w-full" disabled={isDeleting === boon.id}>
                                                    {isDeleting === boon.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete "{boon.name}"?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently remove the boon from your store. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(boon.id)}>
                                                        Yes, Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
