
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save, Upload, X, Library, Star, Coins } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuestHub } from '@/lib/quests';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { MapGallery } from '@/components/teacher/map-gallery';
import { Switch } from '@/components/ui/switch';

const defaultWorldMap = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FWorld%20Map.JPG?alt=media&token=2d88af7d-a54c-4f34-b4c7-1a7c04485b8b";

const ImageUploader = ({ label, imageUrl, onUploadSuccess, teacherUid, storagePath, onGalleryOpen }: {
  label: string;
  imageUrl: string;
  onUploadSuccess: (url: string) => void;
  teacherUid: string;
  storagePath: string;
  onGalleryOpen?: () => void;
}) => {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async () => {
        if (!file || !teacherUid) {
            toast({ variant: 'destructive', title: 'No File Selected' });
            return;
        }
        setIsUploading(true);
        try {
            const storage = getStorage(app);
            const imageId = uuidv4();
            const fullStoragePath = `${storagePath}/${teacherUid}/${imageId}`;
            const storageRef = ref(storage, fullStoragePath);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            onUploadSuccess(downloadUrl);
            toast({ title: 'Upload Successful!', description: `${label} image has been updated.` });
        } catch (error) {
            console.error("Error uploading image:", error);
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
            setFile(null);
        }
    };

    return (
        <div className="space-y-2 p-3 border rounded-md">
            <Label className="text-base font-medium">{label}</Label>
            <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor={`upload-${label}`} className={cn(buttonVariants({ variant: 'outline' }), "cursor-pointer")}>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                </Label>
                <Input id={`upload-${label}`} type="file" accept="image/*" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="hidden" disabled={isUploading}/>
                {onGalleryOpen && (
                     <Button variant="outline" onClick={onGalleryOpen}>
                        <Library className="mr-2 h-4 w-4" /> Choose From Library
                    </Button>
                )}
                {file && (
                    <>
                        <Button onClick={handleUpload} disabled={!file || isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Upload
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="h-4 w-4" /></Button>
                    </>
                )}
            </div>
            {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
            {imageUrl && (
                <div className="mt-2">
                    <Image src={imageUrl} alt={`${label} preview`} width={200} height={100} className="rounded-md object-contain border bg-secondary" />
                </div>
            )}
        </div>
    );
};


export default function EditQuestHubPage() {
    const router = useRouter();
    const params = useParams();
    const hubId = params.id as string;
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [teacher, setTeacher] = useState<User | null>(null);
    const [teacherWorldMapUrl, setTeacherWorldMapUrl] = useState(defaultWorldMap);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    
    // Hub State
    const [hub, setHub] = useState<Partial<QuestHub> | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                setTeacher(user);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    // Fetch Hub data and teacher's world map
    useEffect(() => {
        if (!hubId || !teacher) return;
        const fetchHubData = async () => {
            setIsLoading(true);
            try {
                const hubRef = doc(db, 'teachers', teacher.uid, 'questHubs', hubId);
                const hubSnap = await getDoc(hubRef);

                if (hubSnap.exists()) {
                    setHub({ id: hubSnap.id, ...hubSnap.data() });
                } else {
                    toast({ variant: 'destructive', title: 'Not Found', description: 'This hub could not be found.' });
                    router.push('/teacher/quests');
                }

                const teacherRef = doc(db, 'teachers', teacher.uid);
                const teacherSnap = await getDoc(teacherRef);
                if (teacherSnap.exists() && teacherSnap.data().worldMapUrl) {
                    setTeacherWorldMapUrl(teacherSnap.data().worldMapUrl);
                }

            } catch (error) {
                console.error("Error fetching hub data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load hub data.' });
            } finally {
                setIsLoading(false);
            }
        }
        fetchHubData();
    }, [hubId, router, toast, teacher]);

    const handleFieldChange = (field: keyof QuestHub, value: any) => {
        setHub(prev => prev ? ({ ...prev, [field]: value }) : null);
    }
    
    const handleMapDrag = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const map = e.currentTarget;
        const rect = map.getBoundingClientRect();

        const updatePosition = (moveEvent: MouseEvent) => {
            const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
            handleFieldChange('coordinates', { x, y });
        };

        const stopDragging = () => {
            document.removeEventListener('mousemove', updatePosition);
            document.removeEventListener('mouseup', stopDragging);
        };

        document.addEventListener('mousemove', updatePosition);
        document.addEventListener('mouseup', stopDragging);
    };

    const handleSaveChanges = async () => {
        if (!hub?.name || hub?.hubOrder === undefined || !teacher || !hub.id) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Hub name and order are required.' });
            return;
        }
        setIsSaving(true);
        try {
            const hubRef = doc(db, 'teachers', teacher.uid, 'questHubs', hub.id);
            const dataToSave = {
                name: hub.name,
                hubOrder: hub.hubOrder,
                worldMapUrl: hub.worldMapUrl,
                coordinates: hub.coordinates,
                areRewardsEnabled: hub.areRewardsEnabled ?? false,
                rewardXp: hub.rewardXp ?? 0,
                rewardGold: hub.rewardGold ?? 0,
            };

            await updateDoc(hubRef, dataToSave);
            toast({ title: 'Hub Updated!', description: 'Your changes have been saved.' });
            router.push('/teacher/quests');
        } catch (error) {
            console.error("Error updating hub:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update the hub.' });
        } finally {
            setIsSaving(false);
        }
    }
    
    if (isLoading || !hub || !teacher) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <>
            <MapGallery isOpen={isGalleryOpen} onOpenChange={setIsGalleryOpen} onMapSelect={(url) => handleFieldChange('worldMapUrl', url)} />
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/teacher/quests')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quest Archives
                        </Button>
                        <Card>
                            <CardHeader>
                                <CardTitle>Edit Quest Hub</CardTitle>
                                <CardDescription>Modify the details for "{hub.name}".</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="hub-name">Hub Name</Label>
                                    <Input id="hub-name" value={hub.name || ''} onChange={(e) => handleFieldChange('name', e.target.value)} disabled={isSaving} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hub-order">Hub Order</Label>
                                    <Input id="hub-order" type="number" value={hub.hubOrder ?? ''} onChange={(e) => handleFieldChange('hubOrder', Number(e.target.value))} disabled={isSaving} />
                                </div>
                                
                                <ImageUploader 
                                    label="Hub's Regional Map" 
                                    imageUrl={hub.worldMapUrl || ''} 
                                    onUploadSuccess={(url) => handleFieldChange('worldMapUrl', url)} 
                                    teacherUid={teacher.uid}
                                    storagePath="hub-maps"
                                    onGalleryOpen={() => setIsGalleryOpen(true)}
                                />

                                <div className="pt-4 space-y-2">
                                    <Label>Position Hub on World Map</Label>
                                    <div 
                                        className="relative aspect-[2048/1536] rounded-lg overflow-hidden bg-muted/50 border cursor-grab"
                                        onMouseDown={(e) => handleMapDrag(e)}
                                    >
                                        <Image
                                            src={teacherWorldMapUrl}
                                            alt="World Map for Placement"
                                            fill
                                            className="object-contain"
                                            priority
                                        />
                                        {hub.coordinates && (
                                            <div
                                                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grabbing"
                                                style={{
                                                    left: `${hub.coordinates.x}%`,
                                                    top: `${hub.coordinates.y}%`,
                                                }}
                                            >
                                                <div className="w-5 h-5 bg-yellow-400 rounded-full ring-2 ring-white shadow-xl animate-pulse-glow"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <Card className="bg-secondary/50">
                                    <CardHeader>
                                        <CardTitle>Chapter Completion Rewards</CardTitle>
                                        <CardDescription>Optionally award XP and Gold to students for completing any chapter within this hub.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Switch 
                                                id="enable-rewards" 
                                                checked={hub.areRewardsEnabled} 
                                                onCheckedChange={(checked) => handleFieldChange('areRewardsEnabled', checked)} 
                                            />
                                            <Label htmlFor="enable-rewards">Enable Rewards for this Hub</Label>
                                        </div>

                                        {hub.areRewardsEnabled && (
                                            <div className="grid grid-cols-2 gap-4 animate-in fade-in-50">
                                                <div className="space-y-2">
                                                    <Label htmlFor="reward-xp" className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400" /> XP Reward</Label>
                                                    <Input id="reward-xp" type="number" value={hub.rewardXp ?? ''} onChange={(e) => handleFieldChange('rewardXp', Number(e.target.value))} placeholder="e.g., 25" />
                                                </div>
                                                <div className="space-y-2">
                                                     <Label htmlFor="reward-gold" className="flex items-center gap-1"><Coins className="h-4 w-4 text-amber-500" /> Gold Reward</Label>
                                                    <Input id="reward-gold" type="number" value={hub.rewardGold ?? ''} onChange={(e) => handleFieldChange('rewardGold', Number(e.target.value))} placeholder="e.g., 10" />
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="flex justify-end pt-4 border-t">
                                    <Button size="lg" onClick={handleSaveChanges} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </>
    )
}
