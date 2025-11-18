

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, Upload, Star } from 'lucide-react';
import { createBoon } from '@/ai/flows/manage-boons';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';

const defaultBoonImageUrl = 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2Fenvato-labs-ai-82960861-9a1e-4e31-9309-085a9b998ca6.jpg?alt=media&token=a15a8c71-faaa-4a38-bc17-b68dc83fba50';

export default function NewBoonPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Boon State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState<number | ''>('');
    const [levelRequirement, setLevelRequirement] = useState<number | ''>(1);
    const [imageUrl, setImageUrl] = useState('');
    const [requiresApproval, setRequiresApproval] = useState(false);
    const [studentMessage, setStudentMessage] = useState('');
    const [allowStudentInstructions, setAllowStudentInstructions] = useState(false);

    // Upload State
    const [imageFile, setImageFile] = useState<File | null>(null);
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

    const handleSave = async () => {
        if (!teacher) return;
        
        if (!name || cost === '' || !description) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields: Name, Description, and Cost.' });
            return;
        }

        setIsSaving(true);
        try {
            const finalImageUrl = imageUrl || defaultBoonImageUrl;

            const result = await createBoon(teacher.uid, {
                name,
                description,
                cost: Number(cost),
                levelRequirement: Number(levelRequirement) || 1,
                imageUrl: finalImageUrl,
                effect: {
                    type: 'REAL_WORLD_PERK',
                    value: description,
                },
                requiresApproval,
                studentMessage,
                allowStudentInstructions,
            });

            if (result.success) {
                toast({ title: 'Reward Created!', description: `${name} has been added to the store.` });
                router.push('/teacher/boons');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Error creating boon: ", error);
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

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
                            <CardTitle className="flex items-center gap-2"><Star className="text-yellow-400"/> Create New Reward</CardTitle>
                            <CardDescription>Fill in the details for the new item you want to add to your store.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Reward Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., A New View" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., The student may chew gum in class for one day." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cost">Cost (in Gold)</Label>
                                    <Input id="cost" type="number" value={cost} onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 500" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="levelRequirement">Minimum Level Required</Label>
                                    <Input id="levelRequirement" type="number" value={levelRequirement} onChange={(e) => setLevelRequirement(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 1" />
                                </div>
                            </div>

                             <div className="space-y-2">
                                <Label>Reward Image (Optional)</Label>
                                <div className="p-4 border rounded-md space-y-2">
                                    <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} disabled={isUploading} />
                                    <Button onClick={async () => {
                                        const url = await handleFileUpload(imageFile, 'boon-icons');
                                        if (url) setImageUrl(url);
                                    }} disabled={isUploading || !imageFile}>
                                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                                        Upload Image
                                    </Button>
                                    <p className="text-xs text-muted-foreground">If no image is uploaded, a default icon will be used.</p>
                                    {(imageUrl || defaultBoonImageUrl) && <Image src={imageUrl || defaultBoonImageUrl} alt="Boon preview" width={100} height={100} className="rounded-md border"/>}
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 p-4 border rounded-md">
                                <Switch id="requires-approval" checked={requiresApproval} onCheckedChange={setRequiresApproval} />
                                <Label htmlFor="requires-approval">Require Approval?</Label>
                            </div>
                             <div className="flex items-center space-x-2 p-4 border rounded-md">
                                <Switch id="allow-student-instructions" checked={allowStudentInstructions} onCheckedChange={setAllowStudentInstructions} />
                                <Label htmlFor="allow-student-instructions">Allow Student Instructions?</Label>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="student-message">Student Message (Optional)</Label>
                                <Textarea id="student-message" value={studentMessage} onChange={(e) => setStudentMessage(e.target.value)} placeholder="A message shown to the student when they use this item." />
                            </div>

                             <div className="flex justify-end">
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                    Create Reward
                                </Button>
                            </div>

                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
