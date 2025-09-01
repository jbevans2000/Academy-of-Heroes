
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { ArmorPiece, Hairstyle, BaseBody } from '@/lib/forge';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, RotateCcw, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const CharacterCanvas = ({ student, equipment, baseBody }: {
    student: Student | null;
    equipment: any;
    baseBody: BaseBody | null;
}) => {
    if (!student || !baseBody) return <Skeleton className="w-full h-full" />;

    const hairstyle = equipment.hairstyle as Hairstyle | null;
    const hairstyleColor = equipment.hairstyleColor || hairstyle?.colors[0]?.imageUrl;

    const hairstyleTransform = hairstyle?.transforms?.[baseBody.id] || { x: 50, y: 50, scale: 100 };
    
    return (
        <div className="relative w-full h-full">
            <Image src={baseBody.imageUrl} alt="Base Body" fill className="object-contain" priority />
            {hairstyleColor && (
                <div
                    className="absolute"
                    style={{
                        left: `${hairstyleTransform.x}%`,
                        top: `${hairstyleTransform.y}%`,
                        width: `${hairstyleTransform.scale}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <Image src={hairstyleColor} alt="Hairstyle" width={500} height={500} className="object-contain pointer-events-none" />
                </div>
            )}
             {/* TODO: Add Armor Layers Here */}
        </div>
    );
};

const ArmoryDialog = ({
    baseBodies,
    hairstyles,
    armorPieces,
    selectedBodyId,
    setSelectedBodyId,
    selectedHairstyleId,
    setSelectedHairstyleId,
    selectedHairstyleColor,
    setSelectedHairstyleColor,
    onOpenChange
}: {
    baseBodies: BaseBody[];
    hairstyles: Hairstyle[];
    armorPieces: ArmorPiece[];
    selectedBodyId: string | null;
    setSelectedBodyId: (id: string | null) => void;
    selectedHairstyleId: string | null;
    setSelectedHairstyleId: (id: string | null) => void;
    selectedHairstyleColor: string | null;
    setSelectedHairstyleColor: (color: string | null) => void;
    onOpenChange: (isOpen: boolean) => void;
}) => {
    
    const selectedHairstyle = hairstyles.find(h => h.id === selectedHairstyleId);

    const renderEquipmentGrid = (items: any[], selectedId: string | null, onSelect: (id: string | null) => void, onColorSelect?: (url: string | null) => void) => (
        <div className="grid grid-cols-4 gap-2">
            {items.map(item => (
                <Card 
                    key={item.id} 
                    className={cn(
                        "cursor-pointer hover:border-primary", 
                        selectedId === item.id && "border-2 border-primary"
                    )}
                    onClick={() => {
                        onSelect(item.id);
                        if (onColorSelect) { // Automatically select first color
                           onColorSelect(item.colors?.[0]?.imageUrl || null);
                        }
                    }}
                >
                    <CardContent className="p-1 aspect-square">
                        <Image src={item.imageUrl || item.baseImageUrl} alt={item.name || item.styleName} width={100} height={100} className="w-full h-full object-contain rounded-sm bg-secondary" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
    
    return (
        <DialogContent className="max-w-xl">
            <DialogHeader>
                <DialogTitle>Armory</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="body" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="body">Body</TabsTrigger>
                    <TabsTrigger value="hair">Hairstyle</TabsTrigger>
                    <TabsTrigger value="hair_color">Hair Color</TabsTrigger>
                </TabsList>
                <ScrollArea className="flex-grow mt-4 h-96">
                    <TabsContent value="body" className="p-2">
                        {renderEquipmentGrid(baseBodies, selectedBodyId, setSelectedBodyId)}
                    </TabsContent>
                    <TabsContent value="hair" className="p-2">
                         {renderEquipmentGrid(hairstyles, selectedHairstyleId, setSelectedHairstyleId, setSelectedHairstyleColor)}
                    </TabsContent>
                    <TabsContent value="hair_color" className="p-2 space-y-4">
                        {selectedHairstyle ? (
                            <div className="grid grid-cols-5 gap-2">
                                {selectedHairstyle.colors.map((color, index) => (
                                    <div 
                                        key={index} 
                                        className={cn("h-16 w-16 rounded-md border-2 cursor-pointer", selectedHairstyleColor === color.imageUrl ? "border-primary ring-2 ring-primary" : "border-transparent")}
                                        onClick={() => setSelectedHairstyleColor(color.imageUrl)}
                                    >
                                        <Image src={color.imageUrl} alt={color.name} width={64} height={64} className="w-full h-full object-contain rounded-sm" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Select a hairstyle first to see color options.</p>
                        )}
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </DialogContent>
    )
}

export default function ForgePage() {
    const router = useRouter();
    const { toast } = useToast();

    // Data State
    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [baseBodies, setBaseBodies] = useState<BaseBody[]>([]);
    const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
    const [armorPieces, setArmorPieces] = useState<ArmorPiece[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Armory Dialog State
    const [isArmoryOpen, setIsArmoryOpen] = useState(false);

    // Equipment State
    const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
    const [selectedHairstyleId, setSelectedHairstyleId] = useState<string | null>(null);
    const [selectedHairstyleColor, setSelectedHairstyleColor] = useState<string | null>(null);
    // ... add state for armor slots

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
                // Set initial selections from student data
                setSelectedBodyId(studentData.equippedBodyId || null);
                setSelectedHairstyleId(studentData.equippedHairstyleId || null);
                setSelectedHairstyleColor(studentData.equippedHairstyleColor || null);
            }
        });
        
        const fetchCosmetics = async () => {
             try {
                const bodiesSnap = await getDocs(collection(db, 'baseBodies'));
                const bodiesData = bodiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseBody)).sort((a: any, b: any) => a.order - b.order);
                setBaseBodies(bodiesData);
                if (bodiesData.length > 0 && !student?.equippedBodyId) {
                    setSelectedBodyId(bodiesData[0].id);
                }

                const hairQuery = query(collection(db, 'hairstyles'), where('isPublished', '==', true));
                const hairSnap = await getDocs(hairQuery);
                setHairstyles(hairSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle)));

                // Add armor fetching later
                // const armorQuery = query(collection(db, 'armorPieces'), where('isPublished', '==', true));
                // const armorSnap = await getDocs(armorQuery);
                // setArmorPieces(armorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece)));

             } catch (e) {
                console.error("Error fetching cosmetics:", e);
                toast({ variant: 'destructive', title: "Error", description: "Could not load inventory items." });
             } finally {
                setIsLoading(false);
             }
        }
        
        fetchCosmetics();

        return () => unsubStudent();
    }, [user, teacherUid, toast, student?.equippedBodyId]);
    
    const selectedHairstyle = hairstyles.find(h => h.id === selectedHairstyleId);

    const handleSave = async () => {
        if (!user || !teacherUid) return;
        setIsSaving(true);
        try {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
            await updateDoc(studentRef, {
                equippedBodyId: selectedBodyId,
                equippedHairstyleId: selectedHairstyleId,
                equippedHairstyleColor: selectedHairstyleColor,
                //... save armor slots
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
        }
    }
    
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin"/></div>
    }


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                 <div className="w-full max-w-5xl mx-auto space-y-4">
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
                    <Card className="h-[75vh]">
                        <CardContent className="h-full p-4 flex items-center justify-center relative">
                            <Dialog open={isArmoryOpen} onOpenChange={setIsArmoryOpen}>
                                <DialogTrigger asChild>
                                    <Button className="absolute top-4 left-4 z-10" size="lg"><Shield className="mr-2 h-5 w-5"/> Armory</Button>
                                </DialogTrigger>
                                <ArmoryDialog 
                                    baseBodies={baseBodies}
                                    hairstyles={hairstyles}
                                    armorPieces={armorPieces}
                                    selectedBodyId={selectedBodyId}
                                    setSelectedBodyId={setSelectedBodyId}
                                    selectedHairstyleId={selectedHairstyleId}
                                    setSelectedHairstyleId={setSelectedHairstyleId}
                                    selectedHairstyleColor={selectedHairstyleColor}
                                    setSelectedHairstyleColor={setSelectedHairstyleColor}
                                    onOpenChange={setIsArmoryOpen}
                                />
                            </Dialog>
                            <CharacterCanvas 
                                student={student}
                                baseBody={baseBodies.find(b => b.id === selectedBodyId) || null}
                                equipment={{ hairstyle: selectedHairstyle, hairstyleColor: selectedHairstyleColor }}
                            />
                        </CardContent>
                    </Card>
                 </div>
            </main>
        </div>
    );
}

    