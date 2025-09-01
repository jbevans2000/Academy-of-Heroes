
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import { collection, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Diamond, Loader2, Upload, X, Save, PlusCircle, Edit, Trash2, Scissors, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addArmorPiece, updateArmorPiece, deleteArmorPiece } from '@/ai/flows/manage-forge';
import type { ArmorPiece, ArmorSlot, ArmorClassRequirement, Hairstyle } from '@/lib/forge';
import { v4 as uuidv4 } from 'uuid';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

// --- DIALOGS ---

const ArmorEditorDialog = ({ isOpen, onOpenChange, armor, teacherUid, onSave }: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    armor: Partial<ArmorPiece> | null;
    teacherUid: string;
    onSave: () => void;
}) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<ArmorPiece>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState<'display' | 'modular' | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(armor || {
                name: '', description: '', imageUrl: '', modularImageUrl: '', slot: 'head',
                classRequirement: 'Any', levelRequirement: 1, goldCost: 0, isPublished: false
            });
        }
    }, [isOpen, armor]);

    const handleInputChange = (field: keyof ArmorPiece, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleFileUpload = async (file: File | null, type: 'display' | 'modular') => {
        if (!file || !teacherUid) return;
        setIsUploading(type);
        try {
            const storage = getStorage(app);
            const imageId = uuidv4();
            const storageRef = ref(storage, `armor-pieces/${teacherUid}/${imageId}_${type}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            handleInputChange(type === 'display' ? 'imageUrl' : 'modularImageUrl', downloadUrl);
            toast({ title: `${type === 'display' ? 'Display' : 'Modular'} image uploaded.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(null);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.description || !formData.imageUrl || !formData.modularImageUrl || !formData.slot || !formData.classRequirement) {
            toast({ variant: 'destructive', title: 'Missing Fields' });
            return;
        }
        setIsSaving(true);
        try {
            const result = formData.id
                ? await updateArmorPiece(formData as ArmorPiece)
                : await addArmorPiece(formData as any);
            
            if (result.success) {
                toast({ title: formData.id ? 'Armor Updated' : 'Armor Created' });
                onSave();
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{formData.id ? 'Edit' : 'Create'} Armor Piece</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                <div className="grid gap-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="armor-name">Name</Label>
                        <Input id="armor-name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="armor-desc">Description</Label>
                        <Textarea id="armor-desc" value={formData.description || ''} onChange={e => handleInputChange('description', e.target.value)} />
                    </div>
                    
                    <div className="p-4 border rounded-md space-y-2">
                        <Label>Display Image (for store/inventory)</Label>
                        <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, 'display')} disabled={isUploading === 'display'} />
                        {isUploading === 'display' && <Loader2 className="animate-spin" />}
                        {formData.imageUrl && <NextImage src={formData.imageUrl} alt="Display" width={80} height={80} className="rounded-md border" />}
                    </div>

                     <div className="p-4 border rounded-md space-y-2">
                        <Label>Modular Overlay Image (for character)</Label>
                        <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, 'modular')} disabled={isUploading === 'modular'} />
                        {isUploading === 'modular' && <Loader2 className="animate-spin" />}
                        {formData.modularImageUrl && <NextImage src={formData.modularImageUrl} alt="Modular" width={80} height={80} className="rounded-md border" />}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="armor-slot">Slot</Label>
                            <Select value={formData.slot} onValueChange={(v) => handleInputChange('slot', v as ArmorSlot)}>
                                <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="head">Head</SelectItem><SelectItem value="shoulders">Shoulders</SelectItem>
                                    <SelectItem value="chest">Chest</SelectItem><SelectItem value="hands">Hands</SelectItem>
                                    <SelectItem value="legs">Legs</SelectItem><SelectItem value="feet">Feet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="class-req">Class</Label>
                            <Select value={formData.classRequirement} onValueChange={(v) => handleInputChange('classRequirement', v as ArmorClassRequirement)}>
                                <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Any">Any</SelectItem><SelectItem value="Guardian">Guardian</SelectItem>
                                    <SelectItem value="Healer">Healer</SelectItem><SelectItem value="Mage">Mage</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="level-req">Level Req.</Label>
                            <Input id="level-req" type="number" value={formData.levelRequirement || ''} onChange={e => handleInputChange('levelRequirement', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="gold-cost">Gold Cost</Label>
                            <Input id="gold-cost" type="number" value={formData.goldCost || ''} onChange={e => handleInputChange('goldCost', e.target.value)} />
                        </div>
                    </div>
                     <div className="flex items-center space-x-2 pt-4">
                        <Switch id="armor-published" checked={formData.isPublished} onCheckedChange={(checked) => handleInputChange('isPublished', checked)} />
                        <Label htmlFor="armor-published">Published to Students</Label>
                    </div>
                </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const HairstyleEditorDialog = ({ isOpen, onOpenChange, hairstyle, teacherUid }: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    hairstyle: Partial<Hairstyle> | null;
    teacherUid: string;
}) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<Hairstyle>>({ styleName: '', baseImageUrl: '', colors: [], transforms: {}, isPublished: false });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(hairstyle || { styleName: '', baseImageUrl: '', colors: [], transforms: {}, isPublished: false });
        }
    }, [isOpen, hairstyle]);

    const handleInputChange = (field: keyof Hairstyle, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleColorChange = (index: number, field: 'name' | 'imageUrl', value: string) => {
        const newColors = [...(formData.colors || [])];
        newColors[index] = { ...newColors[index], [field]: value };
        handleInputChange('colors', newColors);
    }
    
    const addColor = () => {
        const newColors = [...(formData.colors || []), { name: '', imageUrl: '' }];
        handleInputChange('colors', newColors);
    }

    const removeColor = (index: number) => {
        const newColors = [...(formData.colors || [])];
        newColors.splice(index, 1);
        handleInputChange('colors', newColors);
    }

    const handleFileUpload = async (file: File | null, type: 'base' | number) => {
        if (!file || !teacherUid) return;
        const uploadKey = `upload-${type}`;
        setIsUploading(uploadKey);
        try {
            const storage = getStorage(app);
            const imageId = uuidv4();
            const storageRef = ref(storage, `hairstyles/${teacherUid}/${imageId}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            
            if (type === 'base') {
                handleInputChange('baseImageUrl', downloadUrl);
            } else {
                handleColorChange(type, 'imageUrl', downloadUrl);
            }
            toast({ title: `Image uploaded successfully.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(null);
        }
    };

    const handleSave = async () => {
        if (!formData.styleName || !formData.baseImageUrl) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: "Style Name and Base Image are required." });
            return;
        }
        setIsSaving(true);
        try {
            const collectionRef = collection(db, 'hairstyles');
            if (formData.id) {
                const docRef = doc(collectionRef, formData.id);
                await updateDoc(docRef, formData);
                toast({ title: 'Hairstyle Updated' });
            } else {
                await addDoc(collectionRef, { ...formData, createdAt: serverTimestamp() });
                toast({ title: 'Hairstyle Created' });
            }
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{formData.id ? 'Edit' : 'Create'} Hairstyle</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="style-name">Style Name</Label>
                            <Input id="style-name" value={formData.styleName || ''} onChange={e => handleInputChange('styleName', e.target.value)} />
                        </div>
                        <div className="p-4 border rounded-md space-y-2">
                            <Label>Base Image (for Sizing Tool)</Label>
                            <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, 'base')} disabled={isUploading === 'upload-base'} />
                            {isUploading === 'upload-base' && <Loader2 className="animate-spin" />}
                            {formData.baseImageUrl && <NextImage src={formData.baseImageUrl} alt="Base" width={80} height={80} className="rounded-md border bg-gray-200" />}
                        </div>

                        <div className="p-4 border rounded-md space-y-4">
                            <h4 className="font-semibold">Color Variations</h4>
                            {formData.colors?.map((color, index) => (
                                <div key={index} className="p-2 border rounded-md space-y-2 relative">
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeColor(index)}><X className="h-4 w-4" /></Button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input placeholder="Color Name (e.g. Blonde)" value={color.name} onChange={e => handleColorChange(index, 'name', e.target.value)} />
                                        <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, index)} disabled={isUploading === `upload-${index}`} />
                                    </div>
                                    {isUploading === `upload-${index}` && <Loader2 className="animate-spin" />}
                                    {color.imageUrl && <NextImage src={color.imageUrl} alt={color.name} width={60} height={60} className="rounded-md border bg-gray-200" />}
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addColor}>Add Color Variation</Button>
                        </div>
                         <div className="flex items-center space-x-2 pt-4">
                            <Switch id="hair-published" checked={formData.isPublished} onCheckedChange={(checked) => handleInputChange('isPublished', checked)} />
                            <Label htmlFor="hair-published">Published to Students</Label>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// --- MAIN PAGE COMPONENT ---

