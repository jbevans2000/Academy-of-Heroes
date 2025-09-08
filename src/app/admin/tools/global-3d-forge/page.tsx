
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import { collection, onSnapshot, doc, getDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Upload, Box, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ArmorPiece, Hairstyle, BaseBody } from '@/lib/forge';
import { v4 as uuidv4 } from 'uuid';
import NextImage from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const AssetUploader = ({ asset, collectionName, onUploadSuccess }: { asset: (ArmorPiece | Hairstyle | BaseBody) & { id: string }, collectionName: string, onUploadSuccess: () => void }) => {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [teacher, setTeacher] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if(user) setTeacher(user);
        });
        return () => unsubscribe();
    }, []);

    const handleUpload = async () => {
        if (!file || !teacher) {
            toast({ variant: 'destructive', title: 'Error', description: 'No file selected or user not authenticated.' });
            return;
        }
        setIsUploading(true);
        try {
            const storage = getStorage(app);
            // Use a more specific path to avoid collisions
            const storagePath = `${collectionName}-models/${teacher.uid}/${asset.id}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            const metadata = { contentType: 'model/gltf-binary' };

            await uploadBytes(storageRef, file, metadata);
            const downloadUrl = await getDownloadURL(storageRef);

            const docRef = doc(db, collectionName, asset.id);
            await updateDoc(docRef, { modelUrl: downloadUrl });

            toast({ title: 'Upload Successful', description: `3D model for ${'styleName' in asset ? asset.styleName : asset.name} has been updated.` });
            setFile(null);
            onUploadSuccess();
        } catch (error) {
            console.error("Error uploading 3D model:", error);
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {'modelUrl' in asset && asset.modelUrl && !file && (
                 <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5"/>
                    <span>Model Uploaded</span>
                </div>
            )}
            <Input id={`upload-${asset.id}`} type="file" accept=".glb" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="flex-grow text-xs" />
            <Button size="sm" onClick={handleUpload} disabled={!file || isUploading}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
            </Button>
        </div>
    )
}

export default function Global3DForgePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [armorPieces, setArmorPieces] = useState<ArmorPiece[]>([]);
    const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
    const [baseBodies, setBaseBodies] = useState<BaseBody[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

        const unsubArmor = onSnapshot(collection(db, 'armorPieces'), (snapshot) => {
            setArmorPieces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece)));
        });
        
        const unsubHairstyles = onSnapshot(collection(db, 'hairstyles'), (snapshot) => {
            setHairstyles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle)));
        });

        // Now fetch base bodies from Firestore
        const unsubBaseBodies = onSnapshot(query(collection(db, 'baseBodies'), orderBy('order')), (snapshot) => {
            setBaseBodies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseBody)));
            setIsLoading(false);
        });

        return () => {
            unsubArmor();
            unsubHairstyles();
            unsubBaseBodies();
        };
    }, [user]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Admin Dashboard
                    </Button>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Box className="text-primary"/> Global 3D Forge</CardTitle>
                            <CardDescription>Upload and manage `.glb` 3D models for all corresponding 2D assets.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="armor">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="armor">Armor</TabsTrigger>
                                    <TabsTrigger value="hairstyles">Hairstyles</TabsTrigger>
                                    <TabsTrigger value="bodies">Base Bodies</TabsTrigger>
                                </TabsList>

                                <TabsContent value="armor">
                                    <ScrollArea className="h-[60vh] mt-4">
                                        <div className="space-y-4 pr-4">
                                            {isLoading && <Skeleton className="h-24 w-full" />}
                                            {armorPieces.map(piece => (
                                                <Card key={piece.id} className="p-4 grid grid-cols-3 items-center gap-4">
                                                    <div className="flex items-center gap-4 col-span-1">
                                                        <NextImage src={piece.thumbnailUrl || piece.imageUrl} alt={piece.name} width={40} height={40} className="rounded-md bg-secondary"/>
                                                        <span className="font-semibold">{piece.name}</span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <AssetUploader asset={piece} collectionName="armorPieces" onUploadSuccess={() => {}} />
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                                <TabsContent value="hairstyles">
                                     <ScrollArea className="h-[60vh] mt-4">
                                        <div className="space-y-4 pr-4">
                                            {isLoading && <Skeleton className="h-24 w-full" />}
                                            {hairstyles.map(style => (
                                                <Card key={style.id} className="p-4 grid grid-cols-3 items-center gap-4">
                                                    <div className="flex items-center gap-4 col-span-1">
                                                        <NextImage src={style.thumbnailUrl || style.baseImageUrl} alt={style.styleName} width={40} height={40} className="rounded-md bg-secondary"/>
                                                        <span className="font-semibold">{style.styleName}</span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <AssetUploader asset={style} collectionName="hairstyles" onUploadSuccess={() => {}} />
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                                <TabsContent value="bodies">
                                     <ScrollArea className="h-[60vh] mt-4">
                                        <div className="space-y-4 pr-4">
                                            {baseBodies.map(body => (
                                                 <Card key={body.id} className="p-4 grid grid-cols-3 items-center gap-4">
                                                    <div className="flex items-center gap-4 col-span-1">
                                                        <NextImage src={body.thumbnailUrl} alt={body.name} width={40} height={40} className="rounded-md bg-secondary"/>
                                                        <span className="font-semibold">{body.name}</span>
                                                    </div>
                                                    <div className="col-span-2">
                                                         <AssetUploader asset={body} collectionName="baseBodies" onUploadSuccess={() => {}} />
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
