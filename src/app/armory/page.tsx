'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Boon } from '@/lib/boons';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Coins, Gem, Ban } from 'lucide-react';
import Image from 'next/image';

const BoonCard = ({ boon }: { boon: Boon }) => {
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
            <CardFooter className="flex-col gap-4">
                <div className="flex items-center gap-2 text-xl font-bold text-amber-600">
                    <Coins className="h-6 w-6" />
                    <span>{boon.cost}</span>
                </div>
                 <Button className="w-full" disabled>
                    <Ban className="mr-2 h-4 w-4" />
                    Purchasing Coming Soon
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function ArmoryPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [boons, setBoons] = useState<Boon[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const studentMetaRef = doc(db, 'students', user.uid);
                const studentMetaSnap = await getDoc(studentMetaRef);

                if (studentMetaSnap.exists()) {
                    setTeacherUid(studentMetaSnap.data().teacherUid);
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
        if (!teacherUid) return;

        const boonsQuery = query(collection(db, 'teachers', teacherUid, 'boons'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(boonsQuery, (snapshot) => {
            setBoons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boon)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching boons: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the items from the Armory.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [teacherUid, toast]);


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
                            <Gem className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="text-3xl font-headline mt-2">The Armory</CardTitle>
                            <CardDescription>Spend your hard-earned gold on powerful boons and cosmetic items.</CardDescription>
                        </CardHeader>
                    </Card>

                     {isLoading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
                        </div>
                    ) : boons.length === 0 ? (
                         <Card className="text-center py-20">
                            <CardHeader>
                                <CardTitle>The Armory is Empty</CardTitle>
                                <CardDescription>The Guildmaster has not yet stocked the store with any items. Check back later!</CardDescription>
                            </CardHeader>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {boons.map(boon => <BoonCard key={boon.id} boon={boon} />)}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}