
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Company } from '@/lib/data';
import type { ArmorPiece, Hairstyle, BaseBody } from '@/lib/forge';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
                setSelectedBodyId(studentData.equippedBodyId || 'body_1');
                setSelectedHairstyleId(studentData.equippedHairstyleId || null);
                setSelectedHairstyleColor(studentData.equippedHairstyleColor || null);
            }
        });
        
        const fetchCosmetics = async () => {
             try {
                const bodiesSnap = await getDocs(collection(db, 'baseBodies'));
                const bodiesData = bodiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseBody)).sort((a: any, b: any) => a.order - b.order);
                setBaseBodies(bodiesData);
                if (!selectedBodyId && bodiesData.length > 0) {
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
                toast({ variant: 'destructive', title: "Error", description: "Could not load cosmetic items." });
             } finally {
                setIsLoading(false);
             }
        }
        
        fetchCosmetics();

        return () => unsubStudent();
    }, [user, teacherUid, selectedBodyId, toast]);
    
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
            setSelectedBodyId(student.equippedBodyId || 'body_1');
            setSelectedHairstyleId(student.equippedHairstyleId || null);
            setSelectedHairstyleColor(student.equippedHairstyleColor || null);
        }
    }
    
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
                        <Image src={item.imageUrl || item.baseImageUrl} alt={item.name || item.styleName} width={100} height={100} className="w-full h-full object-contain rounded-sm" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin"/></div>
    }


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {/* Left Panel: Character Display */}
                    <div className="lg:col-span-2 h-[80vh]">
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <CardTitle>Character Forge</CardTitle>
                                <CardDescription>Customize your hero's appearance.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <CharacterCanvas 
                                    student={student}
                                    baseBody={baseBodies.find(b => b.id === selectedBodyId) || null}
                                    equipment={{ hairstyle: selectedHairstyle, hairstyleColor: selectedHairstyleColor }}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Panel: Equipment Selection */}
                    <div className="h-[80vh] flex flex-col gap-4">
                        <Card className="flex-grow flex flex-col">
                             <Tabs defaultValue="body" className="w-full h-full flex flex-col">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="body">Body</TabsTrigger>
                                    <TabsTrigger value="hair">Hair</TabsTrigger>
                                    <TabsTrigger value="head">Head</TabsTrigger>
                                    <TabsTrigger value="shoulders">Shoulders</TabsTrigger>
                                </TabsList>
                                <ScrollArea className="flex-grow">
                                <TabsContent value="body" className="p-2">
                                     {renderEquipmentGrid(baseBodies, selectedBodyId, setSelectedBodyId)}
                                </TabsContent>
                                <TabsContent value="hair" className="p-2 space-y-4">
                                    {renderEquipmentGrid(hairstyles, selectedHairstyleId, setSelectedHairstyleId, setSelectedHairstyleColor)}
                                    {selectedHairstyle && (
                                        <>
                                            <hr />
                                            <h4 className="font-semibold text-sm">Colors</h4>
                                            <div className="grid grid-cols-5 gap-2">
                                                {selectedHairstyle.colors.map((color, index) => (
                                                    <div 
                                                        key={index} 
                                                        className={cn("h-12 w-12 rounded-md border-2 cursor-pointer", selectedHairstyleColor === color.imageUrl ? "border-primary ring-2 ring-primary" : "border-transparent")}
                                                        onClick={() => setSelectedHairstyleColor(color.imageUrl)}
                                                    >
                                                        <Image src={color.imageUrl} alt={color.name} width={48} height={48} className="w-full h-full object-contain rounded-sm" />
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </TabsContent>
                                <TabsContent value="head" className="p-2">
                                    <p className="text-center text-muted-foreground p-8">Head armor coming soon!</p>
                                </TabsContent>
                                <TabsContent value="shoulders" className="p-2">
                                     <p className="text-center text-muted-foreground p-8">Shoulder armor coming soon!</p>
                                </TabsContent>
                                </ScrollArea>
                            </Tabs>
                        </Card>
                        <div className="flex-shrink-0 grid grid-cols-2 gap-2">
                             <Button variant="outline" size="lg" onClick={handleReset} disabled={isSaving}><RotateCcw className="mr-2 h-4 w-4"/>Reset</Button>
                             <Button size="lg" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                Save
                             </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
