
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth, app } from '@/lib/firebase';
import type { Boon } from '@/lib/boons';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, Upload, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { updateBoon as saveBoonChanges } from '@/ai/flows/manage-boons';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';

export default function EditBoonPage() {
    const router = useRouter();
    const params = useParams();
    const boonId = params.id as string;
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Boon State
    const [boon, setBoon] = useState<Partial<Boon> | null>(null);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setTeacher(user);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!teacher || !boonId) return;

        const fetchBoon = async () => {
            setIsLoading(true);
            try {
                const boonRef = doc(db, 'teachers', teacher.uid, 'boons', boonId);
                const docSnap = await getDoc(boonRef);
                if (docSnap.exists()) {
                    setBoon({ id: docSnap.id, ...docSnap.data() } as Boon);
                } else {
                    toast({ variant: 'destructive', title: 'Not Found', description: 'This Reward does not exist.' });
                    router.push('/teacher/boons');
                }
            } catch (error) {
                console.error("Error fetching boon:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load Reward data.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchBoon();
    }, [teacher, boonId, router, toast]);

    const handleFileUpload = async (file: File | null, path: string) => {
        if (!file || !teacher) return null;
        setIsUploading(true);
        try {
            const storage = getStorage(app);
            const fileId = uuidv4();
            const storageRef = ref(storage, `${path}/${teacher.uid}/${fileId}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            return downloadUrl;
        } catch (error) {
            console.error(`Error uploading file to ${path}:`, error);
            toast({ variant: 'destructive', title: 'Upload Failed' });
            return null;
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleBoonChange = (field: keyof Boon, value: any) => {
        setBoon(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = async () => {
        if (!teacher || !boon?.id) return;
        if (!boon.name || boon.cost === undefined || boon.cost < 0 || !boon.imageUrl || !boon.description) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields.' });
            return;
        }

        setIsSaving(true);
        try {
            const boonToSave = {
                ...boon,
                effect: {
                    type: 'REAL_WORLD_PERK' as const,
                    value: boon.description,
                }
            };

            const result = await saveBoonChanges(teacher.uid, boonToSave as Boon);
            if (result.success) {
                toast({ title: 'Reward Updated!', description: `${boon.name} has been updated.` });
                router.push('/teacher/boons');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Error updating boon: ", error);
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                     <div className="max-w-2xl mx-auto space-y-6">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                </main>
            </div>
        )
    }
    
    if (!boon) return null; // Or a not found component

    return (
        <div 
            className="flex min-h-screen w-full flex-col bg-cover bg-center"
            style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2Fenvato-labs-ai-82960861-9a1e-4e31-9309-085a9b998ca6.jpg?alt=media&token=a15a8c71-faaa-4a38-bc17-b68dc83fba50')` }}
        >
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/boons')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Rewards
                    </Button>

                    <Card className="bg-card/90 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Star className="text-yellow-400"/> Edit Reward</CardTitle>
                            <CardDescription>Make changes to this Reward. Your changes will be reflected in the store.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Reward Name</Label>
                                <Input id="name" value={boon.name || ''} onChange={(e) => handleBoonChange('name', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" value={boon.description || ''} onChange={(e) => handleBoonChange('description', e.target.value)} placeholder="e.g., The student may chew gum in class for one day." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cost">Cost (in Gold)</Label>
                                <Input id="cost" type="number" value={boon.cost ?? ''} onChange={(e) => handleBoonChange('cost', Number(e.target.value))} />
                            </div>

                            <div className="space-y-2">
                                <Label>Reward Image</Label>
                                <div className="p-4 border rounded-md space-y-2">
                                    <Input type="file" accept="image/*" onChange={async e => {
                                        const file = e.target.files?.[0];
                                        const url = await handleFileUpload(file || null, 'boon-icons');
                                        if (url) handleBoonChange('imageUrl', url);
                                    }} disabled={isUploading} />
                                    {isUploading && <Loader2 className="h-4 w-4 animate-spin"/>}
                                    {boon.imageUrl && <Image src={boon.imageUrl} alt="Boon preview" width={100} height={100} className="rounded-md border"/>}
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 p-4 border rounded-md">
                                <Switch id="requires-approval" checked={boon.requiresApproval} onCheckedChange={(checked) => handleBoonChange('requiresApproval', checked)} />
                                <Label htmlFor="requires-approval">Require Approval?</Label>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="student-message">Student Message (Optional)</Label>
                                <Textarea id="student-message" value={boon.studentMessage || ''} onChange={(e) => handleBoonChange('studentMessage', e.target.value)} placeholder="A message shown to the student when they use this item." />
                            </div>

                             <div className="flex justify-end">
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </div>

                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
