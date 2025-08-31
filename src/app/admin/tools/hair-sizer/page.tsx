
'use client';

// This is a new file for Phase 1.
// It will serve as the dedicated tool for sizing hairstyles.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot, writeBatch } from 'firebase/firestore';
import type { BaseBody, Hairstyle } from '@/lib/forge';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const baseBodyUrls = [
    'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(1).png?alt=media&token=8ff364fe-6a96-4ace-b4e8-f011c87f725f',
    'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(2).png?alt=media&token=c41b2cae-9f42-43c5-bd3c-e33d316c0a78',
    'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(3).png?alt=media&token=f345fe77-f7e5-4d76-b42e-5154db5d9777',
    'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(4).png?alt=media&token=202e80bd-ed73-41d6-b60e-8992740545d4',
    'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(5).png?alt=media&token=a1132f06-6b2a-46af-95b3-b7b489d6f68b',
    'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(6).png?alt=media&token=1fbc2b95-d1fd-4662-b3ae-57e6d004a6fe',
    'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(7).png?alt=media&token=0070e4e9-f0cc-443b-bc1b-7679d7b7225b',
    'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(8).png?alt=media&token=91503537-a701-412c-a082-8d969d99eb84'
];

export default function HairSizerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    // Data State
    const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI State
    const [selectedBodyUrl, setSelectedBodyUrl] = useState<string | null>(null);
    const [selectedHairstyle, setSelectedHairstyle] = useState<Hairstyle | null>(null);
    

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
    
    // Data Fetching Effect for Hairstyles
    useEffect(() => {
        if (!user) return;
        
        setIsLoading(true);

        const unsubHairstyles = onSnapshot(collection(db, 'hairstyles'), (snapshot) => {
            const styles = snapshot.docs
                .filter(doc => doc.id !== 'initial_check')
                .map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle));
            setHairstyles(styles);
            setIsLoading(false);
        });

        return () => {
            unsubHairstyles();
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
                         <h1 className="text-2xl font-bold">Hair Sizer</h1>
                         <Button disabled>Save Transform</Button>
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Library Panel */}
                        <div className="lg:col-span-1 space-y-4">
                            <Card>
                                <CardHeader><CardTitle>Base Bodies</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-2">
                                    {baseBodyUrls.map((url, i) => (
                                         <div key={i} className={cn("border p-1 rounded-md cursor-pointer hover:border-primary", selectedBodyUrl === url && "border-primary ring-2 ring-primary")} onClick={() => setSelectedBodyUrl(url)}>
                                            <Image src={url} alt={`Base Body ${i + 1}`} width={150} height={150} className="w-full h-auto object-contain bg-gray-200 rounded-sm" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Hairstyles</CardTitle></CardHeader>
                                 <CardContent className="grid grid-cols-2 gap-2">
                                     {hairstyles.map(style => (
                                         <div 
                                            key={style.id} 
                                            className={cn("border p-1 rounded-md cursor-pointer hover:border-primary", selectedHairstyle?.id === style.id && "border-primary ring-2 ring-primary")}
                                            onClick={() => setSelectedHairstyle(style)}>
                                             <Image src={style.baseImageUrl} alt={style.styleName} width={100} height={100} className="w-full h-auto object-contain bg-gray-200" />
                                             <p className="text-xs text-center mt-1">{style.styleName}</p>
                                         </div>
                                     ))}
                                     {hairstyles.length === 0 && !isLoading && (
                                         <p className="col-span-2 text-sm text-muted-foreground">Hairstyles will appear here when added in the Global Forge.</p>
                                     )}
                                </CardContent>
                            </Card>
                        </div>
                        {/* Canvas Panel */}
                        <div className="lg:col-span-2">
                             <Card className="h-[70vh]">
                                <CardHeader><CardTitle>Canvas</CardTitle></CardHeader>
                                <CardContent className="relative w-full h-full flex items-center justify-center bg-gray-200 rounded-md">
                                   {!selectedBodyUrl && <p>Select a Base Body to begin.</p>}
                                   {selectedBodyUrl && (
                                        <Image src={selectedBodyUrl} alt="Selected Base Body" fill className="object-contain" />
                                   )}
                                   {selectedHairstyle && (
                                        <div className="absolute inset-0">
                                             <Image src={selectedHairstyle.baseImageUrl} alt={selectedHairstyle.styleName} fill className="object-contain" />
                                        </div>
                                   )}
                                </CardContent>
                            </Card>
                        </div>
                        {/* Controls Panel */}
                        <div className="lg:col-span-1">
                             <Card>
                                <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Controls for positioning and scaling will appear here when a hairstyle is selected.</p>
                                </CardContent>
                            </Card>
                        </div>
                     </div>
                </div>
            </main>
        </div>
    )
}
