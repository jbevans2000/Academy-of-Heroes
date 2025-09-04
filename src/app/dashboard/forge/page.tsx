
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { ArmorPiece, Hairstyle, BaseBody, ArmorSlot } from '@/lib/forge';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, RotateCcw, Hammer, Edit, Trash2, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ArmoryDialog } from '@/components/dashboard/armory-dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';


const slotZIndex: Record<ArmorSlot, number> = {
    legs: 1,
    feet: 2,
    chest: 3,
    shoulders: 4,
    head: 5,
    hands: 5,
};

const CharacterCanvas = ({ student, equipment, baseBody, onMouseDown, canvasRef, onMouseMove, onMouseUp, activePieceId, editingLayer }: {
    student: Student | null;
    equipment: any;
    baseBody: BaseBody | null;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>, piece: ArmorPiece, layer: 'primary' | 'secondary') => void;
    canvasRef: React.RefObject<HTMLDivElement>;
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: () => void;
    activePieceId: string | null;
    editingLayer: 'primary' | 'secondary';
}) => {
    if (!student || !baseBody) return <Skeleton className="w-full h-full" />;

    const hairstyle = equipment.hairstyle as Hairstyle | null;
    const hairstyleColor = equipment.hairstyleColor || hairstyle?.colors[0]?.imageUrl;

    const hairstyleTransform = hairstyle?.transforms?.[baseBody.id] || { x: 50, y: 50, scale: 100 };
    
    const equippedArmor: ArmorPiece[] = [
        equipment.head,
        equipment.shoulders,
        equipment.chest,
        equipment.hands,
        equipment.legs,
        equipment.feet,
    ].filter(Boolean);

    return (
        <div 
            ref={canvasRef}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            className="relative w-full max-w-[500px] aspect-square"
        >
            <Image src={baseBody.imageUrl} alt="Base Body" fill className="object-contain" priority />
            
            {hairstyleColor && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        top: `${hairstyleTransform.y}%`,
                        left: `${hairstyleTransform.x}%`,
                        width: `${hairstyleTransform.scale}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10
                    }}
                >
                    <Image src={hairstyleColor} alt="Hairstyle" width={500} height={500} className="object-contain" />
                </div>
            )}
            
             {equippedArmor.map(piece => {
                if (!piece) return null;
                
                const customTransform = student.armorTransforms?.[piece.id]?.[baseBody!.id];
                const defaultTransform = piece.transforms?.[baseBody!.id] || { x: 50, y: 50, scale: 100 };
                const transform = customTransform || defaultTransform;
                
                const customTransform2 = student.armorTransforms2?.[piece.id]?.[baseBody!.id];
                const defaultTransform2 = piece.transforms2?.[baseBody!.id] || { x: 50, y: 50, scale: 100 };
                const transform2 = customTransform2 || defaultTransform2;

                const zIndex = slotZIndex[piece.slot] || 1;
                const isActive = piece.id === activePieceId;

                return (
                    <React.Fragment key={piece.id}>
                        <div
                            onMouseDown={(e) => onMouseDown(e, piece, 'primary')}
                            className={cn(
                                "absolute pointer-events-auto cursor-move",
                                !isActive && "opacity-75"
                            )}
                            style={{
                                top: `${transform.y}%`,
                                left: `${transform.x}%`,
                                width: `${transform.scale}%`,
                                transform: 'translate(-50%, -50%)',
                                zIndex: isActive && editingLayer === 'primary' ? 20 : zIndex,
                            }}
                        >
                            <Image src={piece.modularImageUrl} alt={piece.name} width={500} height={500} className="object-contain pointer-events-none" />
                        </div>
                        {piece.modularImageUrl2 && (
                             <div
                                onMouseDown={(e) => onMouseDown(e, piece, 'secondary')}
                                className={cn(
                                    "absolute pointer-events-auto cursor-move",
                                    !isActive && "opacity-75"
                                )}
                                style={{
                                    top: `${transform2.y}%`,
                                    left: `${transform2.x}%`,
                                    width: `${transform2.scale}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: isActive && editingLayer === 'secondary' ? 20 : zIndex,
                                }}
                            >
                                <Image src={piece.modularImageUrl2} alt={`${piece.name} (secondary)`} width={500} height={500} className="object-contain pointer-events-none" />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};


