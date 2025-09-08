
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc, getDocs, documentId, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { type ArmorPiece, type Hairstyle, type BaseBody, type ArmorSlot } from '@/lib/forge';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Hammer, Layers, Eye, Camera, X, Shirt, ArrowRight, ChevronsRight, ChevronsLeft, ShirtIcon, UserCheck, ChevronDown, Wand2, Scaling, Orbit } from 'lucide-react';
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
import { avatarData } from '@/lib/avatars';
import { CharacterViewerFallback } from '@/components/dashboard/character-viewer-3d';

const CharacterViewer3D = lazy(() => import('@/components/dashboard/character-viewer-3d').then(module => ({ default: module.CharacterViewer3D })));
const CharacterCanvas = lazy(() => import('@/components/dashboard/character-canvas').then(module => ({ default: module.CharacterCanvas })));

export default function ForgePage() {
    const router = useRouter();
    const { toast } = useToast();

    // Data State
    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [allHairstyles, setAllHairstyles] = useState<Hairstyle[]>([]);
    const [allArmor, setAllArmor] = useState<ArmorPiece[]>([]);
    const [allBodies, setAllBodies] = useState<BaseBody[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingAvatar, setIsSettingAvatar] = useState(false);

    // Dialog State
    const [isArmoryOpen, setIsArmoryOpen] = useState(false);
    const [isAvatarSetDialogOpen, setIsAvatarSetDialogOpen] = useState(false);

    // Equipment State
    const [equipment, setEquipment] = useState({
        bodyId: null as string | null,
        hairstyleId: null as string | null,
        hairstyleColor: null as string | null,
        backgroundUrl: null as string | null,
        headId: null as string | null,
        shouldersId: null as string | null,
        chestId: null as string | null,
        handsId: null as string | null,
        legsId: null as string | null,
        feetId: null as string | null,
    });
    
    const [selectedStaticAvatarUrl, setSelectedStaticAvatarUrl] = useState<string | null>(null);

    // Sizer state
    const [activePiece, setActivePiece] = useState<ArmorPiece | Hairstyle | null>(null);
    const [localHairstyleTransforms, setLocalHairstyleTransforms] = useState<Student['equippedHairstyleTransforms']>({});
    const [localArmorTransforms, setLocalArmorTransforms] = useState<Student['armorTransforms']>({});
    const [localArmorTransforms2, setLocalArmorTransforms2] = useState<Student['armorTransforms2']>({});
    const [local3DArmorTransforms, setLocal3DArmorTransforms] = useState<Student['equippedArmorTransforms']>({});
    const [local3DHairstyleTransforms, setLocal3DHairstyleTransforms] = useState<Student['equippedHairstyle3DTransforms']>({});


    const [editingLayer, setEditingLayer] = useState<'primary' | 'secondary'>('primary');
    const [isDragging, setIsDragging] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    
    // Collapsible Controls State
    const [isControlsOpen, setIsControlsOpen] = useState(true);

    const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
    const [isOrbitControlsEnabled, setIsOrbitControlsEnabled] = useState(true);


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
    
    const fetchAllArmor = useCallback(async () => {
        if (!teacherUid) return;
        try {
            const armorQuery = query(collection(db, 'armorPieces'), where('isPublished', '==', true));
            const armorSnap = await getDocs(armorQuery);
            const armorData = armorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece));
            setAllArmor(armorData);
        } catch (e) {
            console.error("Error fetching all armor:", e);
            toast({ variant: 'destructive', title: "Error", description: "Could not load armory items." });
        }
    }, [teacherUid, toast]);


    useEffect(() => {
        if (!user || !teacherUid) return;

        fetchAllArmor();

        let unsubs: (()=>void)[] = [];
        const unsubStudent = onSnapshot(doc(db, 'teachers', teacherUid, 'students', user.uid), (doc) => {
            if (doc.exists()) {
                const studentData = { uid: doc.id, ...doc.data() } as Student;
                setStudent(studentData);
                // Initialize local transforms from student data
                setLocalHairstyleTransforms(studentData.equippedHairstyleTransforms || {});
                setLocalArmorTransforms(studentData.armorTransforms || {});
                setLocalArmorTransforms2(studentData.armorTransforms2 || {});
                setLocal3DArmorTransforms(studentData.equippedArmorTransforms || {});
                setLocal3DHairstyleTransforms(studentData.equippedHairstyle3DTransforms || {});

                // Set equipment based on saved data
                setEquipment({
                    bodyId: studentData.equippedBodyId || null,
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
                
                // Determine if the last saved avatar was static or custom
                if (studentData.avatarUrl && !studentData.useCustomAvatar) {
                    setSelectedStaticAvatarUrl(studentData.avatarUrl);
                } else {
                    setSelectedStaticAvatarUrl(null);
                }
            }
        });
        unsubs.push(unsubStudent);
        
        const fetchHairstylesAndBodies = async () => {
             try {
                const hairQuery = query(collection(db, 'hairstyles'), where('isPublished', '==', true));
                unsubs.push(onSnapshot(hairQuery, (snapshot) => {
                    setAllHairstyles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle)));
                }));
                const bodiesQuery = query(collection(db, 'baseBodies'), orderBy('order'));
                 unsubs.push(onSnapshot(bodiesQuery, (snapshot) => {
                    setAllBodies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseBody)));
                }));

             } catch (e) {
                console.error("Error fetching assets:", e);
                toast({ variant: 'destructive', title: "Error", description: "Could not load hairstyles or bodies." });
             } finally {
                setIsLoading(false);
             }
        }
        
        fetchHairstylesAndBodies();

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, teacherUid, toast, fetchAllArmor]);

    const ownedArmor = useMemo(() => {
        if (student?.ownedArmorIds && allArmor.length > 0) {
            return allArmor.filter(armor => student.ownedArmorIds?.includes(armor.id));
        }
        return [];
    }, [student?.ownedArmorIds, allArmor]);


    const handleBodySelect = (bodyId: string) => {
        if (!student) return;
        setEquipment(prev => ({ ...prev, bodyId }));
        setSelectedStaticAvatarUrl(null);
    };
    
    const handleEquipItem = (item: ArmorPiece | Hairstyle) => {
        setSelectedStaticAvatarUrl(null); // Clear static selection when customizing
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
    
    const hairstyle = useMemo(() => allHairstyles.find(h => h.id === equipment.hairstyleId), [allHairstyles, equipment.hairstyleId]);

    const handleSliderChange = (type: 'x' | 'y' | 'slider', value: number) => {
        if (!activePiece || !equipment.bodyId) return;

        const bodyId = equipment.bodyId;

        const getBaseScale = () => {
            if ('slot' in activePiece) {
                const defaultTransforms = editingLayer === 'primary' ? activePiece.transforms : activePiece.transforms2;
                return defaultTransforms?.[bodyId]?.scale || (Object.values(defaultTransforms || {})[0]?.scale || 40);
            } else {
                 return hairstyle?.transforms?.[bodyId]?.scale || (Object.values(hairstyle?.transforms || {})[0]?.scale || 100);
            }
        };

        const baseScale = getBaseScale();
        const newScale = baseScale * (0.5 + (value / 100));

        const updateTransform = (prev: any) => {
            const currentPieceTransforms = prev[activePiece.id] || {};
            const baseTransform = currentPieceTransforms[bodyId] || (editingLayer === 'primary' 
                ? (activePiece.transforms?.[bodyId] || {x:50, y:50, scale: baseScale})
                : (activePiece.transforms2?.[bodyId] || {x:50, y:50, scale: baseScale})
            );
            const newTransform = { ...baseTransform };

            switch(type) {
                case 'x': newTransform.x = value; break;
                case 'y': newTransform.y = value; break;
                case 'slider': newTransform.scale = newScale; break;
            }
            return {
                ...prev,
                [activePiece.id]: {
                    ...currentPieceTransforms,
                    [bodyId]: newTransform,
                },
            };
        };

        const updateHairTransform = (prev: any) => {
             const baseTransform = prev[bodyId] || activePiece.transforms?.[bodyId] || {x:50, y:50, scale: baseScale};
             const newTransform = { ...baseTransform };
              switch(type) {
                case 'x': newTransform.x = value; break;
                case 'y': newTransform.y = value; break;
                case 'slider': newTransform.scale = newScale; break
              }
            return { ...prev, [bodyId]: newTransform };
        };

        if ('slot' in activePiece) { // ArmorPiece
            (editingLayer === 'primary' ? setLocalArmorTransforms : setLocalArmorTransforms2)(updateTransform);
        } else { // Hairstyle
            setLocalHairstyleTransforms(updateHairTransform);
        }
    };
    
    const handlePieceClick = (piece: ArmorPiece | Hairstyle | null) => {
        if (isPreviewMode) return;
        if (!piece) {
            setActivePiece(null);
            return;
        }
        
        setActivePiece(current => current?.id === piece.id ? null : piece);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, piece: ArmorPiece | Hairstyle, layer: 'primary' | 'secondary') => {
        if (isPreviewMode || activePiece?.id !== piece.id) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        setEditingLayer(layer);
        setIsDragging(true);
    };


    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !e.currentTarget || !activePiece || isPreviewMode) return;
        e.preventDefault();
        const canvasRect = e.currentTarget.getBoundingClientRect();
        const newX = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
        const newY = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;
        
        handleSliderChange('x', newX);
        handleSliderChange('y', newY);
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleUnequipAll = () => {
        setEquipment(prev => ({
            ...prev,
            bodyId: null, // Clear the body as well
            hairstyleId: null, hairstyleColor: null,
            backgroundUrl: null,
            headId: null, shouldersId: null, chestId: null, handsId: null, legsId: null, feetId: null,
        }));
        setSelectedStaticAvatarUrl(null);
        setActivePiece(null);
        toast({ title: "Appearance Cleared", description: "All armor and hairstyle have been removed."});
    };

    const handleBodyCycle = (direction: 'next' | 'prev') => {
        if (allBodies.length === 0) return;
        const selectableBodies = allBodies;
        if (selectableBodies.length === 0) return;
        
        const currentIndex = equipment.bodyId ? selectableBodies.findIndex(b => b.id === equipment.bodyId) : -1;
        let nextIndex;

        if(currentIndex === -1) {
            nextIndex = 0; // Start from the first one if none is selected
        } else if (direction === 'next') {
            nextIndex = (currentIndex + 1) % selectableBodies.length;
        } else {
            nextIndex = (currentIndex - 1 + selectableBodies.length) % selectableBodies.length;
        }
        handleBodySelect(selectableBodies[nextIndex].id);
    };

    const handleSetAvatar = async () => {
        if (!teacherUid || !user) return;
        setIsSettingAvatar(true);

        try {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
            let updates: Partial<Student> = {};

            if (selectedStaticAvatarUrl) {
                // If a static avatar is selected, save its URL and clear custom fields
                updates = {
                    avatarUrl: selectedStaticAvatarUrl,
                    backgroundUrl: equipment.backgroundUrl || '', // Keep background
                    useCustomAvatar: false, // Explicitly set to false
                    equippedBodyId: '',
                    equippedHairstyleId: '',
                    equippedHairstyleColor: '',
                    equippedHairstyleTransforms: {},
                    equippedHairstyle3DTransforms: {},
                    equippedHeadId: '',
                    equippedShouldersId: '',
                    equippedChestId: '',
                    equippedHandsId: '',
                    equippedLegsId: '',
                    equippedFeetId: '',
                    armorTransforms: {},
                    armorTransforms2: {},
                    equippedArmorTransforms: {},
                };
            } else {
                 // If a custom character is built, save the recipe and clear the static URL
                 updates = {
                    avatarUrl: '', 
                    useCustomAvatar: true, // Explicitly set to true
                    equippedBodyId: equipment.bodyId,
                    equippedHairstyleId: equipment.hairstyleId,
                    equippedHairstyleColor: equipment.hairstyleColor,
                    equippedHairstyleTransforms: localHairstyleTransforms,
                    equippedHairstyle3DTransforms: local3DHairstyleTransforms,
                    backgroundUrl: equipment.backgroundUrl,
                    equippedHeadId: equipment.headId,
                    equippedShouldersId: equipment.shouldersId,
                    equippedChestId: equipment.chestId,
                    equippedHandsId: equipment.handsId,
                    equippedLegsId: equipment.legsId,
                    equippedFeetId: equipment.feetId,
                    armorTransforms: localArmorTransforms,
                    armorTransforms2: localArmorTransforms2,
                    equippedArmorTransforms: local3DArmorTransforms,
                };
            }
            
            await updateDoc(studentRef, updates);
            setIsAvatarSetDialogOpen(true);

        } catch (error) {
            console.error("Error setting avatar:", error);
            toast({ variant: 'destructive', title: 'Failed to Set Avatar', description: 'Could not update your avatar preference.' });
        } finally {
            setIsSettingAvatar(false);
        }
    };
    
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
            const armorTransforms = editingLayer === 'primary' ? localArmorTransforms : localArmorTransforms2;
            const defaultTransforms = editingLayer === 'primary' ? activePiece.transforms : activePiece.transforms2;
            const customTransform = armorTransforms?.[activePiece.id]?.[equipment.bodyId];
            const defaultTransform = defaultTransforms?.[equipment.bodyId] || { x: 50, y: 50, scale: 40 };
            return customTransform || defaultTransform;
        } else { // Hairstyle
            return localHairstyleTransforms?.[equipment.bodyId] || hairstyle?.transforms?.[equipment.bodyId] || { x: 50, y: 50, scale: 100 };
        }
    }, [activePiece, equipment.bodyId, localArmorTransforms, localArmorTransforms2, localHairstyleTransforms, editingLayer, hairstyle]);

    const activeScaleForSlider = useMemo(() => {
        if (!activeTransform || !activePiece || !equipment.bodyId) return 50;

        const getBaseScale = () => {
            if ('slot' in activePiece) { // Armor
                const defaultTransforms = editingLayer === 'primary' ? activePiece.transforms : activePiece.transforms2;
                return defaultTransforms?.[equipment.bodyId as string]?.scale || Object.values(defaultTransforms || {})[0]?.scale || 40;
            } else { // Hairstyle
                return hairstyle?.transforms?.[equipment.bodyId as string]?.scale || Object.values(hairstyle?.transforms || {})[0]?.scale || 100;
            }
        };

        const baseScale = getBaseScale();
        return ((activeTransform.scale - (baseScale * 0.5)) / baseScale) * 100;

    }, [activeTransform, activePiece, equipment.bodyId, editingLayer, hairstyle]);
    
    const active3DScale = useMemo(() => {
        if (!activePiece || viewMode !== '3d') return 1;
        if ('slot' in activePiece) { // Armor
            return local3DArmorTransforms?.[activePiece.id]?.scale ?? 1;
        } else { // Hairstyle
            return local3DHairstyleTransforms?.scale ?? 1;
        }
    }, [activePiece, viewMode, local3DArmorTransforms, local3DHairstyleTransforms]);

    const handle3DScaleChange = (value: number) => {
        if (!activePiece) return;
        if ('slot' in activePiece) { // Armor
            setLocal3DArmorTransforms(prev => ({
                ...prev,
                [activePiece.id]: { ...(prev[activePiece.id] || { position: [0,0,0] }), scale: value }
            }));
        } else { // Hairstyle
            setLocal3DHairstyleTransforms(prev => ({
                ...(prev || { position: [0,0,0], scale: 1 }),
                scale: value
            }));
        }
    };

    const handle3DTransformUpdate = (pieceId: string, position: [number, number, number]) => {
         if (pieceId === hairstyle?.id) {
            setLocal3DHairstyleTransforms(prev => ({
                ...(prev || { scale: 1 }),
                position
            }));
        } else {
            setLocal3DArmorTransforms(prev => ({
                ...prev,
                [pieceId]: { ...(prev[pieceId] || { scale: 1 }), position }
            }));
        }
    }


    const handleStaticAvatarClick = (url: string) => {
        setSelectedStaticAvatarUrl(url);
        // Unequip all items when a static avatar is chosen
        setEquipment(prev => ({
            ...prev,
            bodyId: null,
            hairstyleId: null, hairstyleColor: null,
            headId: null, shouldersId: null, chestId: null, handsId: null, legsId: null, feetId: null,
        }));
    };

    const renderStaticAvatarGroups = () => {
        if (!student) return null;

        const { class: studentClass, level = 1 } = student;
        const classAvatars = avatarData[studentClass];
        if (!classAvatars) return <p>No avatars available for your class.</p>;

        const unlockedLevels = Object.keys(classAvatars)
            .map(Number)
            .filter(l => l <= level)
            .sort((a,b) => a-b);
        
        return unlockedLevels.map(lvl => (
             <Collapsible key={lvl} className="w-full border-b">
                <CollapsibleTrigger className="flex justify-between items-center w-full p-4 hover:bg-muted/50">
                    <h3 className="text-2xl font-bold font-headline">Level {lvl} Avatars</h3>
                    <ChevronDown className="h-6 w-6 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-4 p-4">
                        {classAvatars[lvl].map((url: string, index: number) => {
                            const isCurrentlySelected = selectedStaticAvatarUrl === url;
                            return (
                                <div 
                                    key={`${lvl}-${index}`} 
                                    className={cn(
                                        "relative border-4 rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 aspect-[3/4]",
                                        isCurrentlySelected ? 'border-primary ring-4 ring-primary/50' : 'border-transparent hover:border-primary/50'
                                    )}
                                    onClick={() => handleStaticAvatarClick(url)}
                                >
                                    <Image src={url} alt={`Avatar level ${lvl} - ${index + 1}`} fill className="w-full h-full rounded-md object-cover" />
                                     {isCurrentlySelected && (
                                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                                            <UserCheck className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        ));
    };
    
    const bodyModelUrl = equipment.bodyId ? allBodies.find(b => b.id === equipment.bodyId)?.modelUrl : null;
    const hairModelUrl = equipment.hairstyleId ? allHairstyles.find(h => h.id === equipment.hairstyleId)?.modelUrl : null;
    
    const armorPiecesWithModels = useMemo(() => {
        const equippedIds = [equipment.headId, equipment.shouldersId, equipment.chestId, equipment.handsId, equipment.legsId, equipment.feetId];
        return allArmor
            .filter(a => equippedIds.includes(a.id) && a.modelUrl)
            .map(a => ({ id: a.id, url: a.modelUrl! }));
    }, [allArmor, equipment]);
    
    const is3dViewAvailable = !!bodyModelUrl;

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
                           Your new look is now your main avatar!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => { router.push('/dashboard') }}>
                            Return to Dashboard
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
                             <Button variant="secondary" onClick={handleUnequipAll}><ShirtIcon className="mr-2 h-4 w-4" />Unequip All</Button>
                            <Button variant="default" onClick={handleSetAvatar} disabled={isSettingAvatar || (!selectedStaticAvatarUrl && !equipment.bodyId)}>
                                {isSettingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Camera className="mr-2 h-4 w-4" />}
                                Set as Custom Avatar
                            </Button>
                        </div>
                    </div>

                    <Alert>
                        <Wand2 className="h-4 w-4" />
                        <AlertTitle>Welcome to The Forge!</AlertTitle>
                        <AlertDescription>
                           Here you can mix and match your owned armor pieces, hairstyles, and backgrounds. Or, choose from a pre-made avatar below. When you're happy with your look, click "Set as Custom Avatar".
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
                                                {allBodies && allBodies.length > 0 ? (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {allBodies.map(item => (
                                                            <Card 
                                                                key={item.id} 
                                                                className={cn( "cursor-pointer hover:border-primary", equipment.bodyId === item.id && "border-2 border-primary" )}
                                                                onClick={() => handleBodySelect(item.id)} >
                                                                <CardContent className="p-1 aspect-square">
                                                                    <Image src={item.thumbnailUrl || item.imageUrl} alt={item.name} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-muted-foreground text-sm col-span-3 text-center py-2">No base bodies found.</p>}
                                            </TabsContent>
                                            <TabsContent value="hair" className="p-1">
                                                <div className="grid grid-cols-3 gap-2">
                                                    {allHairstyles.map(item => (
                                                        <Card 
                                                            key={item.id} 
                                                            className={cn( "cursor-pointer hover:border-primary", equipment.hairstyleId === item.id && "border-2 border-primary" )}
                                                            onClick={() => handleEquipItem(item)}
                                                        >
                                                            <CardContent className="p-1 aspect-square">
                                                                <Image src={item.thumbnailUrl || item.baseImageUrl} alt={item.styleName} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </TabsContent>
                                            <TabsContent value="hair-color" className="p-1">
                                                {allHairstyles.find(h => h.id === equipment.hairstyleId) && (
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {allHairstyles.find(h => h.id === equipment.hairstyleId)!.colors.map((color, index) => (
                                                            <div 
                                                                key={index} 
                                                                className={cn("h-16 w-16 rounded-md border-2 cursor-pointer", equipment.hairstyleColor === color.imageUrl ? "border-primary ring-2 ring-primary" : "border-transparent")}
                                                                onClick={() => setEquipment(prev => ({...prev, hairstyleColor: color.imageUrl}))} >
                                                                <Image src={color.thumbnailUrl || color.imageUrl} alt={`Color ${index+1}`} width={64} height={64} className="w-full h-full object-contain rounded-sm bg-secondary" />
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
                                                                                <Image src={item.thumbnailUrl || item.imageUrl} alt={item.name} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
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
                        </div>
                        
                        <div className="lg:col-span-9 relative" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                            <div className="absolute top-2 left-2 z-20 bg-background/80 p-1 rounded-md">
                               <Tabs defaultValue="2d" value={viewMode} onValueChange={(value) => setViewMode(value as '2d' | '3d')} className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="2d">2D View</TabsTrigger>
                                        <TabsTrigger value="3d" disabled={!is3dViewAvailable}>3D View</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                           <div
                                className="relative w-full aspect-square bg-gray-700 rounded-lg p-2"
                                onMouseMove={handleMouseMove}
                            >
                                {viewMode === '2d' && allBodies && allBodies.length > 0 ? (
                                    <Suspense fallback={<CharacterViewerFallback />}>
                                         <CharacterCanvas
                                            student={student}
                                            allBodies={allBodies}
                                            equipment={equipment}
                                            allHairstyles={allHairstyles}
                                            allArmor={ownedArmor}
                                            onMouseDown={handleMouseDown}
                                            activePieceId={activePiece?.id || null}
                                            editingLayer={editingLayer}
                                            isPreviewMode={isPreviewMode}
                                            localHairstyleTransforms={localHairstyleTransforms}
                                            localArmorTransforms={localArmorTransforms}
                                            localArmorTransforms2={localArmorTransforms2}
                                            selectedStaticAvatarUrl={selectedStaticAvatarUrl}
                                        />
                                    </Suspense>
                                ) : viewMode === '3d' && is3dViewAvailable ? (
                                    <Suspense fallback={<CharacterViewerFallback />}>
                                        <CharacterViewer3D 
                                            bodyUrl={bodyModelUrl}
                                            armorPieces={armorPiecesWithModels}
                                            hairUrl={hairModelUrl}
                                            hairId={hairstyle?.id || null}
                                            onTransformUpdate={handle3DTransformUpdate}
                                            armorTransforms={local3DArmorTransforms}
                                            hairTransform={local3DHairstyleTransforms}
                                            activePieceId={activePiece?.id || null}
                                            isOrbitControlsEnabled={isOrbitControlsEnabled}
                                        />
                                    </Suspense>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-center text-white">
                                        <p>Select a Base Body and an item with a 3D model to enable 3D View.</p>
                                    </div>
                                )}

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
                                                        {viewMode === '3d' && (
                                                            <div className="flex items-center space-x-2">
                                                                <Label htmlFor="orbit-controls" className="flex items-center gap-1 cursor-pointer"><Orbit className="h-4 w-4"/> Rotate</Label>
                                                                <Switch id="orbit-controls" checked={isOrbitControlsEnabled} onCheckedChange={setIsOrbitControlsEnabled} />
                                                            </div>
                                                        )}
                                                        {activePiece ? (
                                                            <div className="space-y-4">
                                                                <p className="font-bold text-center">Editing: <span className="text-primary">{'styleName' in activePiece ? activePiece.styleName : activePiece.name}</span></p>
                                                                {viewMode === '2d' && (
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
                                                                                    <Label htmlFor="scale">Scale Modifier</Label>
                                                                                    <Slider id="scale" value={[activeScaleForSlider]} onValueChange={([val]) => handleSliderChange('slider', val)} min={0} max={100} step={0.5} disabled={isPreviewMode}/>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                                 {viewMode === '3d' && (
                                                                    <div className="space-y-2 animate-in fade-in-50">
                                                                        <Label htmlFor="3d-scale" className="flex items-center gap-1"><Scaling className="h-4 w-4"/> 3D Scale: {active3DScale.toFixed(2)}x</Label>
                                                                        <Slider id="3d-scale" value={[active3DScale]} onValueChange={([val]) => handle3DScaleChange(val)} min={0.1} max={2} step={0.01}/>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground text-center">Select an equipped piece to see its controls.</p>
                                                        )}
                                                    </CardContent>
                                                </ScrollArea>
                                            </Card>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                           </div>
                           {equipment.bodyId && (
                                <div className="flex justify-between items-center w-full max-w-sm mt-2 mx-auto">
                                    <Button variant="outline" onClick={() => handleBodyCycle('prev')}>
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                    <span className="font-semibold">{allBodies.find(b => b.id === equipment.bodyId)?.name || 'Body Type'}</span>
                                    <Button variant="outline" onClick={() => handleBodyCycle('next')}>
                                        <ArrowRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            )}
                        </div>
                     </div>
                     <div className="mt-8">
                         <Card>
                             <CardHeader>
                                 <CardTitle>Or, Choose from a Pre-Made Avatar You Have Unlocked!</CardTitle>
                                 <CardDescription>Select one of your unlocked static avatars. This will unequip any custom items.</CardDescription>
                             </CardHeader>
                             <CardContent>
                                {renderStaticAvatarGroups()}
                             </CardContent>
                         </Card>
                     </div>
                 </div>
            </main>
        </div>
    );
}
