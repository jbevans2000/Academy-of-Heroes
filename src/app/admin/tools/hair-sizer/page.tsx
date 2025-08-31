
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


export default function HairSizerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    // Data State
    const [baseBodies, setBaseBodies] = useState<BaseBody[]>([]);
    const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Seeding State
    const [isSeeded, setIsSeeded] = useState(false);

    // UI State
    const [selectedBody, setSelectedBody] = useState<BaseBody | null>(null);
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
    
    // Data Seeding Effect
    useEffect(() => {
        if (!user || isSeeded) return;

        const seedInitialData = async () => {
            try {
                const batch = writeBatch(db);

                // --- Seed Base Bodies ---
                const baseBodiesRef = collection(db, 'baseBodies');
                const baseBodiesSnap = await getDoc(doc(baseBodiesRef, 'initial_check'));
                
                if (!baseBodiesSnap.exists()) {
                    const placeholderBodies = [
                        { id: 'body-1', name: 'Base Body 1', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(1).png?alt=media&token=8ff364fe-6a96-4ace-b4e8-f011c87f725f', width: 400, height: 600 },
                        { id: 'body-2', name: 'Base Body 2', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(2).png?alt=media&token=c41b2cae-9f42-43c5-bd3c-e33d316c0a78', width: 400, height: 600 },
                        { id: 'body-3', name: 'Base Body 3', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(3).png?alt=media&token=f345fe77-f7e5-4d76-b42e-5154db5d9777', width: 400, height: 600 },
                        { id: 'body-4', name: 'Base Body 4', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(4).png?alt=media&token=202e80bd-ed73-41d6-b60e-8992740545d4', width: 400, height: 600 },
                        { id: 'body-5', name: 'Base Body 5', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(5).png?alt=media&token=a1132f06-6b2a-46af-95b3-b7b489d6f68b', width: 400, height: 600 },
                        { id: 'body-6', name: 'Base Body 6', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(6).png?alt=media&token=1fbc2b95-d1fd-4662-b3ae-57e6d004a6fe', width: 400, height: 600 },
                        { id: 'body-7', name: 'Base Body 7', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(7).png?alt=media&token=0070e4e9-f0cc-443b-bc1b-7679d7b7225b', width: 400, height: 600 },
                        { id: 'body-8', name: 'Base Body 8', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(8).png?alt=media&token=91503537-a701-412c-a082-8d969d99eb84', width: 400, height: 600 },
                    ];

                    placeholderBodies.forEach(body => {
                        const docRef = doc(db, 'baseBodies', body.id);
                        batch.set(docRef, body);
                    });
                    batch.set(doc(baseBodiesRef, 'initial_check'), { seeded: true });
                }

                // --- Seed Hairstyles ---
                const hairstylesRef = collection(db, 'hairstyles');
                const hairstylesSnap = await getDoc(doc(hairstylesRef, 'initial_check'));

                if (!hairstylesSnap.exists()) {
                     const shortBobHairstyle = {
                        id: 'short-bob-female',
                        styleName: "Short Bob",
                        baseImageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort%20Bob%20-%20Blond.png?alt=media&token=4cf191a6-040c-45ad-90d1-8e2290e00cbc",
                        colors: [
                            { name: "Amber", imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort%20Bob%20-%20Amber.png?alt=media&token=d1ebb396-b3a4-437c-a3a4-11ec98060a39" },
                            { name: "Aqua", imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort%20Bob%20-%20Aqua.png?alt=media&token=a7053c5e-b0da-4c8d-a100-737bd1b01c20" },
                            { name: "Blond", imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort%20Bob%20-%20Blond.png?alt=media&token=4cf191a6-040c-45ad-90d1-8e2290e00cbc" },
                            { name: "Flax", imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort%20Bob%20-%20Flax.png?alt=media&token=642faedc-03e2-43e3-990e-9db18d334206" },
                            { name: "Flint", imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort%20Bob%20-%20Flint.png?alt=media&token=3a0bb26f-1b0f-4351-926d-dce7a649801f" },
                            { name: "Gray", imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort%20Bob%20-%20Gray.png?alt=media&token=5b9d52f0-6cda-4f2a-906a-30934049b3bb" },
                            { name: "Seafoam", imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort%20Bob%20-%20Seafoam.png?alt=media&token=9c51d8a3-ac7d-401d-825e-bde502001889" },
                            { name: "Turquoise", imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort%20Bob%20-%20Turquoise.png?alt=media&token=849631b6-e557-4f28-b900-136e9b3c496d" },
                            { name: "Black", imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort_Bob_Black_Final.png?alt=media&token=39c73b62-a0f9-4f97-8d52-9e4a6725e726" },
                            { name: "Brown", imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FHairstyles%2FFemale%20Hairstyles%2FShort%20Bob%20Style%2FShort_Bob_Brown.png?alt=media&token=55384618-4eb9-4430-93d7-34717472ea3a" },
                        ],
                        transforms: {},
                        isPublished: true,
                    };

                    batch.set(doc(hairstylesRef, shortBobHairstyle.id), shortBobHairstyle);
                    batch.set(doc(hairstylesRef, 'initial_check'), { seeded: true });
                }

                await batch.commit();
                toast({ title: "Initial data seeded." });
                setIsSeeded(true);
            } catch (error) {
                console.error("Error seeding data:", error);
                toast({ variant: 'destructive', title: "Seeding Failed", description: "Could not create initial placeholder data." });
            }
        };

        seedInitialData();
    }, [user, isSeeded, toast]);

    // Data Fetching Effect
    useEffect(() => {
        if (!user || !isSeeded) return;
        
        setIsLoading(true);

        const unsubBodies = onSnapshot(collection(db, 'baseBodies'), (snapshot) => {
            const bodies = snapshot.docs
                .filter(doc => doc.id !== 'initial_check') // Exclude the check doc
                .map(doc => ({ id: doc.id, ...doc.data() } as BaseBody));
            setBaseBodies(bodies);
        });

        const unsubHairstyles = onSnapshot(collection(db, 'hairstyles'), (snapshot) => {
            const styles = snapshot.docs
                .filter(doc => doc.id !== 'initial_check')
                .map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle));
            setHairstyles(styles);
            setIsLoading(false);
        });

        return () => {
            unsubBodies();
            unsubHairstyles();
        };
    }, [user, isSeeded]);


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
                                <CardHeader><CardTitle>Hairstyles</CardTitle></CardHeader>
                                 <CardContent className="grid grid-cols-2 gap-2">
                                     {hairstyles.map(style => (
                                         <div key={style.id} className="border p-1 rounded-md cursor-pointer hover:border-primary" onClick={() => setSelectedHairstyle(style)}>
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
