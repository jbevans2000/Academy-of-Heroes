
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import type { ArmorPiece } from '@/lib/forge';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const baseBodyUrls = [
    { id: 'body_1', name: 'Base Body 1', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(1).png?alt=media&token=8ff364fe-6a96-4ace-b4e8-f011c87f725f', width: 500, height: 500 },
    { id: 'body_2', name: 'Base Body 2', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(2).png?alt=media&token=c41b2cae-9f42-43c5-bd3c-e33d316c0a78', width: 500, height: 500 },
    { id: 'body_3', name: 'Base Body 3', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(3).png?alt=media&token=f345fe77-f7e5-4d76-b42e-5154db5d9777', width: 500, height: 500 },
    { id: 'body_4', name: 'Base Body 4', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(4).png?alt=media&token=202e80bd-ed73-41d6-b60e-8992740545d4', width: 500, height: 500 },
    { id: 'body_5', name: 'Base Body 5', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(5).png?alt=media&token=a1132f06-6b2a-46af-95b3-b7b489d6f68b', width: 500, height: 500 },
    { id: 'body_6', name: 'Base Body 6', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(6).png?alt=media&token=1fbc2b95-d1fd-4662-b3ae-57e6d004a6fe', width: 500, height: 500 },
    { id: 'body_7', name: 'Base Body 7', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(7).png?alt=media&token=0070e4e9-f0cc-443b-bc1b-7679d7b7225b', width: 500, height: 500 },
    { id: 'body_8', name: 'Base Body 8', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(8).png?alt=media&token=91503537-a701-412c-a082-8d969d99eb84', width: 500, height: 500 },
];


export default function ArmorSizerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    // Data State
    const [armorPieces, setArmorPieces] = useState<ArmorPiece[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // UI State
    const [selectedBody, setSelectedBody] = useState<(typeof baseBodyUrls[0]) | null>(null);
    const [selectedArmor, setSelectedArmor] = useState<ArmorPiece | null>(null);
    
    // Transform State
    const [editingLayer, setEditingLayer] = useState<'primary' | 'secondary'>('primary');
    const [transform, setTransform] = useState({ x: 50, y: 50, scale: 100 });
    const [transform2, setTransform2] = useState({ x: 50, y: 50, scale: 100 });

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

    // Data Fetching Effect
    useEffect(() => {
        if (!user) return;
        
        setIsLoading(true);

        const unsubArmor = onSnapshot(collection(db, 'armorPieces'), (snapshot) => {
            const pieces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece));
            setArmorPieces(pieces);
             setIsLoading(false);
        });

        return () => {
            unsubArmor();
        };
    }, [user]);

    // Effect to update transform when selection changes
    useEffect(() => {
        if (selectedArmor && selectedBody) {
            const savedTransform = selectedArmor.transforms?.[selectedBody.id];
            const savedTransform2 = selectedArmor.transforms2?.[selectedBody.id];
            
            setTransform(savedTransform || { x: 50, y: 50, scale: 100 });
            setTransform2(savedTransform2 || { x: 50, y: 50, scale: 100 });
            setEditingLayer('primary'); // Reset to primary layer on selection change
        }
    }, [selectedArmor, selectedBody]);

    const activeTransform = editingLayer === 'primary' ? transform : transform2;
    const setActiveTransform = editingLayer === 'primary' ? setTransform : setTransform2;


    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !canvasRef.current) return;
        e.preventDefault();
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const newX = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
        const newY = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;
        setActiveTransform(prev => ({ ...prev, x: newX, y: newY }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleSaveTransform = async () => {
        if (!selectedArmor || !selectedBody) {
            toast({ variant: 'destructive', title: 'Selection Missing', description: 'Please select an armor piece and a base body.' });
            return;
        }
        setIsSaving(true);
        try {
            const armorRef = doc(db, 'armorPieces', selectedArmor.id);
            const updates: any = {
                [`transforms.${selectedBody.id}`]: transform
            };
            if(selectedArmor.modularImageUrl2) {
                updates[`transforms2.${selectedBody.id}`] = transform2;
            }

            await updateDoc(armorRef, updates);
            toast({ title: 'Transform Saved!', description: `Position for ${selectedArmor.name} on ${selectedBody.name} has been saved.` });
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
                         <h1 className="text-2xl font-bold">Armor Sizer</h1>
                         <Button onClick={handleSaveTransform} disabled={isSaving || !selectedBody || !selectedArmor}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save All Transforms
                         </Button>
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Library Panel */}
                        <div className="lg:col-span-1 space-y-4">
                             <Card>
                                <CardHeader><CardTitle>Base Bodies</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-2">
                                    {baseBodyUrls.map((body, i) => (
                                         <div key={i} className={cn("border p-1 rounded-md cursor-pointer hover:border-primary", selectedBody?.id === body.id && "border-primary ring-2 ring-primary")} onClick={() => setSelectedBody(body)}>
                                            <Image src={body.imageUrl} alt={`Base Body ${i + 1}`} width={150} height={150} className="w-full h-auto object-contain bg-gray-200 rounded-sm" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Armor Pieces</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-2">
                                    {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-24" />)}
                                    {armorPieces.length === 0 && !isLoading && (
                                        <p className="col-span-2 text-sm text-muted-foreground">No armor pieces found. Create some in the Global Forge first.</p>
                                    )}
                                    {armorPieces.map(piece => (
                                        <div 
                                            key={piece.id} 
                                            className={cn(
                                                "border p-1 rounded-md cursor-pointer hover:border-primary", 
                                                selectedArmor?.id === piece.id && "border-primary ring-2 ring-primary"
                                            )}
                                            onClick={() => setSelectedArmor(piece)}
                                        >
                                            <Image src={piece.imageUrl} alt={piece.name} width={150} height={150} className="w-full h-auto object-contain bg-gray-200 rounded-sm" />
                                             <p className="text-xs text-center mt-1 truncate">{piece.name}</p>
                                        </div>
                                    ))}
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
                                   {selectedBody ? (
                                        <Image src={selectedBody.imageUrl} alt="Selected Base Body" width={selectedBody.width} height={selectedBody.height} className="object-contain max-h-full max-w-full" />
                                   ) : (
                                       <p>Select a Base Body to begin.</p>
                                   )}
                                    {selectedArmor && selectedBody && (
                                        <>
                                            <div 
                                                className={cn("absolute cursor-move", editingLayer !== 'primary' && 'opacity-50 pointer-events-none')}
                                                style={{
                                                    left: `${transform.x}%`,
                                                    top: `${transform.y}%`,
                                                    width: `${transform.scale}%`,
                                                    transform: 'translate(-50%, -50%)',
                                                }}
                                                onMouseDown={handleMouseDown}
                                            >
                                                <Image src={selectedArmor.modularImageUrl} alt={selectedArmor.name} width={500} height={500} className="object-contain max-h-full max-w-full pointer-events-none" />
                                            </div>
                                            {selectedArmor.modularImageUrl2 && (
                                                 <div 
                                                    className={cn("absolute cursor-move", editingLayer !== 'secondary' && 'opacity-50 pointer-events-none')}
                                                    style={{
                                                        left: `${transform2.x}%`,
                                                        top: `${transform2.y}%`,
                                                        width: `${transform2.scale}%`,
                                                        transform: 'translate(-50%, -50%)',
                                                    }}
                                                    onMouseDown={handleMouseDown}
                                                >
                                                    <Image src={selectedArmor.modularImageUrl2} alt={selectedArmor.name} width={500} height={500} className="object-contain max-h-full max-w-full pointer-events-none" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                        {/* Controls Panel */}
                        <div className="lg:col-span-1">
                             <Card>
                                <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                     {selectedArmor ? (
                                        <>
                                            {selectedArmor.modularImageUrl2 && (
                                                <div className="space-y-2 p-2 border rounded-md">
                                                    <Label className="flex items-center gap-2"><Layers/> Editing Layer</Label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button variant={editingLayer === 'primary' ? 'default' : 'outline'} onClick={() => setEditingLayer('primary')}>Primary</Button>
                                                        <Button variant={editingLayer === 'secondary' ? 'default' : 'outline'} onClick={() => setEditingLayer('secondary')}>Secondary</Button>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <Label htmlFor="x-pos">X Position: {activeTransform.x.toFixed(2)}%</Label>
                                                <Slider id="x-pos" value={[activeTransform.x]} onValueChange={([val]) => setActiveTransform(t => ({...t, x: val}))} min={0} max={100} step={0.1} />
                                            </div>
                                             <div className="space-y-2">
                                                <Label htmlFor="y-pos">Y Position: {activeTransform.y.toFixed(2)}%</Label>
                                                <Slider id="y-pos" value={[activeTransform.y]} onValueChange={([val]) => setActiveTransform(t => ({...t, y: val}))} min={0} max={100} step={0.1} />
                                            </div>
                                             <div className="space-y-2">
                                                <Label htmlFor="scale">Scale: {activeTransform.scale}%</Label>
                                                <Slider id="scale" value={[activeTransform.scale]} onValueChange={([val]) => setActiveTransform(t => ({...t, scale: val}))} min={10} max={200} step={1} />
                                            </div>
                                        </>
                                     ) : (
                                        <p className="text-sm text-muted-foreground">Select an armor piece to see its controls.</p>
                                     )}
                                </CardContent>
                            </Card>
                        </div>
                     </div>
                </div>
            </main>
        </div>
    );
}
