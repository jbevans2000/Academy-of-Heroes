
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { ArmorPiece, Hairstyle, BaseBody, ArmorSlot } from '@/lib/forge';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, RotateCcw, Hammer, Gem } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ArmoryDialog } from '@/components/dashboard/armory-dialog';


const slotZIndex: Record<ArmorSlot, number> = {
    legs: 1,
    feet: 2,
    chest: 3,
    shoulders: 4,
    head: 5,
    hands: 5,
};

const CharacterCanvas = ({ student, equipment, baseBody }: {
    student: Student | null;
    equipment: any;
    baseBody: BaseBody | null;
}) => {
    if (!student || !baseBody) return <Skeleton className="w-full h-full" />;

    const hairstyle = equipment.hairstyle as Hairstyle | null;
    const hairstyleColor = equipment.hairstyleColor || hairstyle?.colors[0]?.imageUrl;

    const hairstyleTransform = hairstyle?.transforms?.[baseBody.id] || { x: 50, y: 50, scale: 100 };
    
    // An array of all equipped armor pieces, filtering out any nulls
    const equippedArmor: ArmorPiece[] = [
        equipment.head,
        equipment.shoulders,
        equipment.chest,
        equipment.hands,
        equipment.legs,
        equipment.feet,
    ].filter(Boolean);

    return (
        <div className="relative w-full max-w-[500px] aspect-square">
            <Image src={baseBody.imageUrl} alt="Base Body" fill className="object-contain" priority />
            
            {hairstyleColor && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        top: `${hairstyleTransform.y}%`,
                        left: `${hairstyleTransform.x}%`,
                        width: `${hairstyleTransform.scale}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10 // Hair should be on top
                    }}
                >
                    <Image src={hairstyleColor} alt="Hairstyle" width={500} height={500} className="object-contain" />
                </div>
            )}
            
            {equippedArmor.map(piece => {
                if (!piece) return null;
                const zIndex = slotZIndex[piece.slot] || 1;
                
                // Render the primary modular image
                const transform1 = piece.transforms?.[baseBody.id] || { x: 50, y: 50, scale: 100 };
                
                // Render the secondary modular image if it exists
                const transform2 = piece.transforms2?.[baseBody.id];

                return (
                    <div key={piece.id}>
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                top: `${transform1.y}%`,
                                left: `${transform1.x}%`,
                                width: `${transform1.scale}%`,
                                transform: 'translate(-50%, -50%)',
                                zIndex: zIndex,
                            }}
                        >
                            <Image src={piece.modularImageUrl} alt={piece.name} width={500} height={500} className="object-contain" />
                        </div>
                        {piece.modularImageUrl2 && transform2 && (
                             <div
                                className="absolute pointer-events-none"
                                style={{
                                    top: `${transform2.y}%`,
                                    left: `${transform2.x}%`,
                                    width: `${transform2.scale}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: zIndex,
                                }}
                            >
                                <Image src={piece.modularImageUrl2} alt={`${piece.name} (secondary)`} width={500} height={500} className="object-contain" />
                            </div>
                        )}
                    </div>
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
                // Set initial selections from student data if they haven't been set yet
                if (selectedBodyId === null) setSelectedBodyId(studentData.equippedBodyId || null);
                if (selectedHairstyleId === null) setSelectedHairstyleId(studentData.equippedHairstyleId || null);
                if (selectedHairstyleColor === null) setSelectedHairstyleColor(studentData.equippedHairstyleColor || null);
            }
        });
        
        const fetchCosmetics = async () => {
             try {
                const bodiesSnap = await getDocs(collection(db, 'baseBodies'));
                const bodiesData = bodiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseBody)).sort((a: any, b: any) => a.order - b.order);
                setBaseBodies(bodiesData);
                
                // Set initial body if there's none equipped on the student record
                if (!student?.equippedBodyId && bodiesData.length > 0) {
                   setSelectedBodyId(bodiesData[0].id);
                }

                const hairQuery = query(collection(db, 'hairstyles'), where('isPublished', '==', true));
                const hairSnap = await getDocs(hairQuery);
                setHairstyles(hairSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle)));

                // Fetch all published armor
                const armorQuery = query(collection(db, 'armorPieces'), where('isPublished', '==', true));
                const armorSnap = await getDocs(armorQuery);
                const armorData = armorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece));
                setAllArmor(armorData);

                // This is a re-check to set initial armor state after allArmor is fetched
                if (student) {
                    setSelectedHead(armorData.find(a => a.id === student.equippedHeadId) || null);
                    setSelectedShoulders(armorData.find(a => a.id === student.equippedShouldersId) || null);
                    setSelectedChest(armorData.find(a => a.id === student.equippedChestId) || null);
                    setSelectedHands(armorData.find(a => a.id === student.equippedHandsId) || null);
                    setSelectedLegs(armorData.find(a => a.id === student.equippedLegsId) || null);
                    setSelectedFeet(armorData.find(a => a.id === student.equippedFeetId) || null);
                }

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
    
    const selectedHairstyle = hairstyles.find(h => h.id === selectedHairstyleId);
    
    const ownedArmor = allArmor.filter(armor => student?.ownedArmorIds?.includes(armor.id));

    const armorBySlot = {
        head: ownedArmor.filter(a => a.slot === 'head'),
        shoulders: ownedArmor.filter(a => a.slot === 'shoulders'),
        chest: ownedArmor.filter(a => a.slot === 'chest'),
        hands: ownedArmor.filter(a => a.slot === 'hands'),
        legs: ownedArmor.filter(a => a.slot === 'legs'),
        feet: ownedArmor.filter(a => a.slot === 'feet'),
    };
    
    const handleEquipArmor = (piece: ArmorPiece) => {
        switch (piece.slot) {
            case 'head': setSelectedHead(piece); break;
            case 'shoulders': setSelectedShoulders(piece); break;
            case 'chest': setSelectedChest(piece); break;
            case 'hands': setSelectedHands(piece); break;
            case 'legs': setSelectedLegs(piece); break;
            case 'feet': setSelectedFeet(piece); break;
        }
    };

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
        if (student) {
            setSelectedBodyId(student.equippedBodyId || baseBodies[0]?.id || null);
            setSelectedHairstyleId(student.equippedHairstyleId || null);
            setSelectedHairstyleColor(student.equippedHairstyleColor || null);
            setSelectedHead(allArmor.find(a => a.id === student.equippedHeadId) || null);
            setSelectedShoulders(allArmor.find(a => a.id === student.equippedShouldersId) || null);
            setSelectedChest(allArmor.find(a => a.id === student.equippedChestId) || null);
            setSelectedHands(allArmor.find(a => a.id === student.equippedHandsId) || null);
            setSelectedLegs(allArmor.find(a => a.id === student.equippedLegsId) || null);
            setSelectedFeet(allArmor.find(a => a.id === student.equippedFeetId) || null);
        }
    }
    
    const renderArmorGrid = (slot: ArmorSlot) => (
        <div className="grid grid-cols-3 gap-2">
            {armorBySlot[slot].map(item => {
                const isEquipped = selectedHead?.id === item.id || selectedShoulders?.id === item.id || selectedChest?.id === item.id || selectedHands?.id === item.id || selectedLegs?.id === item.id || selectedFeet?.id === item.id;
                return (
                    <Card 
                        key={item.id} 
                        className={cn(
                            "cursor-pointer hover:border-primary", 
                            isEquipped && "border-2 border-primary"
                        )}
                        onClick={() => handleEquipArmor(item)}
                    >
                        <CardContent className="p-1 aspect-square">
                            <Image src={item.imageUrl} alt={item.name} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    );
    
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
                             <Button variant="secondary" size="lg" onClick={handleReset} disabled={isSaving}><RotateCcw className="mr-2 h-4 w-4"/>Reset Changes</Button>
                             <Button size="lg" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                Save Appearance
                             </Button>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card className="h-[75vh]">
                                <CardContent className="h-full p-4 flex items-center justify-center">
                                     <CharacterCanvas 
                                        student={student}
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
                                    />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                            <Card className="h-[75vh] flex flex-col">
                                <CardHeader>
                                    <CardTitle>The Forge</CardTitle>
                                    <CardDescription>Select your equipment.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow overflow-hidden">
                                     <Tabs defaultValue="body" className="w-full h-full flex flex-col">
                                        <TabsList className="grid w-full grid-cols-4">
                                            <TabsTrigger value="body">Body</TabsTrigger>
                                            <TabsTrigger value="hair">Hairstyle</TabsTrigger>
                                            <TabsTrigger value="hair_color">Hair Color</TabsTrigger>
                                            <TabsTrigger value="armor">Armor</TabsTrigger>
                                        </TabsList>
                                        <ScrollArea className="flex-grow mt-4 h-full">
                                            <TabsContent value="body" className="p-2">
                                                 <div className="grid grid-cols-3 gap-2">
                                                    {baseBodies.map(item => (
                                                        <Card 
                                                            key={item.id} 
                                                            className={cn(
                                                                "cursor-pointer hover:border-primary", 
                                                                selectedBodyId === item.id && "border-2 border-primary"
                                                            )}
                                                            onClick={() => setSelectedBodyId(item.id)}
                                                        >
                                                            <CardContent className="p-1 aspect-square">
                                                                <Image src={item.imageUrl} alt={item.name} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </TabsContent>
                                            <TabsContent value="hair" className="p-2">
                                                <div className="grid grid-cols-3 gap-2">
                                                    {hairstyles.map(item => (
                                                        <Card 
                                                            key={item.id} 
                                                            className={cn(
                                                                "cursor-pointer hover:border-primary", 
                                                                selectedHairstyleId === item.id && "border-2 border-primary"
                                                            )}
                                                            onClick={() => {
                                                                setSelectedHairstyleId(item.id);
                                                                setSelectedHairstyleColor(item.colors?.[0]?.imageUrl || null);
                                                            }}
                                                        >
                                                            <CardContent className="p-1 aspect-square">
                                                                <Image src={item.baseImageUrl} alt={item.styleName} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </TabsContent>
                                            <TabsContent value="hair_color" className="p-2 space-y-4">
                                                 {!selectedHairstyle ? (
                                                    <p className="text-center text-muted-foreground py-8">Select a hairstyle first to see color options.</p>
                                                ) : (
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {selectedHairstyle.colors.map((color, index) => (
                                                            <div 
                                                                key={index} 
                                                                className={cn("h-16 w-16 rounded-md border-2 cursor-pointer", selectedHairstyleColor === color.imageUrl ? "border-primary ring-2 ring-primary" : "border-transparent")}
                                                                onClick={() => setSelectedHairstyleColor(color.imageUrl)}
                                                            >
                                                                <Image src={color.imageUrl} alt={`Color ${index+1}`} width={64} height={64} className="w-full h-full object-contain rounded-sm bg-secondary" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="armor" className="p-2 space-y-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold mb-2">Head</h4>
                                                    {renderArmorGrid('head')}
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold mb-2">Shoulders</h4>
                                                    {renderArmorGrid('shoulders')}
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold mb-2">Chest</h4>
                                                    {renderArmorGrid('chest')}
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold mb-2">Hands</h4>
                                                    {renderArmorGrid('hands')}
                                                </div>
                                                 <div className="space-y-2">
                                                    <h4 className="font-semibold mb-2">Legs</h4>
                                                    {renderArmorGrid('legs')}
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold mb-2">Feet</h4>
                                                    {renderArmorGrid('feet')}
                                                </div>
                                            </TabsContent>
                                        </ScrollArea>
                                    </Tabs>
                                </CardContent>
                                <CardFooter className="grid grid-cols-2 gap-2 p-2">
                                     <Button size="lg" className="h-16" onClick={() => setIsArmoryOpen(true)}>
                                        <Gem className="mr-2 h-6 w-6"/>
                                        The Armory
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
