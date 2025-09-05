
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { ArmorPiece, Hairstyle, BaseBody, ArmorSlot } from '@/lib/forge';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Hammer, Layers, Eye, Camera, X, Shirt, ArrowRight, Scissors, ChevronsRight, ChevronsLeft } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import * as htmlToImage from 'html-to-image';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';


const slotZIndex: Record<ArmorSlot, number> = {
    legs: 1,
    feet: 2,
    chest: 3,
    shoulders: 4,
    head: 5,
    hands: 5,
};

const baseBodyUrls = [
    { id: 'body_1', name: 'Base Body 1', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(1).png?alt=media&token=8ff364fe-6a96-4ace-b4e8-f011c87f725f', width: 500, height: 500 },
    { id: 'body_2', name: 'Base Body 2', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(2).png?alt=media&token=c41b2cae-9f42-43c5-bd3c-e33d316c0a78', width: 500, height: 500 },
    { id: 'body_3', name: 'Base Body 3', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(3).png?alt=media&token=f345fe77-f7e5-4d76-b42e-5154db5d9777', width: 500, height: 500 },
    { id: 'body_4', name: 'Base Body 4', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(4).png?alt=media&token=202e80bd-ed73-41d6-b60e-8992740545d4', width: 500, height: 500 },
    { id: 'body_5', name: 'Base Body 5', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(5).png?alt=media&token=a1132f06-6b2a-46af-95b3-b7b489d6f68b', width: 500, height: 500 },
    { id: 'body_6', name: 'Base Body 6', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(6).png?alt=media&token=1fbc2b95-d1fd-4662-b3ae-57e6d004a6fe', width: 500, height: 500 },
    { id: 'body_7', name: 'Base Body 7', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(7).png?alt=media&token=0070e4e9-f0cc-443b-bc1b-7679d7b7225b', width: 500, height: 500 },
    { id: 'body_8', name: 'Base Body 8', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody%20(8).png?alt=media&token=91503537-a701-412c-a082-8d969d99eb84', width: 500, height: 500 },
    { id: 'body_9', name: 'Base Body 9', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FBaseBody_Transparent_v2.png?alt=media&token=1f3248d5-d6bf-4b1d-b970-e6deef1ea3f7', width: 500, height: 500 },
    { id: 'body_10', name: 'Anime Base Body 1', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FAnimeBaseBody%20(1).png?alt=media&token=f738966c-d40a-454a-8e4a-78bf19d972be', width: 500, height: 500 },
    { id: 'body_11', name: 'Anime Base Body 2', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FAnimeBaseBody%20(2).png?alt=media&token=2fb0768c-e206-48f2-9a7a-a4b0cbd74e10', width: 500, height: 500 },
    { id: 'body_12', name: 'Anime Base Body 3', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FAnimeBaseBody%20(3).png?alt=media&token=2cdd0a22-2a98-42db-a5ba-95f6fef671b2', width: 500, height: 500 },
    { id: 'body_13', name: 'Anime Base Body 4', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FAnimeBaseBody%20(4).png?alt=media&token=c4ff0eed-e391-40c6-bd95-962ca3aa22b4', width: 500, height: 500 },
    { id: 'body_14', name: 'Anime Base Body 5', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FAnimeBaseBody%20(5).png?alt=media&token=4dfb98f7-c94d-48a6-97fe-4d13a9d3ed7b', width: 500, height: 500 },
    { id: 'body_15', name: 'Anime Base Body 6', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FAnimeBaseBody%20(6).png?alt=media&token=598124f6-d00e-4287-9669-cac51093f303', width: 500, height: 500 },
    { id: 'body_16', name: 'Anime Base Body 7', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FAnimeBaseBody%20(7).png?alt=media&token=639029aa-edee-4084-aab2-738f41d41a73', width: 500, height: 500 },
    { id: 'body_17', name: 'Anime Base Body 8', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Modular%20Sets%2FBase%20Bodies%2FAnimeBaseBody%20(8).png?alt=media&token=61445a4e-5b6a-4bb5-bce1-090c2976262e', width: 500, height: 500 },
];

const CharacterCanvas = React.forwardRef<HTMLDivElement, {
    student: Student | null;
    equipment: any;
    baseBody: BaseBody | null;
    allHairstyles: Hairstyle[];
    allArmor: ArmorPiece[];
    onMouseDown?: (e: React.MouseEvent<HTMLDivElement>, piece: ArmorPiece | Hairstyle, layer: 'primary' | 'secondary') => void;
    activePieceId: string | null;
    editingLayer: 'primary' | 'secondary';
    isPreviewMode: boolean;
    localHairstyleTransforms: Student['equippedHairstyleTransforms'];
    localArmorTransforms: Student['armorTransforms'];
    localArmorTransforms2: Student['armorTransforms2'];
}>(({ 
    student, 
    equipment, 
    baseBody, 
    allHairstyles,
    allArmor,
    onMouseDown, 
    activePieceId, 
    editingLayer, 
    isPreviewMode,
    localHairstyleTransforms,
    localArmorTransforms,
    localArmorTransforms2,
}, ref) => {
    if (!student || !baseBody) return <Skeleton className="w-full h-full" />;

    const hairstyle = allHairstyles.find(h => h.id === equipment.hairstyleId);
    const hairstyleColor = equipment.hairstyleColor || hairstyle?.colors[0]?.imageUrl;
    
    const hairstyleTransform = localHairstyleTransforms?.[baseBody.id] || hairstyle?.transforms?.[baseBody.id] || { x: 50, y: 50, scale: 100 };
    
    const equippedArmorPieces = Object.values(equipment)
        .map(id => allArmor.find(a => a.id === id))
        .filter((p): p is ArmorPiece => !!p);


    const handleHairMouseDown = onMouseDown && hairstyle ? (e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, hairstyle, 'primary') : undefined;

    return (
        <div 
            ref={ref}
            className="relative w-full h-full shadow-inner overflow-hidden"
            id="character-canvas-container" // ID for html-to-image
        >
            {equipment.backgroundUrl && (
                <Image src={equipment.backgroundUrl} alt="Selected Background" fill className="object-cover z-0" />
            )}

            <div className="relative w-full h-full z-10">
                <Image src={baseBody.imageUrl} alt="Base Body" fill className="object-contain" priority />
            
                {hairstyleColor && hairstyle && (
                    <div
                        onMouseDown={handleHairMouseDown}
                        className={cn(
                            "absolute",
                            isPreviewMode ? "cursor-default pointer-events-none" : "cursor-move pointer-events-auto",
                            activePieceId !== hairstyle.id && !isPreviewMode && "opacity-75"
                        )}
                        style={{
                            top: `${hairstyleTransform.y}%`,
                            left: `${hairstyleTransform.x}%`,
                            width: `${hairstyleTransform.scale}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: isPreviewMode ? 10 : (activePieceId === hairstyle.id ? 20 : 10)
                        }}
                    >
                        <Image src={hairstyleColor} alt="Hairstyle" width={500} height={500} className="object-contain pointer-events-none" />
                    </div>
                )}
                
                {equippedArmorPieces.map(piece => {
                    const customTransform = localArmorTransforms?.[piece.id]?.[baseBody!.id];
                    const firstAvailableDefaultTransform = piece.transforms ? Object.values(piece.transforms)[0] : null;
                    const defaultTransform = piece.transforms?.[baseBody!.id] || firstAvailableDefaultTransform || { x: 50, y: 50, scale: 40 };
                    const transform = customTransform || defaultTransform;
                    
                    const customTransform2 = localArmorTransforms2?.[piece.id]?.[baseBody!.id];
                    const firstAvailableDefaultTransform2 = piece.transforms2 ? Object.values(piece.transforms2)[0] : null;
                    const defaultTransform2 = piece.transforms2?.[baseBody!.id] || firstAvailableDefaultTransform2 || { x: 50, y: 50, scale: 40 };
                    const transform2 = customTransform2 || defaultTransform2;

                    const zIndex = slotZIndex[piece.slot] || 1;
                    const isActive = piece.id === activePieceId;

                    const handleMouseDownPrimary = onMouseDown ? (e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, piece, 'primary') : undefined;
                    const handleMouseDownSecondary = onMouseDown ? (e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, piece, 'secondary') : undefined;

                    return (
                        <React.Fragment key={piece.id}>
                            <div
                                onMouseDown={handleMouseDownPrimary}
                                className={cn(
                                    "absolute",
                                    isPreviewMode ? "cursor-default pointer-events-none" : "cursor-move pointer-events-auto",
                                    !isActive && !isPreviewMode && "opacity-75"
                                )}
                                style={{
                                    top: `${transform.y}%`,
                                    left: `${transform.x}%`,
                                    width: `${transform.scale}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: isPreviewMode ? zIndex : (isActive && editingLayer === 'primary' ? 20 : zIndex),
                                }}
                            >
                                <Image src={piece.modularImageUrl} alt={piece.name} width={500} height={500} className="object-contain pointer-events-none" />
                            </div>
                            {piece.modularImageUrl2 && (
                                <div
                                    onMouseDown={handleMouseDownSecondary}
                                    className={cn(
                                        "absolute",
                                        isPreviewMode ? "cursor-default pointer-events-none" : "cursor-move pointer-events-auto",
                                        !isActive && !isPreviewMode && "opacity-75"
                                    )}
                                    style={{
                                        top: `${transform2.y}%`,
                                        left: `${transform2.x}%`,
                                        width: `${transform2.scale}%`,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: isPreviewMode ? zIndex : (isActive && editingLayer === 'secondary' ? 20 : zIndex),
                                    }}
                                >
                                    <Image src={piece.modularImageUrl2} alt={`${piece.name} (secondary)`} width={500} height={500} className="object-contain pointer-events-none" />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
});
CharacterCanvas.displayName = 'CharacterCanvas';


export default function ForgePage() {
    const router = useRouter();
    const { toast } = useToast();

    // Data State
    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
    const [allArmor, setAllArmor] = useState<ArmorPiece[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSettingAvatar, setIsSettingAvatar] = useState(false);

    // Dialog State
    const [isArmoryOpen, setIsArmoryOpen] = useState(false);
    const [isConfirmingAvatar, setIsConfirmingAvatar] = useState(false);
    const [isAvatarSetDialogOpen, setIsAvatarSetDialogOpen] = useState(false);

    // Equipment State
    const [equipment, setEquipment] = useState({
        bodyId: baseBodyUrls[0]?.id || null,
        hairstyleId: null,
        hairstyleColor: null,
        backgroundUrl: null,
        headId: null,
        shouldersId: null,
        chestId: null,
        handsId: null,
        legsId: null,
        feetId: null,
    });
    
    // Sizer state
    const [activePiece, setActivePiece] = useState<ArmorPiece | Hairstyle | null>(null);
    const [localTransforms, setLocalTransforms] = useState<Student['armorTransforms']>({});
    const [localTransforms2, setLocalTransforms2] = useState<Student['armorTransforms2']>({});
    const [localHairstyleTransforms, setLocalHairstyleTransforms] = useState<Student['equippedHairstyleTransforms']>({});
    const [editingLayer, setEditingLayer] = useState<'primary' | 'secondary'>('primary');
    const [isDragging, setIsDragging] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    
    // Collapsible Controls State
    const [isControlsOpen, setIsControlsOpen] = useState(true);


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
                // Initialize equipment and transforms state from student data once
                setEquipment({
                    bodyId: studentData.equippedBodyId || baseBodyUrls[0]?.id || null,
                    hairstyleId: studentData.equippedHairstyleId || null,
                    hairstyleColor: studentData.equippedHairstyleColor || null,
                    backgroundUrl: studentData.backgroundUrl || null,
                    headId: studentData.equippedHeadId || null,
                    shouldersId: studentData.equippedShouldersId || null,
                    chestId: studentData.equippedChestId || null,
                    handsId: studentData.equippedHandsId || null,
                    legsId: studentData.equippedLegsId || null,
                    feetId: studentData.equippedFeetId || null,
                });
                setLocalTransforms(studentData.armorTransforms || {});
                setLocalTransforms2(studentData.armorTransforms2 || {});
                setLocalHairstyleTransforms(studentData.equippedHairstyleTransforms || {});
            }
        });
        
        const fetchCosmetics = async () => {
             try {
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
    
    const handleEquipItem = (item: ArmorPiece | Hairstyle) => {
        if ('slot' in item) { // It's an ArmorPiece
            const slotKey = `${item.slot}Id` as keyof typeof equipment;
            setEquipment(prev => ({
                ...prev,
                [slotKey]: prev[slotKey] === item.id ? null : item.id
            }));
        } else { // It's a Hairstyle
            if (equipment.hairstyleId === item.id) {
                setEquipment(prev => ({...prev, hairstyleId: null, hairstyleColor: null}));
                if (activePiece?.id === item.id) setActivePiece(null);
            } else {
                setEquipment(prev => ({...prev, hairstyleId: item.id, hairstyleColor: item.colors?.[0]?.imageUrl || null}));
            }
        }
    };
    
    const handleSliderChange = (type: 'x' | 'y' | 'scale', value: number) => {
        if (!activePiece || !equipment.bodyId) return;
        
        const bodyId = equipment.bodyId;

        if ('slot' in activePiece) { // It's an ArmorPiece
            const isPrimary = editingLayer === 'primary';
            const stateSetter = isPrimary ? setLocalTransforms : setLocalTransforms2;
            const currentTransforms = isPrimary ? localTransforms : localTransforms2;
            const defaultTransforms = isPrimary ? activePiece.transforms : activePiece.transforms2;

            stateSetter(prev => {
                const currentPieceTransforms = prev[activePiece.id] || {};
                const currentBodyTransform = currentPieceTransforms[bodyId] || defaultTransforms?.[bodyId] || {x:50, y:50, scale:40};
                return {
                    ...prev,
                    [activePiece.id]: {
                        ...currentPieceTransforms,
                        [bodyId]: {
                            ...currentBodyTransform,
                            [type]: value
                        }
                    }
                }
            });

        } else { // It's a Hairstyle
             setLocalHairstyleTransforms(prev => {
                const currentBodyTransform = prev[bodyId] || activePiece.transforms?.[bodyId] || {x:50, y:50, scale:100};
                return {
                 ...prev,
                 [bodyId]: {
                     ...currentBodyTransform,
                     [type]: value,
                 }
             }});
        }
    };
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, piece: ArmorPiece | Hairstyle, layer: 'primary' | 'secondary') => {
        if (isPreviewMode) setIsPreviewMode(false);
        e.preventDefault();
        e.stopPropagation();
        
        setActivePiece(piece);
        setEditingLayer(layer);
        setIsDragging(true);
    };


    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !canvasRef.current || !activePiece || isPreviewMode) return;
        e.preventDefault();
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const newX = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
        const newY = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;
        
        handleSliderChange('x', newX);
        handleSliderChange('y', newY);
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleSave = async () => {
        if (!user || !teacherUid) return;
        setIsSaving(true);
        try {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
            await updateDoc(studentRef, {
                equippedBodyId: equipment.bodyId,
                equippedHairstyleId: equipment.hairstyleId,
                equippedHairstyleColor: equipment.hairstyleColor,
                equippedHairstyleTransforms: localHairstyleTransforms,
                backgroundUrl: equipment.backgroundUrl,
                equippedHeadId: equipment.headId,
                equippedShouldersId: equipment.shouldersId,
                equippedChestId: equipment.chestId,
                equippedHandsId: equipment.handsId,
                equippedLegsId: equipment.legsId,
                equippedFeetId: equipment.feetId,
                armorTransforms: localTransforms,
                armorTransforms2: localTransforms2,
            });
            setIsPreviewMode(true);
            toast({ title: "Appearance Saved!", description: "Your hero's new look has been saved." });
        } catch (error) {
            console.error("Error saving appearance:", error);
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not save your new look." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnequipAll = () => {
        setEquipment(prev => ({
            ...prev,
            hairstyleId: null, hairstyleColor: null,
            headId: null, shouldersId: null, chestId: null, handsId: null, legsId: null, feetId: null,
        }));
        setActivePiece(null);
        toast({ title: "Appearance Cleared", description: "All armor and hairstyle have been removed."});
    };

    const handleBodyCycle = (direction: 'next' | 'prev') => {
        if (baseBodyUrls.length === 0 || !equipment.bodyId) return;
        const currentIndex = baseBodyUrls.findIndex(b => b.id === equipment.bodyId);
        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % baseBodyUrls.length;
        } else {
            nextIndex = (currentIndex - 1 + baseBodyUrls.length) % baseBodyUrls.length;
        }
        setEquipment(prev => ({...prev, bodyId: baseBodyUrls[nextIndex].id}));
    };

    const handleSetCustomAvatar = async () => {
        setIsConfirmingAvatar(true);
    };

    const proceedWithAvatarSet = async () => {
         if (!canvasRef.current || !teacherUid || !user) return;
        setIsSettingAvatar(true);
    
        const captureElement = canvasRef.current;
    
        try {
            const dataUrl = await htmlToImage.toPng(captureElement, { 
                pixelRatio: 2, // Increase resolution
                skipAutoScale: true,
                style: {
                    transform: 'scale(1)',
                    webkitTransform: 'scale(1)',
                }
            });
    
            const storage = getStorage(app);
            const imagePath = `custom-avatars/${teacherUid}/${user.uid}/${uuidv4()}.png`;
            const storageRef = ref(storage, imagePath);
    
            const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
            const downloadUrl = await getDownloadURL(snapshot.ref);
    
            const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
            await updateDoc(studentRef, {
                avatarUrl: downloadUrl,
                useCustomAvatar: true,
            });
            
            setStudent(prev => prev ? {...prev, avatarUrl: downloadUrl, useCustomAvatar: true} : null);
            setIsAvatarSetDialogOpen(true);
    
        } catch (error: any) {
            console.error("Error setting custom avatar:", error);
            toast({ variant: 'destructive', title: 'Failed to Set Avatar', description: 'Could not capture or upload the avatar image.' });
        } finally {
            setIsSettingAvatar(false);
            setIsConfirmingAvatar(false);
        }
    }


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
    
    const activeTransform = useMemo(() => {
        if (!activePiece || !equipment.bodyId) return null;
        if ('slot' in activePiece) { // Armor
            const armorTransforms = editingLayer === 'primary' ? localTransforms : localTransforms2;
            const defaultTransforms = editingLayer === 'primary' ? activePiece.transforms : activePiece.transforms2;
            const customTransform = armorTransforms?.[activePiece.id]?.[equipment.bodyId];
            const firstAvailableDefaultTransform = defaultTransforms ? Object.values(defaultTransforms)[0] : null;
            const defaultTransform = defaultTransforms?.[equipment.bodyId] || firstAvailableDefaultTransform || { x: 50, y: 50, scale: 40 };
            return customTransform || defaultTransform;
        } else { // Hairstyle
            return localHairstyleTransforms?.[equipment.bodyId] || activePiece.transforms?.[equipment.bodyId] || { x: 50, y: 50, scale: 100 };
        }
    }, [activePiece, equipment.bodyId, localTransforms, localTransforms2, localHairstyleTransforms, editingLayer]);
    
    if (isLoading || !student) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin"/></div>
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
             <AlertDialog open={isAvatarSetDialogOpen} onOpenChange={setIsAvatarSetDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Avatar Set!</AlertDialogTitle>
                        <AlertDialogDescription>
                           Your custom look is now your main avatar! It may take several seconds for your new custom avatar image to load!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => { router.push('/dashboard') }}>
                            Return to Dashboard
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isConfirmingAvatar} onOpenChange={setIsConfirmingAvatar}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Did You Save Your Appearance?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Make sure you have saved your current look before setting it as your avatar. Unsaved changes will not be captured.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsConfirmingAvatar(false)}>No, Go Back</AlertDialogCancel>
                        <AlertDialogAction onClick={proceedWithAvatarSet} disabled={isSettingAvatar}>
                            {isSettingAvatar ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Yes, Set Avatar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
                             <Button onClick={handleSave} disabled={isSaving || isSettingAvatar}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                Save Appearance
                             </Button>
                        </div>
                    </div>

                    <Alert>
                        <Hammer className="h-4 w-4" />
                        <AlertTitle>The Forge is Under Construction!</AlertTitle>
                        <AlertDescription>
                            More armor and hairstyles are being crafted and will be added soon. Keep checking back for new ways to customize your hero!
                        </AlertDescription>
                    </Alert>

                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-3 flex flex-col gap-6">
                            <Card className="h-auto flex flex-col">
                                <CardHeader>
                                    <CardTitle>The Forge</CardTitle>
                                    <CardDescription>Select your equipment.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow overflow-hidden">
                                    <Tabs defaultValue="body" className="w-full h-full flex flex-col">
                                        <TabsList className="grid w-full grid-cols-4">
                                            <TabsTrigger value="body">Body</TabsTrigger>
                                            <TabsTrigger value="hair">Hair</TabsTrigger>
                                            <TabsTrigger value="hair-color" disabled={!equipment.hairstyleId}>Color</TabsTrigger>
                                            <TabsTrigger value="armor">Armor</TabsTrigger>
                                        </TabsList>
                                        <ScrollArea className="flex-grow mt-4 max-h-[65vh]">
                                            <TabsContent value="body" className="p-1">
                                                <div className="grid grid-cols-3 gap-2">
                                                    {baseBodyUrls.map(item => (
                                                        <Card 
                                                            key={item.id} 
                                                            className={cn( "cursor-pointer hover:border-primary", equipment.bodyId === item.id && "border-2 border-primary" )}
                                                            onClick={() => setEquipment(prev => ({ ...prev, bodyId: item.id }))} >
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
                                                            className={cn( "cursor-pointer hover:border-primary", equipment.hairstyleId === item.id && "border-2 border-primary" )}
                                                            onClick={() => handleEquipItem(item)}
                                                        >
                                                            <CardContent className="p-1 aspect-square">
                                                                <Image src={item.baseImageUrl} alt={item.styleName} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </TabsContent>
                                            <TabsContent value="hair-color" className="p-1">
                                                {hairstyles.find(h => h.id === equipment.hairstyleId) && (
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {hairstyles.find(h => h.id === equipment.hairstyleId)!.colors.map((color, index) => (
                                                            <div 
                                                                key={index} 
                                                                className={cn("h-16 w-16 rounded-md border-2 cursor-pointer", equipment.hairstyleColor === color.imageUrl ? "border-primary ring-2 ring-primary" : "border-transparent")}
                                                                onClick={() => setEquipment(prev => ({...prev, hairstyleColor: color.imageUrl}))} >
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
                                                                    const slotKey = `${item.slot}Id` as keyof typeof equipment;
                                                                    const isEquipped = equipment[slotKey] === item.id;
                                                                    return (
                                                                        <Card 
                                                                            key={item.id} 
                                                                            className={cn("cursor-pointer hover:border-primary", isEquipped && "border-2 border-primary")}
                                                                            onClick={() => handleEquipItem(item)} >
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
                            <Card>
                                <CardHeader><CardTitle>Backgrounds</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Avatar%20Backgrounds%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2005_35_11%20AM.png?alt=media&token=8a2dfda2-01b8-404d-a399-46289bd84759',
                                            'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Avatar%20Backgrounds%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2005_36_06%20AM.png?alt=media&token=4fd59bf0-be44-4430-8c37-faf50966727e',
                                            'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Avatar%20Backgrounds%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2005_37_19%20AM.png?alt=media&token=eb2b1216-589d-4255-b895-34b916b1430c',
                                            'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Avatar%20Backgrounds%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2005_38_56%20AM.png?alt=media&token=7e424757-f1cb-42a2-8496-93339ff16de4',
                                            'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Avatar%20Backgrounds%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2005_41_06%20AM.png?alt=media&token=91ad076b-39f3-4284-8320-e6d79aabcc3f',
                                            'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Avatar%20Backgrounds%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2005_44_32%20AM.png?alt=media&token=d5326450-62b5-48ad-a4b4-bd9a68964cd0',
                                            'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Avatar%20Backgrounds%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2005_46_44%20AM.png?alt=media&token=512c4aa1-144a-49cd-a6cc-884ce163ebde',
                                            'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Avatar%20Backgrounds%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2005_50_59%20AM.png?alt=media&token=45e11f7c-40de-4da9-9c17-ebce834beee7',
                                            'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Avatar%20Backgrounds%2FChatGPT%20Image%20Sep%205%2C%202025%2C%2006_03_10%20AM.png?alt=media&token=bb987156-6f34-489e-8d2c-a5b6349cd808',
                                        ].map((url, i) => (
                                            <div 
                                                key={i} 
                                                className={cn(
                                                    "border-2 p-1 rounded-md cursor-pointer hover:border-primary",
                                                    equipment.backgroundUrl === url && "border-primary ring-2 ring-primary"
                                                )}
                                                onClick={() => setEquipment(prev => ({...prev, backgroundUrl: url}))}
                                            >
                                                <Image src={url} alt={`Background ${i+1}`} width={100} height={100} className="w-full h-auto object-cover bg-gray-200 rounded-sm" data-ai-hint="fantasy background" />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="lg:col-span-9 relative" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                           <div
                                ref={canvasRef}
                                className="relative w-full aspect-square bg-gray-700 rounded-lg p-2"
                            >
                                <CharacterCanvas 
                                    student={student}
                                    baseBody={baseBodyUrls.find(b => b.id === equipment.bodyId) || null}
                                    equipment={equipment}
                                    allHairstyles={hairstyles}
                                    allArmor={allArmor}
                                    onMouseDown={handleMouseDown}
                                    activePieceId={activePiece?.id || null}
                                    editingLayer={editingLayer}
                                    isPreviewMode={isPreviewMode}
                                    localHairstyleTransforms={localHairstyleTransforms}
                                    localArmorTransforms={localTransforms}
                                    localArmorTransforms2={localTransforms2}
                                />
                                <div className="absolute top-0 right-0 h-full p-2 z-20">
                                    <Collapsible
                                        open={isControlsOpen}
                                        onOpenChange={setIsControlsOpen}
                                        className="relative h-full"
                                    >
                                        <CollapsibleTrigger asChild>
                                            <Button variant="secondary" size="icon" className="absolute top-0 -left-12">
                                                {isControlsOpen ? <ChevronsRight /> : <ChevronsLeft />}
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent asChild>
                                            <Card className="w-64 h-full bg-background/80 backdrop-blur-sm flex flex-col">
                                                <CardHeader>
                                                    <CardTitle>Controls</CardTitle>
                                                    <div className="flex items-center space-x-2 pt-2">
                                                        <Label htmlFor="preview-mode" className="flex items-center gap-1 cursor-pointer"><Eye className="h-4 w-4"/> Preview</Label>
                                                        <Switch id="preview-mode" checked={isPreviewMode} onCheckedChange={setIsPreviewMode} />
                                                    </div>
                                                </CardHeader>
                                                <ScrollArea className="flex-grow">
                                                    <CardContent className="space-y-4">
                                                        {activePiece ? (
                                                            <div className="space-y-4">
                                                                <p className="font-bold text-center">Editing: <span className="text-primary">{'styleName' in activePiece ? activePiece.styleName : activePiece.name}</span></p>
                                                                {'slot' in activePiece && activePiece.modularImageUrl2 && (
                                                                    <div className="space-y-2 p-2 border rounded-md">
                                                                        <Label className="flex items-center gap-2"><Layers/> Editing Layer</Label>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <Button variant={editingLayer === 'primary' ? 'default' : 'outline'} onClick={() => setEditingLayer('primary')} disabled={isPreviewMode}>Primary</Button>
                                                                            <Button variant={editingLayer === 'secondary' ? 'default' : 'outline'} onClick={() => setEditingLayer('secondary')} disabled={isPreviewMode}>Secondary</Button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {activeTransform && (
                                                                    <div className="space-y-4 animate-in fade-in-50">
                                                                        <div className="space-y-2">
                                                                            <Label htmlFor="x-pos">X Position: {activeTransform.x.toFixed(2)}%</Label>
                                                                            <Slider id="x-pos" value={[activeTransform.x]} onValueChange={([val]) => handleSliderChange('x', val)} min={0} max={100} step={0.1} disabled={isPreviewMode}/>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label htmlFor="y-pos">Y Position: {activeTransform.y.toFixed(2)}%</Label>
                                                                            <Slider id="y-pos" value={[activeTransform.y]} onValueChange={([val]) => handleSliderChange('y', val)} min={0} max={100} step={0.1} disabled={isPreviewMode}/>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label htmlFor="scale">Scale: {activeTransform.scale}%</Label>
                                                                            <Slider id="scale" value={[activeTransform.scale]} onValueChange={([val]) => handleSliderChange('scale', val)} min={10} max={200} step={0.5} disabled={isPreviewMode}/>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground text-center">Click a piece on the canvas to select it.</p>
                                                        )}
                                                    </CardContent>
                                                </ScrollArea>
                                                 <CardFooter className="flex-col gap-2 items-stretch p-2">
                                                    <Button variant="outline" size="sm" onClick={handleUnequipAll}>Unequip All</Button>
                                                    <Button onClick={handleSetCustomAvatar} disabled={isSettingAvatar}>
                                                        {isSettingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Camera className="mr-2 h-4 w-4" />}
                                                        Set as Custom Avatar
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                           </div>
                             <div className="flex justify-between items-center w-full max-w-sm mt-2 mx-auto">
                                <Button variant="outline" onClick={() => handleBodyCycle('prev')}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <span className="font-semibold">{baseBodyUrls.find(b => b.id === equipment.bodyId)?.name || 'Body Type'}</span>
                                <Button variant="outline" onClick={() => handleBodyCycle('next')}>
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                     </div>
                 </div>
            </main>
        </div>
    );
}