export default function GlobalForgePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [armorPieces, setArmorPieces] = useState<ArmorPiece[]>([]);
    const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Armor Dialog state
    const [isArmorEditorOpen, setIsArmorEditorOpen] = useState(false);
    const [editingArmor, setEditingArmor] = useState<Partial<ArmorPiece> | null>(null);
    const [armorToDelete, setArmorToDelete] = useState<ArmorPiece | null>(null);
    const [isDeletingArmor, setIsDeletingArmor] = useState(false);

    // Hairstyle Dialog state
    const [isHairstyleEditorOpen, setIsHairstyleEditorOpen] = useState(false);
    const [editingHairstyle, setEditingHairstyle] = useState<Partial<Hairstyle> | null>(null);
    const [hairstyleToDelete, setHairstyleToDelete] = useState<Hairstyle | null>(null);
    const [isDeletingHairstyle, setIsDeletingHairstyle] = useState(false);


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
    
    useEffect(() => {
        if (!user) return;
        const armorQuery = collection(db, 'armorPieces');
        const unsubArmor = onSnapshot(armorQuery, (snapshot) => {
            setArmorPieces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece)));
            setIsLoading(false);
        });
        
        const hairstylesQuery = collection(db, 'hairstyles');
        const unsubHairstyles = onSnapshot(hairstylesQuery, (snapshot) => {
            setHairstyles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle)));
        });

        return () => {
            unsubArmor();
            unsubHairstyles();
        };
    }, [user]);
    
    // --- Armor Functions ---
    const handleNewArmor = () => { setEditingArmor(null); setIsArmorEditorOpen(true); };
    const handleEditArmor = (armor: ArmorPiece) => { setEditingArmor(armor); setIsArmorEditorOpen(true); };
    const handleDeleteArmor = async () => {
        if (!armorToDelete) return;
        setIsDeletingArmor(true);
        try {
            const result = await deleteArmorPiece(armorToDelete.id);
            if (result.success) {
                toast({ title: 'Armor Deleted' });
                setArmorToDelete(null);
            } else { throw new Error(result.error); }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeletingArmor(false);
        }
    };

    // --- Hairstyle Functions ---
    const handleNewHairstyle = () => { setEditingHairstyle(null); setIsHairstyleEditorOpen(true); };
    const handleEditHairstyle = (hairstyle: Hairstyle) => { setEditingHairstyle(hairstyle); setIsHairstyleEditorOpen(true); };
    const handleDeleteHairstyle = async () => {
        if (!hairstyleToDelete || !user) return;
        setIsDeletingHairstyle(true);
        try {
            await deleteDoc(doc(db, 'hairstyles', hairstyleToDelete.id));
            toast({ title: 'Hairstyle Deleted' });
            setHairstyleToDelete(null);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeletingHairstyle(false);
        }
    };


    return (
        <>
            {user && <ArmorEditorDialog 
                isOpen={isArmorEditorOpen}
                onOpenChange={setIsArmorEditorOpen}
                armor={editingArmor}
                teacherUid={user.uid}
                onSave={() => { /* Real-time listener will update UI */}}
            />}
             {user && <HairstyleEditorDialog 
                isOpen={isHairstyleEditorOpen}
                onOpenChange={setIsHairstyleEditorOpen}
                hairstyle={editingHairstyle}
                teacherUid={user.uid}
            />}
            <AlertDialog open={!!armorToDelete} onOpenChange={() => setArmorToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete {armorToDelete?.name}?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>This will permanently remove this armor piece. This cannot be undone.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteArmor} disabled={isDeletingArmor} className="bg-destructive hover:bg-destructive/90">
                            {isDeletingArmor && <Loader2 className="animate-spin mr-2" />} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!hairstyleToDelete} onOpenChange={() => setHairstyleToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete {hairstyleToDelete?.styleName}?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>This will permanently remove this hairstyle and all its colors. This cannot be undone.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteHairstyle} disabled={isDeletingHairstyle} className="bg-destructive hover:bg-destructive/90">
                            {isDeletingHairstyle && <Loader2 className="animate-spin mr-2" />} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="w-full max-w-6xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Admin Dashboard
                        </Button>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                             {/* ARMOR MANAGEMENT */}
                            <Card>
                                <CardHeader className="flex-row justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2"><Diamond className="text-primary"/> Armor Management</CardTitle>
                                        <CardDescription>Manage all armor pieces available in the game.</CardDescription>
                                    </div>
                                    <Button onClick={handleNewArmor}><PlusCircle className="mr-2 h-4 w-4" /> Create Armor</Button>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[60vh]">
                                    {isLoading ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <Skeleton className="h-64" /> <Skeleton className="h-64" />
                                        </div>
                                    ) : armorPieces.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-10">The forge is empty. Create your first armor piece!</p>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {armorPieces.map(piece => (
                                                <Card key={piece.id} className="flex flex-col relative">
                                                     <div className="absolute top-2 left-2 z-10">
                                                        {piece.isPublished ? (
                                                            <div className="flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full border border-green-300">
                                                                <Eye className="h-3 w-3" />
                                                                Published
                                                            </div>
                                                        ) : (
                                                             <div className="flex items-center gap-1 bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-1 rounded-full border border-gray-300">
                                                                <EyeOff className="h-3 w-3" />
                                                                Hidden
                                                            </div>
                                                        )}
                                                    </div>
                                                    <CardHeader className="items-center">
                                                        <div className="w-24 h-24 relative bg-secondary rounded-md">
                                                            <NextImage src={piece.imageUrl || ''} alt={piece.name} fill className="object-contain p-1" />
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="flex-grow text-center space-y-1">
                                                        <p className="font-bold">{piece.name}</p>
                                                        <p className="text-sm text-muted-foreground">{piece.classRequirement} - {piece.slot}</p>
                                                        <p className="text-sm">Lvl {piece.levelRequirement} / {piece.goldCost}g</p>
                                                    </CardContent>
                                                    <CardFooter className="p-2 flex gap-1">
                                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditArmor(piece)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                                                        <Button variant="destructive" size="sm" onClick={() => setArmorToDelete(piece)}><Trash2 className="h-3 w-3" /></Button>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* HAIRSTYLE MANAGEMENT */}
                             <Card>
                                <CardHeader className="flex-row justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2"><Scissors className="text-pink-500"/> Hairstyle Management</CardTitle>
                                        <CardDescription>Manage all hairstyle styles and their color variations.</CardDescription>
                                    </div>
                                    <Button onClick={handleNewHairstyle}><PlusCircle className="mr-2 h-4 w-4" /> Create Hairstyle</Button>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[60vh]">
                                    {isLoading ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <Skeleton className="h-64" /> <Skeleton className="h-64" />
                                        </div>
                                    ) : hairstyles.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-10">No hairstyles created yet.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {hairstyles.map(style => (
                                                <Card key={style.id} className="flex flex-col relative">
                                                    <div className="absolute top-2 left-2 z-10">
                                                        {style.isPublished ? (
                                                            <div className="flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full border border-green-300">
                                                                <Eye className="h-3 w-3" />
                                                                Published
                                                            </div>
                                                        ) : (
                                                             <div className="flex items-center gap-1 bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-1 rounded-full border border-gray-300">
                                                                <EyeOff className="h-3 w-3" />
                                                                Hidden
                                                            </div>
                                                        )}
                                                    </div>
                                                    <CardHeader className="items-center">
                                                        <div className="w-24 h-24 relative bg-secondary rounded-md">
                                                            <NextImage src={style.baseImageUrl || ''} alt={style.styleName} fill className="object-contain p-1" />
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="flex-grow text-center space-y-1">
                                                        <p className="font-bold">{style.styleName}</p>
                                                        <p className="text-sm text-muted-foreground">{style.colors?.length || 0} color(s)</p>
                                                    </CardContent>
                                                    <CardFooter className="p-2 flex gap-1">
                                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditHairstyle(style)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                                                        <Button variant="destructive" size="sm" onClick={() => setHairstyleToDelete(style)}><Trash2 className="h-3 w-3" /></Button>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}