export default function ForgePage() {
    const router = useRouter();
    const { toast } = useToast();

    // Data State
    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [baseBodies, setBaseBodies] = useState<BaseBody[]>([]);
    const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
    const [allArmor, setAllArmor] = useState<ArmorPiece[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Dialog State
    const [isArmoryOpen, setIsArmoryOpen] = useState(false);

    // Equipment State
    const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
    const [selectedHairstyleId, setSelectedHairstyleId] = useState<string | null>(null);
    const [selectedHairstyleColor, setSelectedHairstyleColor] = useState<string | null>(null);
    const [selectedHead, setSelectedHead] = useState<ArmorPiece | null>(null);
    const [selectedShoulders, setSelectedShoulders] = useState<ArmorPiece | null>(null);
    const [selectedChest, setSelectedChest] = useState<ArmorPiece | null>(null);
    const [selectedHands, setSelectedHands] = useState<ArmorPiece | null>(null);
    const [selectedLegs, setSelectedLegs] = useState<ArmorPiece | null>(null);
    const [selectedFeet, setSelectedFeet] = useState<ArmorPiece | null>(null);
    
    // Sizer state
    const [activePiece, setActivePiece] = useState<ArmorPiece | null>(null);
    const [localTransforms, setLocalTransforms] = useState<Student['armorTransforms']>({});
    const [localTransforms2, setLocalTransforms2] = useState<Student['armorTransforms2']>({});
    const [editingLayer, setEditingLayer] = useState<'primary' | 'secondary'>('primary');
    const [isDragging, setIsDragging] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const studentMetaRef = doc(db, 'students', currentUser.uid);
                const studentMetaSnap = await getDoc(studentMetaRef);
                if (studentMetaSnap.exists()) {
                    const foundTeacherUid = studentMetaSnap.data().teacherUid;
                    setTeacherUid(foundTeacherUid);
                } else {
                    router.push('/dashboard');
                }
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!user || !teacherUid) return;

        const unsubStudent = onSnapshot(doc(db, 'teachers', teacherUid, 'students', user.uid), (doc) => {
            if (doc.exists()) {
                const studentData = { uid: doc.id, ...doc.data() } as Student;
                setStudent(studentData);
                // Initialize local transforms only if they haven't been touched yet in the session
                if (Object.keys(localTransforms).length === 0) {
                    setLocalTransforms(studentData.armorTransforms || {});
                }
                if (Object.keys(localTransforms2).length === 0) {
                    setLocalTransforms2(studentData.armorTransforms2 || {});
                }
            }
        });
        
        const fetchCosmetics = async () => {
             try {
                const bodiesSnap = await getDocs(collection(db, 'baseBodies'));
                const bodiesData = bodiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseBody)).sort((a: any, b: any) => a.order - b.order);
                setBaseBodies(bodiesData);
                
                const hairQuery = query(collection(db, 'hairstyles'), where('isPublished', '==', true));
                const hairSnap = await getDocs(hairQuery);
                setHairstyles(hairSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle)));

                const armorQuery = query(collection(db, 'armorPieces'), where('isPublished', '==', true));
                const armorSnap = await getDocs(armorQuery);
                const armorData = armorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece));
                setAllArmor(armorData);
                
             } catch (e) {
                console.error("Error fetching cosmetics:", e);
                toast({ variant: 'destructive', title: "Error", description: "Could not load cosmetic items." });
             } finally {
                setIsLoading(false);
             }
        }
        
        fetchCosmetics();

        return () => unsubStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, teacherUid, toast]);
    
    const setInitialEquipment = useCallback(() => {
        if (student && allArmor.length > 0 && baseBodies.length > 0) {
            setSelectedBodyId(student.equippedBodyId || baseBodies[0]?.id || null);
            setSelectedHairstyleId(student.equippedHairstyleId || null);
            setSelectedHairstyleColor(student.equippedHairstyleColor || null);
            setSelectedHead(allArmor.find(a => a.id === student.equippedHeadId) || null);
            setSelectedShoulders(allArmor.find(a => a.id === student.equippedShouldersId) || null);
            setSelectedChest(allArmor.find(a => a.id === student.equippedChestId) || null);
            setSelectedHands(allArmor.find(a => a.id === student.equippedHandsId) || null);
            setSelectedLegs(allArmor.find(a => a.id === student.equippedLegsId) || null);
            setSelectedFeet(allArmor.find(a => a.id === student.equippedFeetId) || null);
            setLocalTransforms(student.armorTransforms || {});
            setLocalTransforms2(student.armorTransforms2 || {});
        }
    }, [student, allArmor, baseBodies]);

    useEffect(() => {
        setInitialEquipment();
    }, [setInitialEquipment]);

    const handleEquipArmor = (piece: ArmorPiece) => {
        const equipLogic = (prev: ArmorPiece | null) => prev?.id === piece.id ? null : piece;
        switch (piece.slot) {
            case 'head': setSelectedHead(equipLogic); break;
            case 'shoulders': setSelectedShoulders(equipLogic); break;
            case 'chest': setSelectedChest(equipLogic); break;
            case 'hands': setSelectedHands(equipLogic); break;
            case 'legs': setSelectedLegs(equipLogic); break;
            case 'feet': setSelectedFeet(equipLogic); break;
        }
    };
    
    const handleSliderChange = (type: 'x' | 'y' | 'scale' | 'x2' | 'y2' | 'scale2', value: number) => {
        if (!activePiece || !selectedBodyId) return;

        if (type === 'x' || type === 'y' || type === 'scale') {
            setLocalTransforms(prev => ({
                ...prev,
                [activePiece.id]: {
                    ...prev?.[activePiece.id],
                    [selectedBodyId]: {
                        ...(prev?.[activePiece.id]?.[selectedBodyId] || activePiece.transforms?.[selectedBodyId] || {x:50, y:50, scale:100}),
                        [type]: value
                    }
                }
            }));
        } else { // Handle secondary transforms
             const key = type.slice(0, -1); // x2 -> x, y2 -> y, scale2 -> scale
             setLocalTransforms2(prev => ({
                ...prev,
                [activePiece.id]: {
                    ...prev?.[activePiece.id],
                    [selectedBodyId]: {
                        ...(prev?.[activePiece.id]?.[selectedBodyId] || activePiece.transforms2?.[selectedBodyId] || {x:50, y:50, scale:100}),
                        [key]: value
                    }
                }
            }));
        }
    };
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, piece: ArmorPiece, layer: 'primary' | 'secondary') => {
        e.preventDefault();
        setActivePiece(piece);
        setEditingLayer(layer);
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !canvasRef.current || !activePiece) return;
        e.preventDefault();
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const newX = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
        const newY = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;
        
        if (editingLayer === 'primary') {
            handleSliderChange('x', newX);
            handleSliderChange('y', newY);
        } else {
            handleSliderChange('x2', newX);
            handleSliderChange('y2', newY);
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleSave = async () => {
        if (!user || !teacherUid) return;
        setIsSaving(true);
        try {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
            await updateDoc(studentRef, {
                equippedBodyId: selectedBodyId,
                equippedHairstyleId: selectedHairstyleId,
                equippedHairstyleColor: selectedHairstyleColor,
                equippedHeadId: selectedHead?.id || '',
                equippedShouldersId: selectedShoulders?.id || '',
                equippedChestId: selectedChest?.id || '',
                equippedHandsId: selectedHands?.id || '',
                equippedLegsId: selectedLegs?.id || '',
                equippedFeetId: selectedFeet?.id || '',
                armorTransforms: localTransforms,
                armorTransforms2: localTransforms2,
            });
            toast({ title: "Appearance Saved!", description: "Your hero's new look has been saved." });
        } catch (error) {
            console.error("Error saving appearance:", error);
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not save your new look." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setInitialEquipment();
        setActivePiece(null);
        toast({ title: "Appearance Reset", description: "Your appearance has been reset to the last saved version."});
    }

    const selectedHairstyle = hairstyles.find(h => h.id === selectedHairstyleId);
    const ownedArmor = allArmor.filter(armor => student?.ownedArmorIds?.includes(armor.id));
    const armorSlotOrder: ArmorSlot[] = ['head', 'shoulders', 'chest', 'hands', 'legs', 'feet'];

    const armorBySlot = useMemo(() => {
        const slots: Record<ArmorSlot, ArmorPiece[]> = { head: [], shoulders: [], chest: [], hands: [], legs: [], feet: [] };
        ownedArmor.forEach(piece => {
            if (slots[piece.slot]) {
                slots[piece.slot].push(piece);
            }
        });
        return slots;
    }, [ownedArmor]);
    
    const activePrimaryTransform = useMemo(() => {
        if (!activePiece || !selectedBodyId) return null;
        return localTransforms?.[activePiece.id]?.[selectedBodyId] 
            || activePiece.transforms?.[selectedBodyId]
            || { x: 50, y: 50, scale: 100 };
    }, [activePiece, selectedBodyId, localTransforms]);
    
    const activeSecondaryTransform = useMemo(() => {
        if (!activePiece || !selectedBodyId) return null;
        return localTransforms2?.[activePiece.id]?.[selectedBodyId] 
            || activePiece.transforms2?.[selectedBodyId]
            || { x: 50, y: 50, scale: 100 };
    }, [activePiece, selectedBodyId, localTransforms2]);

    if (isLoading || !student) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin"/></div>
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            {student && <ArmoryDialog isOpen={isArmoryOpen} onOpenChange={setIsArmoryOpen} student={student} allArmor={allArmor} />}
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                 <div className="w-full max-w-7xl mx-auto space-y-4">
                     <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => router.push('/dashboard')}><ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard</Button>
                        <div className="flex gap-2">
                             <Button onClick={() => setIsArmoryOpen(true)}>
                                <Hammer className="mr-2 h-4 w-4"/>
                                The Armory
                             </Button>
                             <Button variant="secondary" onClick={handleReset} disabled={isSaving}><RotateCcw className="mr-2 h-4 w-4"/>Reset Appearance</Button>
                             <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                Save Appearance
                             </Button>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Column 1: Equipment Selection */}
                        <Card className="h-[75vh] flex flex-col">
                            <CardHeader>
                                <CardTitle>The Forge</CardTitle>
                                <CardDescription>Select your equipment.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow overflow-hidden">
                                    <Tabs defaultValue="body" className="w-full h-full flex flex-col">
                                    <TabsList className="grid w-full grid-cols-4">
                                        <TabsTrigger value="body">Body</TabsTrigger>
                                        <TabsTrigger value="hair">Hair</TabsTrigger>
                                        <TabsTrigger value="hair-color" disabled={!selectedHairstyle}>Color</TabsTrigger>
                                        <TabsTrigger value="armor">Armor</TabsTrigger>
                                    </TabsList>
                                    <ScrollArea className="flex-grow mt-4">
                                        <TabsContent value="body" className="p-1">
                                                <div className="grid grid-cols-3 gap-2">
                                                {baseBodies.map(item => (
                                                    <Card 
                                                        key={item.id} 
                                                        className={cn( "cursor-pointer hover:border-primary", selectedBodyId === item.id && "border-2 border-primary" )}
                                                        onClick={() => setSelectedBodyId(item.id)} >
                                                        <CardContent className="p-1 aspect-square">
                                                            <Image src={item.imageUrl} alt={item.name} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="hair" className="p-1">
                                            <div className="grid grid-cols-3 gap-2">
                                                {hairstyles.map(item => (
                                                    <Card 
                                                        key={item.id} 
                                                        className={cn( "cursor-pointer hover:border-primary", selectedHairstyleId === item.id && "border-2 border-primary" )}
                                                        onClick={() => {
                                                            if(selectedHairstyleId === item.id) {
                                                                setSelectedHairstyleId(null);
                                                                setSelectedHairstyleColor(null);
                                                            } else {
                                                                setSelectedHairstyleId(item.id);
                                                                setSelectedHairstyleColor(item.colors?.[0]?.imageUrl || null);
                                                            }
                                                        }} >
                                                        <CardContent className="p-1 aspect-square">
                                                            <Image src={item.baseImageUrl} alt={item.styleName} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="hair-color" className="p-1">
                                            {selectedHairstyle && (
                                                <div className="grid grid-cols-5 gap-2">
                                                    {selectedHairstyle.colors.map((color, index) => (
                                                        <div 
                                                            key={index} 
                                                            className={cn("h-16 w-16 rounded-md border-2 cursor-pointer", selectedHairstyleColor === color.imageUrl ? "border-primary ring-2 ring-primary" : "border-transparent")}
                                                            onClick={() => setSelectedHairstyleColor(color.imageUrl)} >
                                                            <Image src={color.imageUrl} alt={`Color ${index+1}`} width={64} height={64} className="w-full h-full object-contain rounded-sm bg-secondary" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>
                                        <TabsContent value="armor" className="p-1 space-y-4">
                                            {armorSlotOrder.map(slot => (
                                                <div key={slot}>
                                                    <h4 className="capitalize font-semibold mb-2 text-center border-b pb-1">{slot}</h4>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {armorBySlot[slot].length === 0 ? (
                                                            <p className="text-muted-foreground text-sm col-span-3 text-center py-2">No items owned for this slot.</p>
                                                        ) : (
                                                            armorBySlot[slot].map(item => {
                                                                const isEquipped = [selectedHead, selectedShoulders, selectedChest, selectedHands, selectedLegs, selectedFeet].some(p => p?.id === item.id);
                                                                return (
                                                                    <Card 
                                                                        key={item.id} 
                                                                        className={cn("cursor-pointer hover:border-primary", isEquipped && "border-2 border-primary")}
                                                                        onClick={() => handleEquipArmor(item)} >
                                                                        <CardContent className="p-1 aspect-square">
                                                                            <Image src={item.imageUrl} alt={item.name} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
                                                                        </CardContent>
                                                                    </Card>
                                                                )
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </TabsContent>
                                    </ScrollArea>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Column 2: Canvas */}
                        <div className="lg:col-span-1">
                            <Card className="h-[75vh]">
                                <CardContent className="h-full p-4 flex items-center justify-center">
                                     <CharacterCanvas 
                                        student={{...student, armorTransforms, armorTransforms2}}
                                        baseBody={baseBodies.find(b => b.id === selectedBodyId) || null}
                                        equipment={{ 
                                            hairstyle: selectedHairstyle, 
                                            hairstyleColor: selectedHairstyleColor,
                                            head: selectedHead,
                                            shoulders: selectedShoulders,
                                            chest: selectedChest,
                                            hands: selectedHands,
                                            legs: selectedLegs,
                                            feet: selectedFeet,
                                        }}
                                        onMouseDown={handleMouseDown}
                                        canvasRef={canvasRef}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        activePieceId={activePiece?.id || null}
                                        editingLayer={editingLayer}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Column 3: Controls */}
                        <div className="lg:col-span-1">
                             <Card className="h-[75vh] flex flex-col">
                                <CardHeader>
                                    <CardTitle>Active Piece Controls</CardTitle>
                                    <CardDescription>Click a piece on the character to adjust it.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4">
                                     <div className="p-2 border rounded-md h-24 overflow-y-auto space-y-1">
                                        {[selectedHead, selectedShoulders, selectedChest, selectedHands, selectedLegs, selectedFeet].filter(Boolean).map(piece => (
                                                <div key={piece!.id} className={cn("p-1 rounded-md cursor-pointer text-sm", activePiece?.id === piece!.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary')} onClick={() => setActivePiece(piece)}>
                                                    {piece!.name}
                                                </div>
                                        ))}
                                        </div>
                                        {activePiece ? (
                                            <>
                                            {activePiece.modularImageUrl2 && (
                                                <div className="space-y-2 p-2 border rounded-md">
                                                    <Label className="flex items-center gap-2"><Layers/> Editing Layer</Label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button variant={editingLayer === 'primary' ? 'default' : 'outline'} onClick={() => setEditingLayer('primary')}>Primary</Button>
                                                        <Button variant={editingLayer === 'secondary' ? 'default' : 'outline'} onClick={() => setEditingLayer('secondary')}>Secondary</Button>
                                                    </div>
                                                </div>
                                            )}

                                            {editingLayer === 'primary' && activePrimaryTransform ? (
                                                 <div className="space-y-4 animate-in fade-in-50">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="x-pos">X Position: {activePrimaryTransform.x.toFixed(2)}%</Label>
                                                        <Slider id="x-pos" value={[activePrimaryTransform.x]} onValueChange={([val]) => handleSliderChange('x', val)} min={0} max={100} step={0.1} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="y-pos">Y Position: {activePrimaryTransform.y.toFixed(2)}%</Label>
                                                        <Slider id="y-pos" value={[activePrimaryTransform.y]} onValueChange={([val]) => handleSliderChange('y', val)} min={0} max={100} step={0.1} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="scale">Scale: {activePrimaryTransform.scale}%</Label>
                                                        <Slider id="scale" value={[activePrimaryTransform.scale]} onValueChange={([val]) => handleSliderChange('scale', val)} min={10} max={200} step={0.5} />
                                                    </div>
                                                </div>
                                            ) : editingLayer === 'secondary' && activeSecondaryTransform ? (
                                                 <div className="space-y-4 animate-in fade-in-50">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="x2-pos">X2 Position: {activeSecondaryTransform.x.toFixed(2)}%</Label>
                                                        <Slider id="x2-pos" value={[activeSecondaryTransform.x]} onValueChange={([val]) => handleSliderChange('x2', val)} min={0} max={100} step={0.1} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="y2-pos">Y2 Position: {activeSecondaryTransform.y.toFixed(2)}%</Label>
                                                        <Slider id="y2-pos" value={[activeSecondaryTransform.y]} onValueChange={([val]) => handleSliderChange('y2', val)} min={0} max={100} step={0.1} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="scale2">Scale 2: {activeSecondaryTransform.scale}%</Label>
                                                        <Slider id="scale2" value={[activeSecondaryTransform.scale]} onValueChange={([val]) => handleSliderChange('scale2', val)} min={10} max={200} step={0.5} />
                                                    </div>
                                                </div>
                                            ) : null}
                                            </>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center">Select an equipped piece to adjust it.</p>
                                        )}
                                </CardContent>
                                 <CardFooter>
                                    <Button size="sm" variant="outline" onClick={() => setActivePiece(null)} disabled={!activePiece}>
                                        <Trash2 className="mr-2 h-4 w-4"/> Clear Active Piece
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                     </div>
                 </div>
            </main>
        </div>
    );
}
