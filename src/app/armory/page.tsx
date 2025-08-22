
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Boon } from '@/lib/boons';
import type { Student } from '@/lib/data';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Coins, Gem, Ban, ShoppingCart, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { purchaseBoon } from '@/ai/flows/manage-inventory';

const BoonCard = ({ boon, onPurchase, student, disabled }: { boon: Boon, onPurchase: (boonId: string) => void, student: Student | null, disabled: boolean }) => {
    const [isPurchasing, setIsPurchasing] = useState(false);
    
    const handlePurchase = async () => {
        setIsPurchasing(true);
        await onPurchase(boon.id);
        setIsPurchasing(false);
    }
    
    const hasBoon = student?.inventory?.includes(boon.id);
    const canAfford = student && student.gold >= boon.cost;

    return (
        <Card className="flex flex-col text-center bg-card/80 backdrop-blur-sm">
            <CardHeader>
                <div className="aspect-square relative w-full bg-secondary rounded-md overflow-hidden">
                    <Image src={boon.imageUrl || 'https://placehold.co/400x400.png'} alt={boon.name} fill className="object-cover" data-ai-hint="fantasy item" />
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-1">
                <CardTitle>{boon.name}</CardTitle>
                <CardDescription>{boon.description}</CardDescription>
            </CardContent>
            <CardFooter className="flex-col gap-4">
                <div className="flex items-center gap-2 text-xl font-bold text-amber-600">
                    <Coins className="h-6 w-6" />
                    <span>{boon.cost}</span>
                </div>
                 <Button className="w-full" onClick={handlePurchase} disabled={disabled || isPurchasing || hasBoon || !canAfford}>
                    {isPurchasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : hasBoon ? <Ban className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                    {hasBoon ? 'Already Owned' : !canAfford ? 'Not Enough Gold' : 'Purchase'}
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function ArmoryPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [boons, setBoons] = useState<Boon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasingAny, setIsPurchasingAny] = useState(false);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const studentMetaRef = doc(db, 'students', currentUser.uid);
                const studentMetaSnap = await getDoc(studentMetaRef);

                if (studentMetaSnap.exists()) {
                    const studentRef = doc(db, 'teachers', studentMetaSnap.data().teacherUid, 'students', currentUser.uid);
                    // Use onSnapshot to get real-time updates for student's gold and inventory
                    const unsubStudent = onSnapshot(studentRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setStudent(docSnap.data() as Student);
                        }
                    });
                    return () => unsubStudent();
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not identify your guild.' });
                    router.push('/dashboard');
                }
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router, toast]);
    
    useEffect(() => {
        if (!student?.teacherUid) return;

        // NEW: Query the publicBoons collection instead of the teacher's private collection
        const boonsQuery = query(
            collection(db, 'publicBoons', student.teacherUid, 'boons'),
            orderBy('name', 'asc')
        );

        const unsubscribe = onSnapshot(boonsQuery, (snapshot) => {
            setBoons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boon)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching boons: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the items from the Armory.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [student?.teacherUid, toast]);
    
    const handlePurchaseBoon = async (boonId: string) => {
        if (!user || !student) return;
        setIsPurchasingAny(true);
        const result = await purchaseBoon({
            teacherUid: student.teacherUid,
            studentUid: user.uid,
            boonId: boonId,
        });

        if (result.success) {
            toast({ title: 'Purchase Successful!', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Purchase Failed', description: result.error });
        }
        setIsPurchasingAny(false);
    };

    return (
        <div 
            className="flex min-h-screen w-full flex-col bg-cover bg-center"
            style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-a78eccd5-9dd1-4ce7-bad4-44d11234177c.jpg?alt=media&token=bfe048b0-1e6c-4281-9d4e-523263132966')`}}
        >
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/dashboard')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>

                    <Card className="bg-card/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <Gem className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="text-3xl font-headline mt-2">The Vault</CardTitle>
                            <CardDescription>Spend your hard-earned gold on powerful boons and cosmetic items.</CardDescription>
                        </CardHeader>
                    </Card>

                     {isLoading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
                        </div>
                    ) : boons.length === 0 ? (
                         <Card className="text-center py-20 bg-card/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>The Vault is Empty</CardTitle>
                                <CardDescription>The Guildmaster has not yet stocked the store with any items. Check back later!</CardDescription>
                            </CardHeader>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {boons.map(boon => <BoonCard key={boon.id} boon={boon} onPurchase={handlePurchaseBoon} student={student} disabled={isPurchasingAny} />)}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
