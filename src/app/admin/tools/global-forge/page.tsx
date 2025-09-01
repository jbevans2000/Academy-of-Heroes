
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Diamond, Loader2, Upload, X, Save, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addArmorPiece } from '@/ai/flows/manage-forge';
import type { ArmorSlot, ArmorClassRequirement } from '@/lib/forge';
import { v4 as uuidv4 } from 'uuid';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';

export default function GlobalForgePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [slot, setSlot] = useState<ArmorSlot | ''>('');
    const [classRequirement, setClassRequirement] = useState<ArmorClassRequirement | ''>('');
    const [levelRequirement, setLevelRequirement] = useState<number | string>(1);
    const [goldCost, setGoldCost] = useState<number | string>(0);
    
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
    
    const handleImageUpload = async () => {
        if (!imageFile || !user) return;
        setIsUploading(true);
        try {
            const storage = getStorage(app);
            const imageId = uuidv4();
            const storageRef = ref(storage, `armor-pieces/${user.uid}/${imageId}`);
            await uploadBytes(storageRef, imageFile);
            const downloadUrl = await getDownloadURL(storageRef);
            setImageUrl(downloadUrl);
            toast({ title: 'Image Uploaded' });
        } catch (error) {
            console.error("Image upload error:", error);
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveArmor = async () => {
        if (!name || !description || !imageUrl || !slot || !classRequirement) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all fields before saving.' });
            return;
        }
        setIsSaving(true);
        try {
            const result = await addArmorPiece({
                name,
                description,
                imageUrl,
                slot,
                classRequirement,
                levelRequirement: Number(levelRequirement),
                goldCost: Number(goldCost)
            });

            if (result.success) {
                toast({ title: 'Armor Piece Created!', description: 'It can now be positioned in the Armor Sizer.' });
                router.push('/admin/dashboard');
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
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-2xl mx-auto space-y-6">
                     <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Admin Dashboard
                    </Button>
                    <Card className="shadow-2xl">
                        <CardHeader className="text-center">
                             <div className="flex justify-center mb-2">
                                <Diamond className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl">Global Forge: New Armor</CardTitle>
                            <CardDescription>
                                Create a new piece of armor that will be available for all classes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="armor-name">Armor Piece Name</Label>
                                <Input id="armor-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Helmet of the Valiant" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="armor-desc">Description</Label>
                                <Textarea id="armor-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief description of the item." />
                            </div>

                             <div className="space-y-2 p-4 border rounded-md">
                                <Label className="text-base font-medium">Armor Image</Label>
                                <div className="flex items-center gap-2">
                                  <Label htmlFor="image-upload" className={cn(buttonVariants({ variant: 'default' }), "cursor-pointer")}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Choose File
                                  </Label>
                                  <Input id="image-upload" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} className="hidden" disabled={isUploading}/>
                                  {imageFile && (
                                      <>
                                        <Button onClick={handleImageUpload} disabled={!imageFile || isUploading}>
                                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                            Upload Image
                                        </Button>
                                         <Button variant="ghost" size="icon" onClick={() => setImageFile(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                      </>
                                  )}
                                </div>
                                {imageUrl && <NextImage src={imageUrl} alt="Armor preview" width={100} height={100} className="rounded-md border bg-secondary mt-2" />}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="armor-slot">Armor Slot</Label>
                                    <Select value={slot} onValueChange={(v) => setSlot(v as ArmorSlot)}>
                                        <SelectTrigger><SelectValue placeholder="Select a slot..."/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="head">Head</SelectItem>
                                            <SelectItem value="shoulders">Shoulders</SelectItem>
                                            <SelectItem value="chest">Chest</SelectItem>
                                            <SelectItem value="hands">Hands</SelectItem>
                                            <SelectItem value="legs">Legs</SelectItem>
                                            <SelectItem value="feet">Feet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="class-req">Class Requirement</Label>
                                    <Select value={classRequirement} onValueChange={(v) => setClassRequirement(v as ArmorClassRequirement)}>
                                        <SelectTrigger><SelectValue placeholder="Select a class..."/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Any">Any</SelectItem>
                                            <SelectItem value="Guardian">Guardian</SelectItem>
                                            <SelectItem value="Healer">Healer</SelectItem>
                                            <SelectItem value="Mage">Mage</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="level-req">Level Requirement</Label>
                                    <Input id="level-req" type="number" value={levelRequirement} onChange={e => setLevelRequirement(e.target.value)} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="gold-cost">Gold Cost</Label>
                                    <Input id="gold-cost" type="number" value={goldCost} onChange={e => setGoldCost(e.target.value)} />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button size="lg" onClick={handleSaveArmor} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Create Armor Piece
                                </Button>
                            </div>

                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
