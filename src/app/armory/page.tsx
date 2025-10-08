

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Boon } from '@/lib/boons';
import type { Student } from '@/lib/data';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Coins, Gem, Ban, ShoppingCart, Loader2, Star } from 'lucide-react';
import Image from 'next/image';
import { purchaseBoon } from '@/ai/flows/manage-inventory';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User as UserIcon } from 'lucide-react';
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


const BoonCard = ({ boon, onPurchase, student, disabled }: { boon: Boon, onPurchase: (boonId: string) => void, student: Student | null, disabled: boolean }) => {
    const [isPurchasing, setIsPurchasing] = useState(false);
    
    const handlePurchase = async () => {
        setIsPurchasing(true);
        await onPurchase(boon.id);
        setIsPurchasing(false);
    }
    
    const ownedQuantity = student?.inventory?.[boon.id] || 0;
    const canAfford = student && student.gold >= boon.cost;
    const meetsLevel = student && student.level >= (boon.levelRequirement || 1);

    let buttonText = 'Purchase';
    let isButtonDisabled = disabled || isPurchasing;
    
    if (!canAfford) {
        buttonText = 'Not Enough Gold';
        isButtonDisabled = true;
    }
    if (!meetsLevel) {
        buttonText = `Requires Level ${boon.levelRequirement}`;
        isButtonDisabled = true;
    }
    if (boon.requiresApproval && !isButtonDisabled) {
        buttonText = 'Request Purchase';
    }


    return (
        <Card className="flex flex-col text-center bg-card/80 backdrop-blur-sm">
            <CardHeader>
                 {ownedQuantity > 0 && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm border-2 border-white">
                        {ownedQuantity}
                    </div>
                 )}
                <div className="aspect-square relative w-full bg-secondary rounded-md overflow-hidden">
                    <Image src={boon.imageUrl || 'https://placehold.co/400x400.png'} alt={boon.name} fill className="object-cover" data-ai-hint="fantasy item" />
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-1">
                <CardTitle>{boon.name}</CardTitle>
                <CardDescription>{boon.description}</CardDescription>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 font-bold text-amber-600">
                        <Coins className="h-4 w-4" />
                        <span>{boon.cost}</span>
                    </div>
                    {boon.levelRequirement && boon.levelRequirement > 1 && (
                        <>
                            <span>|</span>
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4" />
                                <span>Lvl {boon.levelRequirement}</span>
                            </div>
                        </>
                    )}
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="w-full" disabled={isButtonDisabled}>
                            {isPurchasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                            {buttonText}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to purchase "{boon.name}" for {boon.cost} Gold?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPurchasing}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handlePurchase} disabled={isPurchasing}>
                                {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    )
}

function ArmoryPageComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [boons, setBoons] = useState<Boon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasingAny, setIsPurchasingAny] = useState(false);
    
    const isTeacherPreview = searchParams.get('teacherPreview') === 'true';
    const studentUid = searchParams.get('studentUid');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                let targetStudentUid = currentUser.uid;
                let teacherUidForStudent: string | null = null;

                if (isTeacherPreview && studentUid) {
                    // Teacher is previewing a student
                    targetStudentUid = studentUid;
                    teacherUidForStudent = currentUser.uid;
                } else {
                    // Student is viewing their own page
                    const studentMetaRef = doc(db, 'students', currentUser.uid);
                    const studentMetaSnap = await getDoc(studentMetaRef);
                    if (studentMetaSnap.exists()) {
                        teacherUidForStudent = studentMetaSnap.data().teacherUid;
                    }
                }
                
                if (teacherUidForStudent) {
                     const studentRef = doc(db, 'teachers', teacherUidForStudent, 'students', targetStudentUid);
                     const unsubStudent = onSnapshot(studentRef, (docSnap) => {
                         if (docSnap.exists()) {
                             setStudent({ uid: docSnap.id, ...docSnap.data() } as Student);
                         } else if (!isTeacherPreview) {
                            toast({ variant: 'destructive', title: 'Error', description: 'Student data not found.'});
                            router.push('/dashboard');
                         }
                     });
                     return () => unsubStudent();
                } else if (!isTeacherPreview) {
                     toast({ variant: 'destructive', title: 'Error', description: 'Could not identify your guild.' });
                     router.push('/dashboard');
                }

            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTeacherPreview, studentUid, router, toast]);
    
    useEffect(() => {
        if (!student?.teacherUid) return;

        const boonsQuery = query(
            collection(db, 'teachers', student.teacherUid, 'boons'),
            where('isVisibleToStudents', '==', true)
        );

        const unsubscribe = onSnapshot(boonsQuery, (snapshot) => {
            setBoons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boon)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching boons: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the items from the Vault.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [student?.teacherUid, toast]);
    
    const handlePurchaseBoon = async (boonId: string) => {
        if (!user || !student) return;
        setIsPurchasingAny(true);

        const result = await purchaseBoon({
            teacherUid: student.teacherUid,
            studentUid: student.uid, // Always use the student's UID being acted upon
            boonId: boonId,
        });

        if (result.success) {
            toast({ title: 'Success!', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Purchase Failed', description: result.error });
        }
        setIsPurchasingAny(false);
    };
    
    const returnPath = isTeacherPreview ? '/teacher/dashboard' : '/dashboard';

    return (
        <div 
            className="flex min-h-screen w-full flex-col bg-cover bg-center"
            style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-a78eccd5-9dd1-4ce7-bad4-44d11234177c.jpg?alt=media&token=bfe048b0-1e6c-4281-9d4e-523263132966')`}}
        >
            {isTeacherPreview ? <TeacherHeader /> : <DashboardHeader />}
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push(returnPath)} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to {isTeacherPreview ? 'Podium' : 'Dashboard'}
                    </Button>
                    
                    {isTeacherPreview && student && (
                        <Alert variant="default" className="bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500">
                             <UserIcon className="h-4 w-4" />
                            <AlertTitle>Teacher Preview Mode</AlertTitle>
                            <AlertDescription>
                                You are purchasing items for <strong>{student.characterName}</strong>. Gold will be deducted from their balance.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card className="bg-card/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <Gem className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="text-3xl font-headline mt-2">The Vault</CardTitle>
                            <CardDescription>Spend your hard-earned gold on powerful Rewards and cosmetic items.</CardDescription>
                        </CardHeader>
                    </Card>

                     {isLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-96" />)}
                        </div>
                    ) : boons.length === 0 ? (
                         <Card className="text-center py-20 bg-card/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>The Vault is Empty</CardTitle>
                                <CardDescription>The Guildmaster has not yet stocked the store with any items. Check back later!</CardDescription>
                            </CardHeader>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            {boons.map(boon => <BoonCard key={boon.id} boon={boon} onPurchase={handlePurchaseBoon} student={student} disabled={isPurchasingAny} />)}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}


export default function ArmoryPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin"/></div>}>
            <ArmoryPageComponent />
        </Suspense>
    )
}
