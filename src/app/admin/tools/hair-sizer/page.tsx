
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot, writeBatch, updateDoc } from 'firebase/firestore';
import type { BaseBody, Hairstyle } from '@/lib/forge';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const baseBodyUrls = [
    { name: 'Base Body 1', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(1).png?alt=media&token=8ff364fe-6a96-4ace-b4e8-f011c87f725f', width: 500, height: 500 },
    { name: 'Base Body 2', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(2).png?alt=media&token=c41b2cae-9f42-43c5-bd3c-e33d316c0a78', width: 500, height: 500 },
    { name: 'Base Body 3', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(3).png?alt=media&token=f345fe77-f7e5-4d76-b42e-5154db5d9777', width: 500, height: 500 },
    { name: 'Base Body 4', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(4).png?alt=media&token=202e80bd-ed73-41d6-b60e-8992740545d4', width: 500, height: 500 },
    { name: 'Base Body 5', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(5).png?alt=media&token=a1132f06-6b2a-46af-95b3-b7b489d6f68b', width: 500, height: 500 },
    { name: 'Base Body 6', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(6).png?alt=media&token=1fbc2b95-d1fd-4662-b3ae-57e6d004a6fe', width: 500, height: 500 },
    { name: 'Base Body 7', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(7).png?alt=media&token=0070e4e9-f0cc-443b-bc1b-7679d7b7225b', width: 500, height: 500 },
    { name: 'Base Body 8', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(8).png?alt=media&token=91503537-a701-412c-a082-8d969d99eb84', width: 500, height: 500 },
];


export default function HairSizerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    // Data State
    const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
    const [baseBodies, setBaseBodies] = useState<BaseBody[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // UI State
    const [selectedBody, setSelectedBody] = useState<BaseBody | null>(null);
    const [selectedHairstyle, setSelectedHairstyle] = useState<Hairstyle | null>(null);

    // Transform State
    const [transform, setTransform] = useState({ x: 50, y: 50, scale: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);


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
    
    // Data Fetching Effect for Hairstyles and Base Bodies
    useEffect(() => {
        if (!user) return;
        
        setIsLoading(true);

        const unsubHairstyles = onSnapshot(collection(db, 'hairstyles'), (snapshot) => {
            const styles = snapshot.docs
                .filter(doc => doc.id !== 'initial_check')
                .map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle));
            setHairstyles(styles);
        });

        const unsubBodies = onSnapshot(collection(db, 'baseBodies'), (snapshot) => {
            const bodiesData = snapshot.docs
                .filter(doc => doc.id !== 'initial_check')
                .map(doc => ({ id: doc.id, ...doc.data() } as BaseBody))
                .sort((a: any, b: any) => a.order - b.order); // Ensure consistent ordering
            setBaseBodies(bodiesData);
            setIsLoading(false);
        });

        return () => {
            unsubHairstyles();
            unsubBodies();
        };
    }, [user]);

    // Effect to update transform when selection changes
    useEffect(() => {
        if (selectedHairstyle && selectedBody) {
            const savedTransform = selectedHairstyle.transforms?.[selectedBody.id];
            if (savedTransform) {
                // If x/y are small numbers, they are probably percentages. Otherwise, convert from old pixel format.
                const needsConversion = Math.abs(savedTransform.x) > 5 || Math.abs(savedTransform.y) > 5;
                if(needsConversion && canvasRef.current) {
                    const rect = canvasRef.current.getBoundingClientRect();
                    setTransform({
                        x: (savedTransform.x / rect.width) * 100,
                        y: (savedTransform.y / rect.height) * 100,
                        scale: savedTransform.scale
                    })
                } else {
                    setTransform(savedTransform);
                }
            } else {
                // Reset to default if no transform is saved for this combo
                setTransform({ x: 50, y: 50, scale: 100 });
            }
        }
    }, [selectedHairstyle, selectedBody]);


    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !canvasRef.current) return;
        e.preventDefault();
        const canvasRect = canvasRef.current.getBoundingClientRect();
        
        // Calculate the mouse position relative to the canvas in percentages
        const newX = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
        const newY = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

        setTransform(prev => ({ ...prev, x: newX, y: newY }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleSaveTransform = async () => {
        if (!selectedHairstyle || !selectedBody || !user) {
            toast({ variant: 'destructive', title: 'Selection Missing', description: 'Please select a hairstyle and a base body.' });
            return;
        }
        setIsSaving(true);
        try {
            const hairstyleRef = doc(db, 'hairstyles', selectedHairstyle.id);
            await updateDoc(hairstyleRef, {
                [`transforms.${selectedBody.id}`]: transform
            });
            toast({ title: 'Transform Saved!', description: `Position for ${selectedHairstyle.styleName} on ${selectedBody.name} has been saved.` });
        } catch (error) {
            console.error("Error saving transform:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the transform.' });
        } finally {
            setIsSaving(false);
        }
    };


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
                         <Button onClick={handleSaveTransform} disabled={isSaving || !selectedBody || !selectedHairstyle}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Transform
                         </Button>
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Library Panel */}
                        <div className="lg:col-span-1 space-y-4">
                             <Card>
                                <CardHeader><CardTitle>Base Bodies</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-2">
                                     {baseBodies.map((body) => (
                                        <div 
                                            key={body.id} 
                                            className={cn(
                                                "border p-1 rounded-md cursor-pointer hover:border-primary", 
                                                selectedBody?.id === body.id && "border-primary ring-2 ring-primary"
                                            )} 
                                            onClick={() => setSelectedBody(body)}
                                        >
                                            <Image src={body.imageUrl} alt={body.name} width={150} height={150} className="w-full h-auto object-contain bg-gray-200 rounded-sm" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Hairstyles</CardTitle></CardHeader>
                                 <CardContent className="grid grid-cols-2 gap-2">
                                     {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-24" />) : 
                                     hairstyles.map(style => (
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
                                <CardContent 
                                    ref={canvasRef}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    className="relative w-full h-full flex items-center justify-center bg-gray-200 rounded-md overflow-hidden"
                                >
                                   {!selectedBody && <p>Select a Base Body to begin.</p>}
                                   {selectedBody && (
                                        <Image src={selectedBody.imageUrl} alt="Selected Base Body" width={selectedBody.width} height={selectedBody.height} className="object-contain max-h-full max-w-full" />
                                   )}
                                   {selectedHairstyle && selectedBody && (
                                        <div 
                                            className="absolute cursor-move"
                                            style={{
                                                left: `${transform.x}%`,
                                                top: `${transform.y}%`,
                                                width: `${transform.scale}%`,
                                                transform: 'translate(-50%, -50%)', // Center the image on the coords
                                            }}
                                            onMouseDown={handleMouseDown}
                                        >
                                             <Image 
                                                src={selectedHairstyle.baseImageUrl} 
                                                alt={selectedHairstyle.styleName} 
                                                width={500} 
                                                height={500}
                                                className="object-contain w-full h-auto pointer-events-none"
                                             />
                                        </div>
                                   )}
                                </CardContent>
                            </Card>
                        </div>
                        {/* Controls Panel */}
                        <div className="lg:col-span-1">
                             <Card>
                                <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                     {selectedHairstyle ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="x-pos">X Position: {transform.x.toFixed(2)}%</Label>
                                                <Slider id="x-pos" value={[transform.x]} onValueChange={([val]) => setTransform(t => ({...t, x: val}))} min={0} max={100} step={0.1} />
                                            </div>
                                             <div className="space-y-2">
                                                <Label htmlFor="y-pos">Y Position: {transform.y.toFixed(2)}%</Label>
                                                <Slider id="y-pos" value={[transform.y]} onValueChange={([val]) => setTransform(t => ({...t, y: val}))} min={0} max={100} step={0.1} />
                                            </div>
                                             <div className="space-y-2">
                                                <Label htmlFor="scale">Scale: {transform.scale}%</Label>
                                                <Slider id="scale" value={[transform.scale]} onValueChange={([val]) => setTransform(t => ({...t, scale: val}))} min={10} max={200} step={1} />
                                            </div>
                                        </>
                                     ) : (
                                        <p className="text-sm text-muted-foreground">Select a hairstyle to see its controls.</p>
                                     )}
                                </CardContent>
                            </Card>
                        </div>
                     </div>
                </div>
            </main>
        </div>
    )
}
