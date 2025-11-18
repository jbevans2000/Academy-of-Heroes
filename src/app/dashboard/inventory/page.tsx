
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, getDocs, documentId } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Boon, PendingBoonRequest } from '@/lib/boons';
import type { Student } from '@/lib/data';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Sparkles, Loader2, Info, Hourglass } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';


const InventoryBoonCard = ({ boon, quantity, onUse, disabled }: { boon: Boon; quantity: number; onUse: (boonId: string, instructions?: string) => void; disabled: boolean }) => {
    const [isUsing, setIsUsing] = useState(false);
    const [isConfirmingUse, setIsConfirmingUse] = useState(false);
    const [instructions, setInstructions] = useState('');

    const handleUse = async () => {
        setIsUsing(true);
        await onUse(boon.id, instructions);
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
                        You currently have ({quantity}) in your inventory.
                        {(boon.studentMessage || boon.allowStudentInstructions) && (
                            <div className="mt-4 p-3 bg-secondary rounded-md text-secondary-foreground">
                                {boon.studentMessage && <p className="mb-2">{boon.studentMessage}</p>}
                                {boon.allowStudentInstructions && (
                                     <Textarea
                                        placeholder="Add instructions for your Guild Leader..."
                                        value={instructions}
                                        onChange={(e) => setInstructions(e.target.value)}
                                        className="bg-background"
                                    />
                                )}
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                     <AlertDialogCancel onClick={() => setInstructions('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUse} disabled={isUsing}>
                        {isUsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Use Reward
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

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
            <CardFooter className="flex items-center justify-center gap-4">
                 <Button className="flex-grow" onClick={handleActivateBoon} disabled={isUsing || disabled}>
                    {isUsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Use Reward
                </Button>
                <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center font-bold text-lg border-2 border-white">
                    {quantity}
                </div>
            </CardFooter>
        </Card>
        </>
    )
}

const PendingBoonCard = ({ boon }: { boon: Boon }) => {
    return (
        <Card className="flex flex-col text-center bg-card/50 backdrop-blur-sm relative overflow-hidden opacity-75">
            <div className="absolute inset-0 bg-black/30 z-10 flex flex-col items-center justify-center p-4">
                 <Hourglass className="h-10 w-10 text-yellow-400 animate-spin" />
                 <p className="font-bold text-white mt-2">Pending Approval</p>
            </div>
            <CardHeader>
                <div className="aspect-square relative w-full bg-secondary rounded-md">
                    <Image src={boon.imageUrl || 'https://placehold.co/400x400.png'} alt={boon.name} fill className="object-cover" />
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-1">
                <CardTitle>{boon.name}</CardTitle>
                <CardDescription>{boon.description}</CardDescription>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Waiting...
                </Button>
            </CardFooter>
        </Card>
    );
};


function InventoryPageComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [inventoryBoons, setInventoryBoons] = useState<Boon[]>([]);
    const [pendingBoons, setPendingBoons] = useState<Boon[]>([]);
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
            setPendingBoons([]);
            setIsLoading(false);
            return;
        };
        
        setIsLoading(true);

        // Listener for owned items
        const inventory = student.inventory || {};
        const ownedBoonIds = Object.keys(inventory).filter(id => inventory[id] > 0);
        if (ownedBoonIds.length > 0) {
            const boonsRef = collection(db, 'teachers', student.teacherUid, 'boons');
            const q = query(boonsRef, where(documentId(), 'in', ownedBoonIds.slice(0,30)));
            const unsubOwned = onSnapshot(q, (snapshot) => {
                setInventoryBoons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boon)));
            });
             // No need to set loading to false here, let the pending listener do it
            // return unsubOwned;
        } else {
            setInventoryBoons([]);
        }

        // Listener for pending items
        const pendingRef = collection(db, 'teachers', student.teacherUid, 'pendingBoonRequests');
        const qPending = query(pendingRef, where('studentUid', '==', student.uid));
        const unsubPending = onSnapshot(qPending, async (snapshot) => {
            const pendingRequestData = snapshot.docs.map(doc => doc.data() as PendingBoonRequest);
            const pendingBoonIds = pendingRequestData.map(req => req.boonId);
            
            if (pendingBoonIds.length > 0) {
                const boonsRef = collection(db, 'teachers', student.teacherUid, 'boons');
                const qBoons = query(boonsRef, where(documentId(), 'in', pendingBoonIds.slice(0,30)));
                const boonsSnapshot = await getDocs(qBoons);
                setPendingBoons(boonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boon)));
            } else {
                setPendingBoons([]);
            }
            setIsLoading(false); // Set loading to false after both have been processed
        }, (error) => {
            console.error("Error fetching pending boons:", error);
            setIsLoading(false);
        });

        // return () => unsubPending();
        
    }, [student]);

    const handleUseBoon = async (boonId: string, instructions?: string) => {
        if (!user || !student?.teacherUid) return;
        setIsUsingAny(true);
        const result = await useBoon({
            teacherUid: student.teacherUid,
            studentUid: student.uid,
            boonId: boonId,
            instructions: instructions,
        });

        if (result.success) {
            toast({ title: 'Success!', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Action Failed', description: result.error });
        }
        setIsUsingAny(false);
    };

    const returnPath = isTeacherPreview ? '/teacher/dashboard' : '/dashboard';
    const allDisplayItemsCount = inventoryBoons.length + pendingBoons.length;

    return (
        <div 
            className="relative flex min-h-screen w-full flex-col"
        >
             <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FInventory.png?alt=media&token=d86f76bf-0ed1-457a-8f3a-5be3e643e959')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <div className="absolute inset-0 -z-10 bg-black/25" />
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

                    <Card className="bg-card/80">
                        <CardHeader className="text-center">
                            <Package className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="text-3xl font-headline mt-2">My Rewards</CardTitle>
                            <CardDescription>View and use the Rewards you have purchased from the Vault.</CardDescription>
                        </CardHeader>
                    </Card>

                     {isLoading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
                        </div>
                    ) : allDisplayItemsCount === 0 ? (
                         <Card className="text-center py-20 bg-card/80">
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
                            {pendingBoons.map(boon => (
                                <PendingBoonCard key={`pending-${boon.id}`} boon={boon} />
                            ))}
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

    