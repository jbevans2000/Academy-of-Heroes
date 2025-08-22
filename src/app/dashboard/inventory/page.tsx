
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
import { ArrowLeft, Package, Sparkles, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useBoon } from '@/ai/flows/manage-inventory';

const InventoryBoonCard = ({ boon, onUse }: { boon: Boon; onUse: (boonId: string) => void; }) => {
    const [isUsing, setIsUsing] = useState(false);

    const handleUse = async () => {
        setIsUsing(true);
        await onUse(boon.id);
        setIsUsing(false);
    };
    
    return (
        <Card className="flex flex-col text-center">
            <CardHeader>
                <div className="aspect-square relative w-full bg-secondary rounded-md overflow-hidden">
                    <Image src={boon.imageUrl || 'https://placehold.co/400x400.png'} alt={boon.name} fill className="object-cover" data-ai-hint="fantasy item" />
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-1">
                <CardTitle>{boon.name}</CardTitle>
                <CardDescription>{boon.description}</CardDescription>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={handleUse} disabled={isUsing}>
                    {isUsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Use Boon
                </Button>
            </CardFooter>
        </Card>
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
            return;
        };

        const fetchInventoryBoons = async () => {
            setIsLoading(true);
            try {
                if (!student.inventory || student.inventory.length === 0) {
                    setInventoryBoons([]);
                    return;
                }
                const boonsRef = collection(db, 'teachers', student.teacherUid, 'boons');
                // Firestore 'in' query is limited to 30 items. If a student has more, we'd need to batch.
                const q = query(boonsRef, where('__name__', 'in', student.inventory.slice(0,30)));
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

        const result = await useBoon({
            teacherUid: student.teacherUid,
            studentUid: user.uid,
            boonId: boonId,
        });

        if (result.success) {
            toast({ title: 'Success!', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Failed to Use', description: result.error });
        }
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
                            <CardDescription>View and use the boons you have purchased from the Armory.</CardDescription>
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
                                <CardDescription>Visit the Armory to purchase powerful items and boons!</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <Button onClick={() => router.push('/armory')}>Visit the Armory</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {inventoryBoons.map(boon => <InventoryBoonCard key={boon.id} boon={boon} onUse={handleUseBoon} />)}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
