
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore';
import type { ArmorPiece, ArmorSlot, BaseBody, Hairstyle } from '@/lib/forge';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save, Layers, Trash2, Edit, Eye, Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const slotZIndex: Record<ArmorSlot, number> = {
    legs: 1,
    chest: 2,
    head: 3,
    shoulders: 3,
    hands: 3, 
    feet: 3,
};


export default function SizerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    // Data State
    const [allArmorPieces, setAllArmorPieces] = useState<ArmorPiece[]>([]);
    const [allHairstyles, setAllHairstyles] = useState<Hairstyle[]>([]);
    const [allBaseBodies, setAllBaseBodies] = useState<BaseBody[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // UI State
    const [selectedBody, setSelectedBody] = useState<BaseBody | null>(null);
    const [equippedItems, setEquippedItems] = useState<(ArmorPiece | Hairstyle)[]>([]);
    const [activePieceId, setActivePieceId] = useState<string | null>(null);
    const [editingLayer, setEditingLayer] = useState<'primary' | 'secondary'>('primary');
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    
    // Transform State
    const [transforms, setTransforms] = useState<{ [pieceId: string]: any }>({});

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
            setAllArmorPieces(pieces);
        });
        
        const unsubHairstyles = onSnapshot(collection(db, 'hairstyles'), (snapshot) => {
            const styles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle));
            setAllHairstyles(styles);
        });
        
        const q = query(collection(db, 'baseBodies'), orderBy('order'));
        const unsubBodies = onSnapshot(q, (snapshot) => {
            const bodies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseBody));
            setAllBaseBodies(bodies);
            if(bodies.length > 0 && !selectedBody) {
                setSelectedBody(bodies[0]);
            }
        });

        setIsLoading(false);

        return () => {
             unsubArmor();
             unsubHairstyles();
             unsubBodies();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Effect to update transform states when selected body or equipped items change
    useEffect(() => {
        if (!allBaseBodies.length) return;
        
        const newTransforms: typeof transforms = {};
        const defaultBodyId = allBaseBodies[0]?.id;

        equippedItems.forEach(piece => {
            const currentPieceTransforms = transforms[piece.id] || {};
            let savedTransform, savedTransform2;
            
            if ('slot' in piece) { // Armor
                const baseTransform = piece.transforms?.[selectedBody?.id || ''] || piece.transforms?.[defaultBodyId || ''];
                const baseTransform2 = piece.transforms2?.[selectedBody?.id || ''] || piece.transforms2?.[defaultBodyId || ''];
                
                savedTransform = baseTransform || { x: 50, y: 50, scale: 40, rotation: 0 };
                savedTransform2 = baseTransform2 || { x: 50, y: 50, scale: 40, rotation: 0 };
                
                newTransforms[piece.id] = {
                    ...currentPieceTransforms,
                    x: savedTransform.x, 
                    y: savedTransform.y, 
                    scale: savedTransform.scale,
                    rotation: savedTransform.rotation || 0,
                    x2: savedTransform2.x, 
                    y2: savedTransform2.y, 
                    scale2: savedTransform2.scale,
                    rotation2: savedTransform2.rotation || 0,
                };
            } else { // Hairstyle
                 const baseTransform = piece.transforms?.[selectedBody?.id || ''] || piece.transforms?.[defaultBodyId || ''];
                 savedTransform = baseTransform || { x: 50, y: 50, scale: 100, rotation: 0 };
                 newTransforms[piece.id] = {
                    ...currentPieceTransforms,
                    x: savedTransform.x, 
                    y: savedTransform.y, 
                    scale: savedTransform.scale,
                    rotation: savedTransform.rotation || 0,
                 };
            }
        });
        
        setTransforms(newTransforms);
        
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equippedItems, selectedBody, allBaseBodies]);
    
    const activePiece = useMemo(() => {
        return equippedItems.find(p => p.id === activePieceId) || null;
    }, [activePieceId, equippedItems]);

    const activeTransform = activePieceId ? transforms[activePieceId] : null;

    const handleItemLibraryClick = (item: ArmorPiece | Hairstyle) => {
        setEquippedItems(prev => {
            const isEquipped = prev.some(p => p.id === item.id);
            if (isEquipped) {
                if(activePieceId === item.id) setActivePieceId(null);
                return prev.filter(p => p.id !== item.id);
            } else {
                return [...prev, item];
            }
        });
    }

    const setTransformForActivePiece = (newTransform: Partial<(typeof transforms)[string]>) => {
        if (!activePieceId) return;
        setTransforms(prev => ({
            ...prev,
            [activePieceId]: { ...prev[activePieceId], ...newTransform },
        }));
    };
    
    const handleSliderChange = (type: 'x' | 'y' | 'scale' | 'rotation' | 'x2' | 'y2' | 'scale2' | 'rotation2', value: number) => {
        setTransformForActivePiece({ [type]: value });
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, pieceId: string, layer: 'primary' | 'secondary') => {
        if (isPreviewMode) return;
        e.preventDefault();
        setActivePieceId(pieceId);
        setEditingLayer(layer);
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !canvasRef.current || !activeTransform || isPreviewMode) return;
        e.preventDefault();
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const newX = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
        const newY = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;
        
        if(editingLayer === 'primary') {
            setTransformForActivePiece({ x: newX, y: newY });
        } else {
             setTransformForActivePiece({ x2: newX, y2: newY });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleSaveTransform = async () => {
        if (!activePiece || !selectedBody || !activeTransform) {
            toast({ variant: 'destructive', title: 'Selection Missing', description: 'Please select a base body and an active item to save.' });
            return;
        }
        setIsSaving(true);
        try {
            if ('slot' in activePiece) { // Armor
                const armorRef = doc(db, 'armorPieces', activePiece.id);
                const updates: any = {
                    [`transforms.${selectedBody.id}`]: { x: activeTransform.x, y: activeTransform.y, scale: activeTransform.scale, rotation: activeTransform.rotation || 0 }
                };
                if(activePiece.modularImageUrl2) {
                    updates[`transforms2.${selectedBody.id}`] = { x: activeTransform.x2, y: activeTransform.y2, scale: activeTransform.scale2, rotation: activeTransform.rotation2 || 0 };
                }
                await updateDoc(armorRef, updates);
            } else { // Hairstyle
                const hairRef = doc(db, 'hairstyles', activePiece.id);
                 await updateDoc(hairRef, {
                    [`transforms.${selectedBody.id}`]: { x: activeTransform.x, y: activeTransform.y, scale: activeTransform.scale, rotation: activeTransform.rotation || 0 }
                });
            }

            toast({ title: 'Transform Saved!', description: `Position for ${'styleName' in activePiece ? activePiece.styleName : activePiece.name} on ${selectedBody.name} has been saved.` });
        } catch (error) {
            console.error("Error saving transform:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the transform.' });
        } finally {
            setIsSaving(false);
        }
    };


     if (!user || isLoading) {
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
                         <h1 className="text-2xl font-bold">2D Sizer</h1>
                         <Button onClick={handleSaveTransform} disabled={isSaving || !activePiece || isPreviewMode}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Active Piece
                         </Button>
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Library Panel */}
                        <div className="lg:col-span-1 space-y-4">
                             <Card>
                                <CardHeader><CardTitle>Base Bodies</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-2">
                                    {allBaseBodies.map((body) => (
                                         <div key={body.id} className={cn("border p-1 rounded-md cursor-pointer hover:border-primary", selectedBody?.id === body.id && "border-primary ring-2 ring-primary")} onClick={() => setSelectedBody(body)}>
                                            <Image src={body.thumbnailUrl} alt={body.name} width={150} height={150} className="w-full h-auto object-contain bg-gray-200 rounded-sm" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                            <Tabs defaultValue="armor">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="armor">Armor</TabsTrigger>
                                    <TabsTrigger value="hairstyles">Hairstyles</TabsTrigger>
                                </TabsList>
                                <TabsContent value="armor">
                                    <ScrollArea className="h-[40vh] p-2 border rounded-md">
                                        {allArmorPieces.map(piece => (
                                            <div 
                                                key={piece.id} 
                                                className={cn( "p-1 my-1 rounded-md cursor-pointer hover:bg-muted flex items-center gap-2", equippedItems.some(p => p.id === piece.id) && "bg-primary/20")}
                                                onClick={() => handleItemLibraryClick(piece)}
                                            >
                                                <Image src={piece.imageUrl} alt={piece.name} width={40} height={40} className="object-contain bg-gray-200 rounded-sm" />
                                                <p className="text-xs font-semibold truncate">{piece.name}</p>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </TabsContent>
                                <TabsContent value="hairstyles">
                                     <ScrollArea className="h-[40vh] p-2 border rounded-md">
                                         {allHairstyles.map(style => (
                                            <div 
                                                key={style.id} 
                                                className={cn( "p-1 my-1 rounded-md cursor-pointer hover:bg-muted flex items-center gap-2", equippedItems.some(p => p.id === style.id) && "bg-primary/20")}
                                                onClick={() => handleItemLibraryClick(style)}
                                            >
                                                <Image src={style.thumbnailUrl || style.baseImageUrl} alt={style.styleName} width={40} height={40} className="object-contain bg-gray-200 rounded-sm" />
                                                <p className="text-xs font-semibold truncate">{style.styleName}</p>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
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
                                        <Image src={selectedBody.imageUrl} alt="Selected Base Body" fill className="object-contain max-h-full max-w-full" />
                                   ) : (
                                       <p>Select a Base Body to begin.</p>
                                   )}
                                    {equippedItems.map(item => {
                                        const itemTransforms = transforms[item.id];
                                        if (!itemTransforms) return null;
                                        const isActive = item.id === activePieceId;
                                        
                                        if('slot' in item) { // Armor
                                            const piece = item;
                                            const zIndex = slotZIndex[piece.slot] || 1;
                                            const isGenderedSlot = piece.slot === 'chest' || piece.slot === 'legs';
                                            const primaryImageUrl = isGenderedSlot
                                                ? (selectedBody?.gender === 'female' ? piece.modularImageUrlFemale : piece.modularImageUrlMale) || piece.modularImageUrlMale || piece.modularImageUrl
                                                : piece.modularImageUrl;

                                            return (
                                                <React.Fragment key={piece.id}>
                                                    <div 
                                                        className={cn("absolute cursor-move", isPreviewMode ? 'opacity-100 pointer-events-none' : (!isActive && 'opacity-50 pointer-events-none'))}
                                                        style={{ 
                                                            left: `${itemTransforms.x}%`, 
                                                            top: `${itemTransforms.y}%`, 
                                                            width: `${itemTransforms.scale}%`, 
                                                            transform: `translate(-50%, -50%) rotate(${itemTransforms.rotation || 0}deg)`, 
                                                            zIndex: isPreviewMode ? zIndex : (isActive && editingLayer === 'primary' ? 20 : zIndex) 
                                                        }}
                                                        onMouseDown={(e) => handleMouseDown(e, piece.id, 'primary')}
                                                    >
                                                        <Image src={primaryImageUrl} alt={piece.name} width={500} height={500} className="object-contain max-h-full max-w-full pointer-events-none" />
                                                    </div>
                                                    {piece.modularImageUrl2 && (
                                                        <div 
                                                            className={cn("absolute cursor-move", isPreviewMode ? 'opacity-100 pointer-events-none' : (!isActive && 'opacity-50 pointer-events-none'))}
                                                            style={{ 
                                                                left: `${itemTransforms.x2}%`, 
                                                                top: `${itemTransforms.y2}%`, 
                                                                width: `${itemTransforms.scale2}%`, 
                                                                transform: `translate(-50%, -50%) rotate(${itemTransforms.rotation2 || 0}deg)`, 
                                                                zIndex: isPreviewMode ? zIndex : (isActive && editingLayer === 'secondary' ? 20 : zIndex) 
                                                            }}
                                                            onMouseDown={(e) => handleMouseDown(e, piece.id, 'secondary')}
                                                        >
                                                            <Image src={piece.modularImageUrl2} alt={piece.name} width={500} height={500} className="object-contain max-h-full max-w-full pointer-events-none" />
                                                        </div>
                                                    )}
                                                </React.Fragment>
                                            )
                                        } else { // Hairstyle
                                            const hairstyle = item;
                                            return (
                                                <div 
                                                    key={hairstyle.id}
                                                    className={cn("absolute cursor-move", isPreviewMode ? 'opacity-100 pointer-events-none' : (!isActive && 'opacity-50 pointer-events-none'))}
                                                    style={{ 
                                                        left: `${itemTransforms.x}%`, 
                                                        top: `${itemTransforms.y}%`, 
                                                        width: `${itemTransforms.scale}%`, 
                                                        transform: `translate(-50%, -50%) rotate(${itemTransforms.rotation || 0}deg)`, 
                                                        zIndex: isPreviewMode ? 10 : (isActive ? 20 : 10) 
                                                    }}
                                                    onMouseDown={(e) => handleMouseDown(e, hairstyle.id, 'primary')}
                                                >
                                                    <Image src={hairstyle.baseImageUrl} alt={hairstyle.styleName} width={500} height={500} className="object-contain max-h-full max-w-full pointer-events-none" />
                                                </div>
                                            )
                                        }
                                    })}
                                </CardContent>
                            </Card>
                        </div>
                        {/* Controls Panel */}
                        <div className="lg:col-span-1 space-y-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle>Equipped Pieces</CardTitle>
                                        <div className="flex items-center space-x-2">
                                            <Label htmlFor="preview-mode" className="flex items-center gap-1 cursor-pointer"><Eye className="h-4 w-4"/> Preview</Label>
                                            <Switch id="preview-mode" checked={isPreviewMode} onCheckedChange={setIsPreviewMode} />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                     {equippedItems.length === 0 && <p className="text-sm text-muted-foreground">Select items from the library to add them here.</p>}
                                     {equippedItems.map(item => (
                                         <div key={item.id} className={cn("flex items-center justify-between p-2 rounded-md", item.id === activePieceId && !isPreviewMode ? 'bg-primary/20' : 'bg-secondary')}>
                                             <span className="font-semibold text-sm truncate">{'styleName' in item ? item.styleName : item.name}</span>
                                             <div className="flex gap-1">
                                                 <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setActivePieceId(item.id)} disabled={isPreviewMode}><Edit className="h-4 w-4" /></Button>
                                                 <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleItemLibraryClick(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                             </div>
                                         </div>
                                     ))}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                     {activePiece && activeTransform ? (
                                        <>
                                            {'slot' in activePiece && activePiece.modularImageUrl2 && (
                                                <div className="space-y-2 p-2 border rounded-md">
                                                    <Label className="flex items-center gap-2"><Layers/> Editing Layer</Label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button variant={editingLayer === 'primary' ? 'default' : 'outline'} onClick={() => setEditingLayer('primary')} disabled={isPreviewMode}>Primary</Button>
                                                        <Button variant={editingLayer === 'secondary' ? 'default' : 'outline'} onClick={() => setEditingLayer('secondary')} disabled={isPreviewMode}>Secondary</Button>
                                                    </div>
                                                </div>
                                            )}
                                            {editingLayer === 'primary' || !('slot' in activePiece) ? (
                                                 <>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="x-pos">X Position: {activeTransform.x.toFixed(2)}%</Label>
                                                        <Slider id="x-pos" value={[activeTransform.x]} onValueChange={([val]) => handleSliderChange('x', val)} min={0} max={100} step={0.1} disabled={isPreviewMode} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="y-pos">Y Position: {activeTransform.y.toFixed(2)}%</Label>
                                                        <Slider id="y-pos" value={[activeTransform.y]} onValueChange={([val]) => handleSliderChange('y', val)} min={0} max={100} step={0.1} disabled={isPreviewMode} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="scale">Scale: {activeTransform.scale}%</Label>
                                                        <Slider id="scale" value={[activeTransform.scale]} onValueChange={([val]) => handleSliderChange('scale', val)} min={10} max={200} step={0.5} disabled={isPreviewMode} />
                                                    </div>
                                                     <div className="space-y-2">
                                                        <Label htmlFor="rotation">Rotation: {activeTransform.rotation || 0}°</Label>
                                                        <Slider id="rotation" value={[activeTransform.rotation || 0]} onValueChange={([val]) => handleSliderChange('rotation', val)} min={-180} max={180} step={1} disabled={isPreviewMode} />
                                                    </div>
                                                </>
                                            ) : (
                                                 <>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="x2-pos">X2 Position: {activeTransform.x2.toFixed(2)}%</Label>
                                                        <Slider id="x2-pos" value={[activeTransform.x2]} onValueChange={([val]) => handleSliderChange('x2', val)} min={0} max={100} step={0.1} disabled={isPreviewMode} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="y2-pos">Y2 Position: {activeTransform.y2.toFixed(2)}%</Label>
                                                        <Slider id="y2-pos" value={[activeTransform.y2]} onValueChange={([val]) => handleSliderChange('y2', val)} min={0} max={100} step={0.1} disabled={isPreviewMode} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="scale2">Scale 2: {activeTransform.scale2}%</Label>
                                                        <Slider id="scale2" value={[activeTransform.scale2]} onValueChange={([val]) => handleSliderChange('scale2', val)} min={10} max={200} step={0.5} disabled={isPreviewMode} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="rotation2">Rotation 2: {activeTransform.rotation2 || 0}°</Label>
                                                        <Slider id="rotation2" value={[activeTransform.rotation2 || 0]} onValueChange={([val]) => handleSliderChange('rotation2', val)} min={-180} max={180} step={1} disabled={isPreviewMode} />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                     ) : (
                                        <p className="text-sm text-muted-foreground">Select an equipped piece to see its controls.</p>
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
