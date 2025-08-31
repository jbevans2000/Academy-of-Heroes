
'use client';

// This is a new file for Phase 1.
// It will serve as the dedicated tool for sizing armor pieces.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot, writeBatch } from 'firebase/firestore';
import type { BaseBody, ArmorPiece } from '@/lib/forge';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export default function ArmorSizerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    // Data State
    const [baseBodies, setBaseBodies] = useState<BaseBody[]>([]);
    const [armorPieces, setArmorPieces] = useState<ArmorPiece[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI State
    const [selectedBody, setSelectedBody] = useState<BaseBody | null>(null);

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

    // Data Fetching Effect
    useEffect(() => {
        if (!user) return;
        
        setIsLoading(true);

        const unsubBodies = onSnapshot(collection(db, 'baseBodies'), (snapshot) => {
            const bodies = snapshot.docs
                .filter(doc => doc.id !== 'initial_check')
                .map(doc => ({ id: doc.id, ...doc.data() } as BaseBody));
            setBaseBodies(bodies);
        });

        const unsubArmor = onSnapshot(collection(db, 'armorPieces'), (snapshot) => {
            const pieces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece));
            setArmorPieces(pieces);
             setIsLoading(false);
        });

        return () => {
            unsubBodies();
            unsubArmor();
        };
    }, [user]);

     if (!user) {
        return (
             <div className="flex h-screen items-center justify-center bg-gray-900"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-7xl mx-auto space-y-6">
                     <div className="flex justify-between items-center">
                         <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Admin Dashboard
                        </Button>
                         <h1 className="text-2xl font-bold">Armor Sizer</h1>
                         <Button disabled>Save Transform</Button>
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Library Panel */}
                        <div className="lg:col-span-1 space-y-4">
                             <Card>
                                <CardHeader><CardTitle>Base Bodies</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-2">
                                    {isLoading ? (
                                        Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                                    ) : (
                                        baseBodies.map(body => (
                                            <div key={body.id} className="border p-1 rounded-md cursor-pointer hover:border-primary" onClick={() => setSelectedBody(body)}>
                                                <Image src={body.imageUrl} alt={body.name} width={100} height={150} className="w-full h-auto object-contain bg-gray-200" />
                                                <p className="text-xs text-center mt-1">{body.name}</p>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Armor Pieces</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-2">
                                    <p className="col-span-2 text-sm text-muted-foreground">Armor pieces will appear here when added in the Global Forge.</p>
                                </CardContent>
                            </Card>
                        </div>
                        {/* Canvas Panel */}
                        <div className="lg:col-span-2">
                             <Card className="h-[70vh]">
                                <CardHeader><CardTitle>Canvas</CardTitle></CardHeader>
                                <CardContent className="relative w-full h-full flex items-center justify-center bg-gray-200 rounded-md">
                                   {selectedBody ? (
                                        <Image src={selectedBody.imageUrl} alt={selectedBody.name} width={selectedBody.width} height={selectedBody.height} className="object-contain max-h-full max-w-full" />
                                   ) : (
                                       <p>Select a Base Body to begin.</p>
                                   )}
                                </CardContent>
                            </Card>
                        </div>
                        {/* Controls Panel */}
                        <div className="lg:col-span-1">
                             <Card>
                                <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Controls for positioning and scaling will appear here when an armor piece is selected.</p>
                                </CardContent>
                            </Card>
                        </div>
                     </div>
                </div>
            </main>
        </div>
    )
}
