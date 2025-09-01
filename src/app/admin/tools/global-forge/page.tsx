
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Diamond, Loader2, Upload, X, Save, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addArmorPiece, updateArmorPiece, deleteArmorPiece } from '@/ai/flows/manage-forge';
import type { ArmorPiece, ArmorSlot, ArmorClassRequirement } from '@/lib/forge';
import { v4 as uuidv4 } from 'uuid';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
                classRequirement: 'Any', levelRequirement: 1, goldCost: 0
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
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                </div>
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

export default function GlobalForgePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [armorPieces, setArmorPieces] = useState<ArmorPiece[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog state
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingArmor, setEditingArmor] = useState<Partial<ArmorPiece> | null>(null);
    
    // Delete state
    const [armorToDelete, setArmorToDelete] = useState<ArmorPiece | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
        const q = collection(db, 'armorPieces');
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pieces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece));
            setArmorPieces(pieces);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);
    
    const handleNewArmor = () => {
        setEditingArmor(null);
        setIsEditorOpen(true);
    };

    const handleEditArmor = (armor: ArmorPiece) => {
        setEditingArmor(armor);
        setIsEditorOpen(true);
    };
    
    const handleDeleteArmor = async () => {
        if (!armorToDelete) return;
        setIsDeleting(true);
        try {
            const result = await deleteArmorPiece(armorToDelete.id);
            if (result.success) {
                toast({ title: 'Armor Deleted' });
                setArmorToDelete(null);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };


    return (
        <>
            {user && <ArmorEditorDialog 
                isOpen={isEditorOpen}
                onOpenChange={setIsEditorOpen}
                armor={editingArmor}
                teacherUid={user.uid}
                onSave={() => { /* Real-time listener will update UI */}}
            />}
            <AlertDialog open={!!armorToDelete} onOpenChange={() => setArmorToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete {armorToDelete?.name}?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>This will permanently remove this armor piece. This cannot be undone.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteArmor} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="animate-spin mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="w-full max-w-6xl mx-auto space-y-6">
                        <div className="flex justify-between items-center">
                            <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Admin Dashboard
                            </Button>
                            <Button onClick={handleNewArmor}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create New Armor
                            </Button>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Diamond className="text-primary"/> Global Forge</CardTitle>
                                <CardDescription>Manage all armor pieces available in the game.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Skeleton className="h-64" /> <Skeleton className="h-64" />
                                        <Skeleton className="h-64" /> <Skeleton className="h-64" />
                                    </div>
                                ) : armorPieces.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-10">The forge is empty. Create your first armor piece!</p>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {armorPieces.map(piece => (
                                            <Card key={piece.id} className="flex flex-col">
                                                <CardHeader className="items-center">
                                                    <div className="w-24 h-24 relative bg-secondary rounded-md">
                                                        <NextImage src={piece.imageUrl || ''} alt={piece.name} layout="fill" className="object-contain p-1" />
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="flex-grow text-center space-y-1">
                                                    <p className="font-bold">{piece.name}</p>
                                                    <p className="text-sm text-muted-foreground">{piece.classRequirement} - {piece.slot}</p>
                                                    <p className="text-sm">Lvl {piece.levelRequirement} / {piece.goldCost}g</p>
                                                </CardContent>
                                                <CardFooter className="p-2 flex gap-1">
                                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditArmor(piece)}>
                                                        <Edit className="mr-1 h-3 w-3" /> Edit
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => setArmorToDelete(piece)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </>
    )
}

    