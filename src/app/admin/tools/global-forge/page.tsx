
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import { collection, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Diamond, Loader2, Upload, X, Save, PlusCircle, Edit, Trash2, Scissors, CheckCircle, Eye, EyeOff, Box } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addArmorPiece, updateArmorPiece, deleteArmorPiece } from '@/ai/flows/manage-forge';
import type { ArmorPiece, ArmorSlot, ArmorClassRequirement, Hairstyle, BaseBody } from '@/lib/forge';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


async function createNewSet(teacherUid: string, setName: string) {
    if (!setName.trim()) return { success: false, error: 'Set name cannot be empty.' };
    try {
        const setsRef = collection(db, 'teachers', teacherUid, 'armorSets');
        await addDoc(setsRef, { name: setName, createdAt: serverTimestamp() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- DIALOGS ---

const SetCreatorDialog = ({ isOpen, onOpenChange, teacherUid, onSetCreated }: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    teacherUid: string;
    onSetCreated: () => void;
}) => {
    const { toast } = useToast();
    const [setName, setSetName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await createNewSet(teacherUid, setName);
        if (result.success) {
            toast({ title: 'Set Created', description: `The set "${setName}" is now available.` });
            onSetCreated();
            onOpenChange(false);
            setSetName('');
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSaving(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Armor Set</DialogTitle>
                    <DialogDescription>Enter the name for a new armor set. You can assign pieces to this set in the editor.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="new-set-name">Set Name</Label>
                    <Input id="new-set-name" value={setName} onChange={e => setSetName(e.target.value)} placeholder="e.g., Dragonscale Armor" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !setName.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create Set
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const ArmorEditorDialog = ({ isOpen, onOpenChange, armor, teacherUid, onSave, existingSetNames }: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    armor: Partial<ArmorPiece> | null;
    teacherUid: string;
    onSave: () => void;
    existingSetNames: string[];
}) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<ArmorPiece>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState<'display' | 'modular' | 'modular2' | 'thumbnail' | 'modularMale' | 'modularFemale' | null>(null);
    
    useEffect(() => {
        if (isOpen) {
            setFormData(armor || {
                name: '', description: '', imageUrl: '', thumbnailUrl: '', modularImageUrl: '', modularImageUrlMale: '', modularImageUrlFemale: '', modularImageUrl2: '', slot: 'head',
                classRequirement: 'Any', levelRequirement: 1, goldCost: 0, isPublished: false, setName: ''
            });
        }
    }, [isOpen, armor]);

    const handleInputChange = (field: keyof ArmorPiece, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleSetChange = (value: string) => {
        const finalValue = value === '--none--' ? '' : value;
        handleInputChange('setName', finalValue);
    }

    const handleFileUpload = async (file: File | null, type: 'display' | 'modular' | 'modular2' | 'thumbnail' | 'modularMale' | 'modularFemale') => {
        if (!file || !teacherUid) return;
        setIsUploading(type);
        try {
            const storage = getStorage(app);
            const imageId = uuidv4();
            const storageRef = ref(storage, `armor-pieces/${teacherUid}/${imageId}_${type}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            
            let fieldToUpdate: keyof ArmorPiece;
            if (type === 'display') fieldToUpdate = 'imageUrl';
            else if (type === 'modular') fieldToUpdate = 'modularImageUrl';
            else if (type === 'modular2') fieldToUpdate = 'modularImageUrl2';
            else if (type === 'modularMale') fieldToUpdate = 'modularImageUrlMale';
            else if (type === 'modularFemale') fieldToUpdate = 'modularImageUrlFemale';
            else fieldToUpdate = 'thumbnailUrl';


            handleInputChange(fieldToUpdate, downloadUrl);
            toast({ title: `Image for ${type} uploaded.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(null);
        }
    };

    const handleSave = async () => {
        // Validation
        if (!formData.name || !formData.description || !formData.imageUrl || !formData.slot || !formData.classRequirement) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields.' });
            return;
        }

        if (formData.slot === 'chest' || formData.slot === 'legs') {
            if (!formData.modularImageUrlMale || !formData.modularImageUrlFemale) {
                 toast({ variant: 'destructive', title: 'Missing Fields', description: 'Chest and Leg armor require both a male and female modular image.' });
                 return;
            }
        } else if (!formData.modularImageUrl) {
             toast({ variant: 'destructive', title: 'Missing Fields', description: 'A primary modular overlay image is required for this armor slot.' });
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

    const showPairedUploader = formData.slot === 'hands' || formData.slot === 'feet';
    const needsGenderedUploader = formData.slot === 'chest' || formData.slot === 'legs';

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
                        <Label htmlFor="set-name">Set Name</Label>
                         <Select value={formData.setName || '--none--'} onValueChange={handleSetChange}>
                             <SelectTrigger><SelectValue placeholder="Select a set..."/></SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="--none--">None</SelectItem>
                                 {existingSetNames.map(name => (
                                     <SelectItem key={name} value={name}>{name}</SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
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
                        <Label>Thumbnail Image</Label>
                        <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, 'thumbnail')} disabled={isUploading === 'thumbnail'} />
                        {isUploading === 'thumbnail' && <Loader2 className="animate-spin" />}
                        {formData.thumbnailUrl && <NextImage src={formData.thumbnailUrl} alt="Thumbnail" width={80} height={80} className="rounded-md border" />}
                    </div>

                     {needsGenderedUploader ? (
                        <>
                            <div className="p-4 border rounded-md space-y-2">
                                <Label>Modular Overlay Image (Male)</Label>
                                <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, 'modularMale')} disabled={isUploading === 'modularMale'} />
                                {isUploading === 'modularMale' && <Loader2 className="animate-spin" />}
                                {formData.modularImageUrlMale && <NextImage src={formData.modularImageUrlMale} alt="Modular Male" width={80} height={80} className="rounded-md border" />}
                            </div>
                            <div className="p-4 border rounded-md space-y-2">
                                <Label>Modular Overlay Image (Female)</Label>
                                <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, 'modularFemale')} disabled={isUploading === 'modularFemale'} />
                                {isUploading === 'modularFemale' && <Loader2 className="animate-spin" />}
                                {formData.modularImageUrlFemale && <NextImage src={formData.modularImageUrlFemale} alt="Modular Female" width={80} height={80} className="rounded-md border" />}
                            </div>
                        </>
                     ) : (
                         <div className="p-4 border rounded-md space-y-2">
                            <Label>Modular Overlay Image (Primary)</Label>
                            <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, 'modular')} disabled={isUploading === 'modular'} />
                            {isUploading === 'modular' && <Loader2 className="animate-spin" />}
                            {formData.modularImageUrl && <NextImage src={formData.modularImageUrl} alt="Modular" width={80} height={80} className="rounded-md border" />}
                        </div>
                     )}
                    
                    {showPairedUploader && (
                        <div className="p-4 border rounded-md space-y-2 animate-in fade-in-50">
                            <Label>Modular Overlay Image (Secondary)</Label>
                            <p className="text-xs text-muted-foreground">For paired items like gloves or boots.</p>
                            <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, 'modular2')} disabled={isUploading === 'modular2'} />
                            {isUploading === 'modular2' && <Loader2 className="animate-spin" />}
                            {formData.modularImageUrl2 && <NextImage src={formData.modularImageUrl2} alt="Modular 2" width={80} height={80} className="rounded-md border" />}
                        </div>
                    )}


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
    const [formData, setFormData] = useState<Partial<Hairstyle>>({ styleName: '', baseImageUrl: '', thumbnailUrl: '', colors: [], transforms: {}, isPublished: false });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(hairstyle || { styleName: '', baseImageUrl: '', thumbnailUrl: '', colors: [], transforms: {}, isPublished: false });
        }
    }, [isOpen, hairstyle]);

    const handleInputChange = (field: keyof Hairstyle, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const removeColor = (index: number) => {
        const newColors = [...(formData.colors || [])];
        newColors.splice(index, 1);
        handleInputChange('colors', newColors);
    }
    
    const handleColorNameChange = (index: number, name: string) => {
        const newColors = [...(formData.colors || [])];
        newColors[index] = { ...newColors[index], name };
        handleInputChange('colors', newColors);
    }

    const handleFileUpload = async (files: FileList | null, type: 'base' | 'thumbnail' | 'color' | `color-thumbnail-${number}`, colorIndex?: number) => {
        if (!files || files.length === 0 || !teacherUid) return;
        
        const file = files[0];
        const uploadKey = `upload-${type}${colorIndex !== undefined ? `-${colorIndex}` : ''}`;
        setIsUploading(uploadKey);
        
        try {
            const storage = getStorage(app);
            const imageId = uuidv4();
            const storageRef = ref(storage, `hairstyles/${teacherUid}/${imageId}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            if (type === 'base') handleInputChange('baseImageUrl', downloadUrl);
            else if (type === 'thumbnail') handleInputChange('thumbnailUrl', downloadUrl);
            else if (type === 'color') {
                 setFormData(prev => ({...prev, colors: [...(prev.colors || []), { imageUrl: downloadUrl, name: 'New Color'}]}));
            } else if (type.startsWith('color-thumbnail-') && colorIndex !== undefined) {
                 const newColors = [...(formData.colors || [])];
                 newColors[colorIndex] = { ...newColors[colorIndex], thumbnailUrl: downloadUrl };
                 handleInputChange('colors', newColors);
            }

            toast({ title: "Upload successful." });
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
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{formData.id ? 'Edit' : 'Create'} Hairstyle</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="style-name">Style Name</Label>
                            <Input id="style-name" value={formData.styleName || ''} onChange={e => handleInputChange('styleName', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border rounded-md space-y-2">
                                <Label>Base Image (for Sizing)</Label>
                                <Input type="file" onChange={e => handleFileUpload(e.target.files, 'base')} disabled={isUploading === 'upload-base'} />
                                {isUploading === 'upload-base' && <Loader2 className="animate-spin" />}
                                {formData.baseImageUrl && <NextImage src={formData.baseImageUrl} alt="Base" width={80} height={80} className="rounded-md border bg-gray-200" />}
                            </div>
                            <div className="p-4 border rounded-md space-y-2">
                                <Label>Thumbnail Image (for List)</Label>
                                <Input type="file" onChange={e => handleFileUpload(e.target.files, 'thumbnail')} disabled={isUploading === 'upload-thumbnail'} />
                                {isUploading === 'upload-thumbnail' && <Loader2 className="animate-spin" />}
                                {formData.thumbnailUrl && <NextImage src={formData.thumbnailUrl} alt="Thumbnail" width={80} height={80} className="rounded-md border bg-gray-200" />}
                            </div>
                        </div>

                        <div className="p-4 border rounded-md space-y-4">
                            <h4 className="font-semibold">Color Variations</h4>
                            <div>
                                <Label htmlFor="color-upload" className={cn(buttonVariants({variant: 'outline'}), "cursor-pointer")}>
                                   <Upload className="h-4 w-4 mr-2"/> Upload New Color
                                </Label>
                                <Input id="color-upload" type="file" onChange={e => handleFileUpload(e.target.files, 'color')} className="hidden"/>
                            </div>
                            <div className="space-y-4">
                                {formData.colors?.map((color, index) => (
                                    <div key={index} className="flex items-start gap-4 p-2 border rounded-md">
                                        <div className="flex-shrink-0">
                                            <NextImage src={color.imageUrl} alt={`Color ${index + 1}`} width={100} height={100} className="rounded-md border bg-gray-200" />
                                        </div>
                                        <div className="flex-grow space-y-2">
                                            <Label htmlFor={`color-name-${index}`}>Color Name</Label>
                                            <Input id={`color-name-${index}`} value={color.name || ''} onChange={(e) => handleColorNameChange(index, e.target.value)} />
                                            <Label>Thumbnail</Label>
                                            <Input type="file" onChange={e => handleFileUpload(e.target.files, `color-thumbnail-${index}`, index)} />
                                            {color.thumbnailUrl && <NextImage src={color.thumbnailUrl} alt="Color Thumbnail" width={50} height={50} className="rounded-md border bg-gray-200" />}
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeColor(index)}><X className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
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

const BaseBodyEditorDialog = ({ isOpen, onOpenChange, body, onSave }: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    body: Partial<BaseBody> | null;
    onSave: () => void;
}) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<BaseBody>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState<'main' | 'thumbnail' | null>(null);
    const [teacher, setTeacher] = useState<User | null>(null);

    useEffect(() => {
        onAuthStateChanged(auth, user => user && setTeacher(user));
    }, []);

    useEffect(() => {
        if (isOpen) {
            setFormData(body || { name: '', order: 0, imageUrl: '', thumbnailUrl: '', gender: 'male' });
        }
    }, [isOpen, body]);

    const handleInputChange = (field: keyof BaseBody, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleFileUpload = async (file: File | null, type: 'main' | 'thumbnail') => {
        if (!file || !teacher) return;
        setIsUploading(type);
        try {
            const storage = getStorage(app);
            const imageId = uuidv4();
            const storageRef = ref(storage, `base-bodies/${teacher.uid}/${imageId}_${type}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            
            handleInputChange(type === 'main' ? 'imageUrl' : 'thumbnailUrl', downloadUrl);
            toast({ title: `Image for ${type} uploaded.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(null);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.imageUrl || !formData.thumbnailUrl || formData.order === undefined) {
            toast({ variant: 'destructive', title: 'Missing Fields' });
            return;
        }
        setIsSaving(true);
        try {
            const collectionRef = collection(db, 'baseBodies');
            const dataToSave = { ...formData, gender: formData.gender || 'male' };
            if (formData.id) {
                const docRef = doc(collectionRef, formData.id);
                await updateDoc(docRef, dataToSave);
            } else {
                await addDoc(collectionRef, { ...dataToSave, createdAt: serverTimestamp() });
            }
            toast({ title: formData.id ? 'Base Body Updated' : 'Base Body Created' });
            onSave();
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
                    <DialogTitle>{formData.id ? 'Edit' : 'Create'} Base Body</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="body-name">Name</Label>
                        <Input id="body-name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="body-order">Display Order</Label>
                        <Input id="body-order" type="number" value={formData.order ?? ''} onChange={e => handleInputChange('order', Number(e.target.value))} />
                    </div>
                     <div className="space-y-2">
                        <Label>Gender</Label>
                         <RadioGroup
                            value={formData.gender || 'male'}
                            onValueChange={(v) => handleInputChange('gender', v as 'male' | 'female')}
                            className="flex space-x-4"
                         >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="male" id="gender-male" />
                                <Label htmlFor="gender-male">Male</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="female" id="gender-female" />
                                <Label htmlFor="gender-female">Female</Label>
                            </div>
                        </RadioGroup>
                    </div>
                     <div className="p-4 border rounded-md space-y-2">
                        <Label>Main Image</Label>
                        <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, 'main')} disabled={isUploading === 'main'} />
                        {isUploading === 'main' && <Loader2 className="animate-spin" />}
                        {formData.imageUrl && <NextImage src={formData.imageUrl} alt="Main" width={80} height={80} className="rounded-md border bg-secondary" />}
                    </div>
                    <div className="p-4 border rounded-md space-y-2">
                        <Label>Thumbnail Image</Label>
                        <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0] || null, 'thumbnail')} disabled={isUploading === 'thumbnail'} />
                        {isUploading === 'thumbnail' && <Loader2 className="animate-spin" />}
                        {formData.thumbnailUrl && <NextImage src={formData.thumbnailUrl} alt="Thumbnail" width={80} height={80} className="rounded-md border bg-secondary" />}
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


// --- MAIN PAGE COMPONENT ---

export default function GlobalForgePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [armorPieces, setArmorPieces] = useState<ArmorPiece[]>([]);
    const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
    const [baseBodies, setBaseBodies] = useState<BaseBody[]>([]);
    const [armorSets, setArmorSets] = useState<{id: string, name: string}[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog state
    const [isArmorEditorOpen, setIsArmorEditorOpen] = useState(false);
    const [editingArmor, setEditingArmor] = useState<Partial<ArmorPiece> | null>(null);
    const [armorToDelete, setArmorToDelete] = useState<ArmorPiece | null>(null);
    const [isDeletingArmor, setIsDeletingArmor] = useState(false);
    
    // Set Creator Dialog
    const [isSetCreatorOpen, setIsSetCreatorOpen] = useState(false);

    // Hairstyle Dialog state
    const [isHairstyleEditorOpen, setIsHairstyleEditorOpen] = useState(false);
    const [editingHairstyle, setEditingHairstyle] = useState<Partial<Hairstyle> | null>(null);
    const [hairstyleToDelete, setHairstyleToDelete] = useState<Hairstyle | null>(null);
    const [isDeletingHairstyle, setIsDeletingHairstyle] = useState(false);

    // Base Body Dialog state
    const [isBodyEditorOpen, setIsBodyEditorOpen] = useState(false);
    const [editingBody, setEditingBody] = useState<Partial<BaseBody> | null>(null);
    const [bodyToDelete, setBodyToDelete] = useState<BaseBody | null>(null);
    const [isDeletingBody, setIsDeletingBody] = useState(false);

    const existingSetNames = useMemo(() => {
        return armorSets.map(s => s.name).sort((a, b) => a.localeCompare(b));
    }, [armorSets]);


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
        
        const createSnapshotListener = (collectionName: string, setter: Function, sortField?: string) => {
            const queryRef = sortField 
                ? query(collection(db, collectionName), orderBy(sortField))
                : collection(db, collectionName);
            return onSnapshot(queryRef, (snapshot) => {
                setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        };

        const unsubArmor = createSnapshotListener('armorPieces', setArmorPieces, 'createdAt');
        const unsubHairstyles = createSnapshotListener('hairstyles', setHairstyles, 'createdAt');
        const unsubBaseBodies = createSnapshotListener('baseBodies', setBaseBodies, 'order');
        
        const setsQuery = collection(db, 'teachers', user.uid, 'armorSets');
        const unsubSets = onSnapshot(setsQuery, (snapshot) => {
            setArmorSets(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
        });

        setIsLoading(false);

        return () => {
            unsubArmor();
            unsubHairstyles();
            unsubBaseBodies();
            unsubSets();
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

    // --- Base Body Functions ---
    const handleNewBody = () => { setEditingBody(null); setIsBodyEditorOpen(true); };
    const handleEditBody = (body: BaseBody) => { setEditingBody(body); setIsBodyEditorOpen(true); };
    const handleDeleteBody = async () => {
        if (!bodyToDelete) return;
        setIsDeletingBody(true);
        try {
            await deleteDoc(doc(db, 'baseBodies', bodyToDelete.id));
            toast({ title: 'Base Body Deleted' });
            setBodyToDelete(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeletingBody(false);
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
                existingSetNames={existingSetNames}
            />}
            {user && <SetCreatorDialog
                isOpen={isSetCreatorOpen}
                onOpenChange={setIsSetCreatorOpen}
                teacherUid={user.uid}
                onSetCreated={() => { /* Listener will update */}}
            />}
             {user && <HairstyleEditorDialog 
                isOpen={isHairstyleEditorOpen}
                onOpenChange={setIsHairstyleEditorOpen}
                hairstyle={editingHairstyle}
                teacherUid={user.uid}
            />}
             {user && <BaseBodyEditorDialog 
                isOpen={isBodyEditorOpen}
                onOpenChange={setIsBodyEditorOpen}
                body={editingBody}
                onSave={() => { /* Listener will update UI */}}
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
            <AlertDialog open={!!bodyToDelete} onOpenChange={() => setBodyToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete {bodyToDelete?.name}?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>This will permanently remove this base body. This cannot be undone.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBody} disabled={isDeletingBody} className="bg-destructive hover:bg-destructive/90">
                            {isDeletingBody && <Loader2 className="animate-spin mr-2" />} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="w-full max-w-7xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Admin Dashboard
                        </Button>
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader className="flex-row justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2"><Box className="text-blue-500"/> Base Body Management</CardTitle>
                                            <CardDescription>Manage the base models for characters.</CardDescription>
                                        </div>
                                        <Button size="sm" onClick={handleNewBody}><PlusCircle className="mr-2 h-4 w-4" /> Create Body</Button>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[30vh]">
                                        {isLoading ? (
                                            <Skeleton className="h-full" />
                                        ) : baseBodies.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-10">No base bodies created yet.</p>
                                        ) : (
                                             <div className="space-y-2">
                                                {baseBodies.map(body => (
                                                    <Card key={body.id} className="p-2 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <NextImage src={body.thumbnailUrl || ''} alt={body.name} width={40} height={40} className="bg-secondary rounded-md object-contain"/>
                                                            <span className="font-semibold">{body.name}</span>
                                                            <span className="text-xs text-muted-foreground capitalize">({body.gender || 'N/A'})</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditBody(body)}><Edit className="h-4 w-4"/></Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBodyToDelete(body)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex-row justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2"><Scissors className="text-pink-500"/> Hairstyle Management</CardTitle>
                                            <CardDescription>Manage hairstyle styles and color variations.</CardDescription>
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
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                                                                <NextImage src={style.thumbnailUrl || style.baseImageUrl || ''} alt={style.styleName} fill className="object-contain p-1" />
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
                            <div className="lg:col-span-1">
                               <Card>
                                    <CardHeader className="flex-row justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2"><Diamond className="text-primary"/> Armor Management</CardTitle>
                                            <CardDescription>Manage all armor pieces available in the game.</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={() => setIsSetCreatorOpen(true)} variant="secondary"><PlusCircle className="mr-2 h-4 w-4" /> Create Set</Button>
                                            <Button onClick={handleNewArmor}><PlusCircle className="mr-2 h-4 w-4" /> Create Armor</Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[105vh]">
                                        {isLoading ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Skeleton className="h-64" /> <Skeleton className="h-64" />
                                            </div>
                                        ) : armorPieces.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-10">The forge is empty. Create your first armor piece!</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
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
                                                                <NextImage src={piece.thumbnailUrl || piece.imageUrl || ''} alt={piece.name} fill className="object-contain p-1" />
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="flex-grow text-center space-y-1">
                                                            <p className="font-bold">{piece.name}</p>
                                                            {piece.setName && <p className="text-xs font-semibold text-primary">{piece.setName}</p>}
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
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}
