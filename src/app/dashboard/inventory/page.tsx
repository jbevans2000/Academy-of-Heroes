
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Boon } from '@/lib/boons';
import type { Student } from '@/lib/data';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Sparkles, Loader2, Info } from 'lucide-react';
import Image from 'next/image';
import { useBoon } from '@/ai/flows/manage-inventory';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

const InventoryBoonCard = ({ boon, quantity, onUse }: { boon: Boon; quantity: number; onUse: (boonId: string) => void; }) => {
    const [isUsing, setIsUsing] = useState(false);
    const [isStudentMessageOpen, setIsStudentMessageOpen] = useState(false);

    const handleUse = async () => {
        setIsUsing(true);
        await onUse(boon.id);
    };

    const handleActivateBoon = () => {
        if (boon.studentMessage) {
            setIsStudentMessageOpen(true);
        } else {
            handleUse();
        }
    };
    
    return (
        <>
        <AlertDialog open={isStudentMessageOpen} onOpenChange={setIsStudentMessageOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{boon.name}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {boon.studentMessage}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => {
                        setIsStudentMessageOpen(false);
                        handleUse();
                    }}>
                        Use Boon
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Card className="flex flex-col text-center">
            <CardHeader>
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm border-2 border-white">
                    {quantity}
                </div>
                <div className="aspect-square relative w-full bg-secondary rounded-md overflow-hidden">
                    <Image src={boon.imageUrl || 'https://placehold.co/400x400.png'} alt={boon.name} fill className="object-cover" data-ai-hint="fantasy item" />
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-1">
                <CardTitle>{boon.name}</CardTitle>
                <CardDescription>{boon.description}</CardDescription>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleActivateBoon} disabled={isUsing}>
                    {isUsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Use Boon
                </Button>
            </CardFooter>
        </Card>
        </>
    )
}

export default function InventoryPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [inventoryBoons, setInventoryBoons] = useState<Boon[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const studentMetaRef = doc(db, 'students', currentUser.uid);
                const studentMetaSnap = await getDoc(studentMetaRef);

                if (studentMetaSnap.exists()) {
                    const studentRef = doc(db, 'teachers', studentMetaSnap.data().teacherUid, 'students', currentUser.uid);
                    const unsubscribeStudent = onSnapshot(studentRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setStudent(docSnap.data() as Student);
                        } else {
                            router.push('/dashboard');
                        }
                    });
                    return () => unsubscribeStudent();
                } else {
                    router.push('/dashboard');
                }
            } else {
                router.push('/');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!student || !student.teacherUid) {
            setIsLoading(false);
            setInventoryBoons([]); // Clear boons if student/teacher is not available
            return;
        };

        const fetchInventoryBoons = async () => {
            const inventory = student.inventory || {};
            const boonIds = Object.keys(inventory);

            if (boonIds.length === 0) {
                setInventoryBoons([]);
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            try {
                // Firestore 'in' query is limited to 30 items. If a student has more, we'd need to batch.
                const boonsRef = collection(db, 'teachers', student.teacherUid, 'boons');
                const q = query(boonsRef, where('__name__', 'in', boonIds.slice(0,30)));
                const querySnapshot = await getDocs(q);
                setInventoryBoons(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boon)));
            } catch (error) {
                console.error("Error fetching inventory boons: ", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load your inventory.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInventoryBoons();
    }, [student, toast]);

    const handleUseBoon = async (boonId: string) => {
        if (!user || !student?.teacherUid) return;

        // No call to useBoon since it was removed. Logic is handled by teacher.
        // This is a placeholder for future functionality if needed.
        toast({ title: 'Awaiting Teacher Action', description: 'Your Guild Leader has been notified of your boon usage.' });

        // For now, we will assume all boons are "REAL_WORLD_PERK" and do not have an automatic effect.
        // The student message will guide them on what to do next.
    };


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>

                    <Card>
                        <CardHeader className="text-center">
                            <Package className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="text-3xl font-headline mt-2">My Inventory</CardTitle>
                            <CardDescription>View and use the boons you have purchased from the Vault.</CardDescription>
                        </CardHeader>
                    </Card>

                     {isLoading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
                        </div>
                    ) : inventoryBoons.length === 0 ? (
                         <Card className="text-center py-20">
                            <CardHeader>
                                <CardTitle>Your Backpack is Empty</CardTitle>
                                <CardDescription>Visit the Vault to purchase powerful items and boons!</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <Button onClick={() => router.push('/armory')}>Visit the Vault</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {inventoryBoons.map(boon => {
                                const quantity = student?.inventory?.[boon.id] || 0;
                                return <InventoryBoonCard key={boon.id} boon={boon} quantity={quantity} onUse={handleUseBoon} />
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
