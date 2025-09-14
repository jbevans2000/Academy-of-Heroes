
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User as UserIcon } from 'lucide-react';

const InventoryBoonCard = ({ boon, quantity, onUse, disabled }: { boon: Boon; quantity: number; onUse: (boonId: string) => void; disabled: boolean }) => {
    const [isUsing, setIsUsing] = useState(false);
    const [isConfirmingUse, setIsConfirmingUse] = useState(false);

    const handleUse = async () => {
        setIsUsing(true);
        await onUse(boon.id);
        // The component will re-render, no need to set isUsing(false) here if it's successful
    };

    const handleActivateBoon = () => {
        setIsConfirmingUse(true);
    };
    
    return (
        <>
        <AlertDialog open={isConfirmingUse} onOpenChange={setIsConfirmingUse}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Use "{boon.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {boon.studentMessage || "Check with your Guild Leader to redeem this reward!"}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => {
                        setIsConfirmingUse(false);
                        handleUse();
                    }}>
                        Use Reward
                    </AlertDialogAction>
                     <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                <Button className="w-full" onClick={handleActivateBoon} disabled={isUsing || disabled}>
                    {isUsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Use Reward
                </Button>
            </CardFooter>
        </Card>
        </>
    )
}

function InventoryPageComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [inventoryBoons, setInventoryBoons] = useState<Boon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUsingAny, setIsUsingAny] = useState(false);
    
    const isTeacherPreview = searchParams.get('teacherPreview') === 'true';
    const studentUid = searchParams.get('studentUid');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                let targetStudentUid = currentUser.uid;
                let teacherUidForStudent: string | null = null;

                if (isTeacherPreview && studentUid) {
                    targetStudentUid = studentUid;
                    teacherUidForStudent = currentUser.uid;
                } else {
                    const studentMetaRef = doc(db, 'students', currentUser.uid);
                    const studentMetaSnap = await getDoc(studentMetaRef);
                    if (studentMetaSnap.exists()) {
                        teacherUidForStudent = studentMetaSnap.data().teacherUid;
                    }
                }

                if (teacherUidForStudent) {
                    const studentRef = doc(db, 'teachers', teacherUidForStudent, 'students', targetStudentUid);
                    const unsubscribeStudent = onSnapshot(studentRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setStudent({ uid: docSnap.id, ...docSnap.data() } as Student);
                        } else if (!isTeacherPreview) {
                            router.push('/dashboard');
                        }
                    });
                    return () => unsubscribeStudent();
                } else if (!isTeacherPreview) {
                    router.push('/dashboard');
                }
            } else {
                router.push('/');
            }
        });
        return () => unsubscribeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTeacherPreview, studentUid, router]);

    useEffect(() => {
        if (!student || !student.teacherUid) {
            setInventoryBoons([]);
            setIsLoading(false);
            return;
        };

        const fetchInventoryBoons = async () => {
            const inventory = student.inventory || {};
            const boonIds = Object.keys(inventory).filter(id => inventory[id] > 0);

            if (boonIds.length === 0) {
                setInventoryBoons([]);
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            try {
                const boonsRef = collection(db, 'teachers', student.teacherUid, 'boons');
                // Firestore 'in' query can handle up to 30 items. For larger inventories, batching would be needed.
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
        setIsUsingAny(true);
        const result = await useBoon({
            teacherUid: student.teacherUid,
            studentUid: student.uid,
            boonId: boonId,
        });

        if (result.success) {
            toast({ title: 'Success!', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Action Failed', description: result.error });
        }
        setIsUsingAny(false);
    };

    const returnPath = isTeacherPreview ? '/teacher/dashboard' : '/dashboard';

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            {isTeacherPreview ? <TeacherHeader /> : <DashboardHeader />}
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push(returnPath)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to {isTeacherPreview ? 'Podium' : 'Dashboard'}
                    </Button>
                    
                    {isTeacherPreview && student && (
                        <Alert variant="default" className="bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500">
                             <UserIcon className="h-4 w-4" />
                            <AlertTitle>Teacher Preview Mode</AlertTitle>
                            <AlertDescription>
                                You are managing the inventory for <strong>{student.characterName}</strong>. Using a reward will consume it from their inventory.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card>
                        <CardHeader className="text-center">
                            <Package className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="text-3xl font-headline mt-2">My Inventory</CardTitle>
                            <CardDescription>View and use the Rewards you have purchased from the Vault.</CardDescription>
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
                                <CardDescription>Visit the Vault to purchase powerful items and Rewards!</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <Button onClick={() => router.push(`/armory${isTeacherPreview ? `?teacherPreview=true&studentUid=${studentUid}` : ''}`)}>Visit the Vault</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {inventoryBoons.map(boon => {
                                const quantity = student?.inventory?.[boon.id] || 0;
                                if (quantity === 0) return null;
                                return <InventoryBoonCard key={boon.id} boon={boon} quantity={quantity} onUse={handleUseBoon} disabled={isUsingAny} />
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin"/></div>}>
            <InventoryPageComponent />
        </Suspense>
    )
}
