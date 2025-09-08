
'use client';

import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth, app } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, onSnapshot, doc, getDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save, Box, Orbit, Scaling, Edit, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ArmorPiece, Hairstyle, BaseBody, HairstyleColor } from '@/lib/forge';
import NextImage from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { CharacterViewerFallback } from '@/components/dashboard/character-viewer-3d';
import { v4 as uuidv4 } from 'uuid';

const CharacterViewer3D = lazy(() => import('@/components/dashboard/character-viewer-3d').then(module => ({ default: module.CharacterViewer3D })));

export default function Global3DForgeSizerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Data State
    const [allArmor, setAllArmor] = useState<ArmorPiece[]>([]);
    const [allHairstyles, setAllHairstyles] = useState<Hairstyle[]>([]);
    const [allBodies, setAllBodies] = useState<BaseBody[]>([]);

    // UI & Equipment State
    const [selectedBody, setSelectedBody] = useState<BaseBody | null>(null);
    const [equippedArmor, setEquippedArmor] = useState<ArmorPiece[]>([]);
    const [equippedHairstyle, setEquippedHairstyle] = useState<Hairstyle | null>(null);
    const [activePiece, setActivePiece] = useState<ArmorPiece | Hairstyle | null>(null);
    const [isOrbitControlsEnabled, setIsOrbitControlsEnabled] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Transform State
    const [armorTransforms, setArmorTransforms] = useState<{ [id: string]: { scale: number; position: [number, number, number] } }>({});
    const [hairstyleTransform, setHairstyleTransform] = useState<{ scale: number; position: [number, number, number] } | null>(null);

    // Upload State
    const [assetToUploadFor, setAssetToUploadFor] = useState<{id: string, type: 'armor' | 'hair' | 'body' | 'hairColor', colorIndex?: number} | null>(null);
    const [glbFile, setGlbFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

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
            setAllArmor(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece)));
        });
        const unsubHairstyles = onSnapshot(collection(db, 'hairstyles'), (snapshot) => {
            setAllHairstyles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle)));
        });
        const unsubBaseBodies = onSnapshot(query(collection(db, 'baseBodies'), orderBy('order')), (snapshot) => {
            const bodies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseBody));
            setAllBodies(bodies);
            if (bodies.length > 0 && !selectedBody) {
                setSelectedBody(bodies[0]);
            }
            setIsLoading(false);
        });

        return () => { unsubArmor(); unsubHairstyles(); unsubBaseBodies(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Effect to load transforms when selections change
    useEffect(() => {
        if (!selectedBody) return;
        const newArmorTransforms: typeof armorTransforms = {};
        equippedArmor.forEach(piece => {
            newArmorTransforms[piece.id] = piece.transforms3D?.[selectedBody.id] || { scale: 1, position: [0, 0, 0] };
        });
        setArmorTransforms(newArmorTransforms);
        
        if (equippedHairstyle) {
            setHairstyleTransform(equippedHairstyle.transforms3D?.[selectedBody.id] || { scale: 1, position: [0, 0, 0] });
        } else {
            setHairstyleTransform(null);
        }
    }, [equippedArmor, equippedHairstyle, selectedBody]);


    const handleEquipArmor = (piece: ArmorPiece) => {
        setEquippedArmor(prev => {
            const isEquipped = prev.some(p => p.id === piece.id);
            if (isEquipped) {
                if (activePiece?.id === piece.id) setActivePiece(null);
                return prev.filter(p => p.id !== piece.id);
            }
            // Allow multiple pieces
            return [...prev, piece];
        });
    }

    const handleEquipHairstyle = (style: Hairstyle) => {
        if (equippedHairstyle?.id === style.id) {
            setEquippedHairstyle(null);
            if(activePiece?.id === style.id) setActivePiece(null);
        } else {
            setEquippedHairstyle(style);
        }
    }

    const handle3DTransformUpdate = (pieceId: string, position: [number, number, number]) => {
        if (equippedHairstyle?.id === pieceId) {
            setHairstyleTransform(prev => ({ ...(prev || { scale: 1, position: [0, 0, 0] }), position }));
        } else {
            setArmorTransforms(prev => ({
                ...prev,
                [pieceId]: { ...(prev[pieceId] || { scale: 1 }), position }
            }));
        }
    };
    
    const handle3DScaleChange = (value: number) => {
        if (!activePiece) return;
        if ('slot' in activePiece) { // Armor
            setArmorTransforms(prev => ({
                ...prev,
                [activePiece.id]: { ...(prev[activePiece.id] || { position: [0,0,0] }), scale: value }
            }));
        } else { // Hairstyle
            setHairstyleTransform(prev => ({ ...(prev || { position: [0,0,0], scale: 1 }), scale: value }));
        }
    };

    const handleSaveTransform = async () => {
        if (!user || !activePiece || !selectedBody) {
            toast({ variant: 'destructive', title: 'Error', description: 'No active piece or body selected.' });
            return;
        }
        setIsSaving(true);
        try {
            if ('slot' in activePiece) { // Armor
                const armorRef = doc(db, 'armorPieces', activePiece.id);
                const transformToSave = armorTransforms[activePiece.id];
                await updateDoc(armorRef, {
                    [`transforms3D.${selectedBody.id}`]: transformToSave
                });
            } else { // Hairstyle
                const hairRef = doc(db, 'hairstyles', activePiece.id);
                await updateDoc(hairRef, {
                     [`transforms3D.${selectedBody.id}`]: hairstyleTransform
                });
            }
            toast({ title: 'Transform Saved!', description: `The 3D position and scale for ${'styleName' in activePiece ? activePiece.styleName : activePiece.name} has been saved globally.` });
        } catch (error) {
            console.error("Error saving transform: ", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save transform to the database.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleModelUpload = async () => {
        if (!user || !glbFile || !assetToUploadFor) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select an asset and a .glb file.' });
            return;
        }
        setIsUploading(true);
        try {
            const { type, id, colorIndex } = assetToUploadFor;
            let path = '';
            let collectionName = '';
            let fieldName = 'modelUrl';
            let docRef;

            switch (type) {
                case 'armor':
                    path = 'armor-models';
                    collectionName = 'armorPieces';
                    docRef = doc(db, collectionName, id);
                    break;
                case 'hair':
                    path = 'hairstyle-models';
                    collectionName = 'hairstyles';
                    docRef = doc(db, collectionName, id);
                    break;
                case 'body':
                    path = 'basebody-models';
                    collectionName = 'baseBodies';
                    docRef = doc(db, collectionName, id);
                    break;
                case 'hairColor':
                    path = 'haircolor-models';
                    collectionName = 'hairstyles';
                    docRef = doc(db, collectionName, id);
                    const hairDoc = await getDoc(docRef);
                    if (!hairDoc.exists()) throw new Error("Hairstyle not found");
                    const hairData = hairDoc.data() as Hairstyle;
                    const newColors = [...hairData.colors];
                    if (colorIndex !== undefined && newColors[colorIndex]) {
                        // This will be handled differently after upload
                    } else {
                        throw new Error("Invalid color index");
                    }
                    break;
                default:
                    throw new Error("Invalid asset type for upload");
            }
            
            const glbRef = storageRef(storage, `${path}/${user.uid}/${uuidv4()}.glb`);
            const metadata = { contentType: 'model/gltf-binary' };
            await uploadBytes(glbRef, glbFile, metadata);
            const downloadUrl = await getDownloadURL(glbRef);

            if (type === 'hairColor') {
                const hairDoc = await getDoc(docRef);
                const hairData = hairDoc.data() as Hairstyle;
                const newColors = [...hairData.colors];
                newColors[colorIndex!].modelUrl = downloadUrl;
                await updateDoc(docRef, { colors: newColors });
            } else {
                await updateDoc(docRef, { [fieldName]: downloadUrl });
            }

            toast({ title: 'Model Uploaded!', description: `The 3D model for the selected asset has been saved.` });
            setAssetToUploadFor(null);
            setGlbFile(null);
        } catch (error: any) {
            console.error("Error uploading model:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload the 3D model.' });
        } finally {
            setIsUploading(false);
        }
    };

    const active3DScale = useMemo(() => {
        if (!activePiece) return 1;
        if ('slot' in activePiece) {
            return armorTransforms[activePiece.id]?.scale ?? 1;
        } else {
            return hairstyleTransform?.scale ?? 1;
        }
    }, [activePiece, armorTransforms, hairstyleTransform]);

    const bodyModelUrl = selectedBody?.modelUrl;
    
    const equippedHairColorModelUrl = useMemo(() => {
        if (!equippedHairstyle) return equippedHairstyle?.modelUrl;
        const color = equippedHairstyle.colors.find(c => c.imageUrl === student.equippedHairstyleColor);
        return color?.modelUrl || equippedHairstyle.modelUrl;
    }, [equippedHairstyle, student.equippedHairstyleColor]);
    
    const hairModelUrl = equippedHairColorModelUrl;


    const armorPiecesWithModels = useMemo(() => {
        return equippedArmor
            .filter(a => a.modelUrl)
            .map(a => ({ id: a.id, url: a.modelUrl! }));
    }, [equippedArmor]);
    
    const getSelectedAssetName = () => {
        if (!assetToUploadFor) return 'None';
        const { type, id, colorIndex } = assetToUploadFor;
        switch (type) {
            case 'armor': return allArmor.find(a => a.id === id)?.name;
            case 'hair': return allHairstyles.find(h => h.id === id)?.styleName;
            case 'body': return allBodies.find(b => b.id === id)?.name;
            case 'hairColor': 
                const hair = allHairstyles.find(h => h.id === id);
                if (hair && colorIndex !== undefined) {
                    return `${hair.styleName} - ${hair.colors[colorIndex].name}`;
                }
                return 'Unknown Color';
            default: return 'None';
        }
    }
    
    const student = useMemo(() => ({
        equippedHairstyleColor: equippedHairstyle?.colors[0]?.imageUrl
    }), [equippedHairstyle]);

    if (isLoading || !user) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin"/></div>
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-7xl mx-auto space-y-4">
                     <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Dashboard
                        </Button>
                        <h1 className="text-2xl font-bold">Global 3D Forge</h1>
                        <Button onClick={handleSaveTransform} disabled={isSaving || !activePiece}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Active Piece Transform
                        </Button>
                     </div>
                     <Card>
                        <CardHeader><CardTitle>Upload 3D Models (.glb)</CardTitle><CardDescription>Select an asset and upload its corresponding 3D model file.</CardDescription></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Tabs defaultValue="armor-upload">
                                <TabsList>
                                    <TabsTrigger value="armor-upload">Armor</TabsTrigger>
                                    <TabsTrigger value="hair-upload">Hairstyles</TabsTrigger>
                                    <TabsTrigger value="body-upload">Bodies</TabsTrigger>
                                    <TabsTrigger value="hair-color-upload">Hair Colors</TabsTrigger>
                                </TabsList>
                                <ScrollArea className="h-48 mt-2">
                                    <TabsContent value="armor-upload">
                                        {allArmor.map(piece => (
                                            <div key={piece.id} className={cn("p-2 my-1 rounded-md cursor-pointer", assetToUploadFor?.id === piece.id && 'bg-primary/20')} onClick={() => setAssetToUploadFor({id: piece.id, type: 'armor'})}>
                                                {piece.name} {piece.modelUrl && '✓'}
                                            </div>
                                        ))}
                                    </TabsContent>
                                    <TabsContent value="hair-upload">
                                         {allHairstyles.map(style => (
                                            <div key={style.id} className={cn("p-2 my-1 rounded-md cursor-pointer", assetToUploadFor?.id === style.id && 'bg-primary/20')} onClick={() => setAssetToUploadFor({id: style.id, type: 'hair'})}>
                                                {style.styleName} {style.modelUrl && '✓'}
                                            </div>
                                        ))}
                                    </TabsContent>
                                    <TabsContent value="body-upload">
                                        {allBodies.map(body => (
                                            <div key={body.id} className={cn("p-2 my-1 rounded-md cursor-pointer", assetToUploadFor?.id === body.id && 'bg-primary/20')} onClick={() => setAssetToUploadFor({id: body.id, type: 'body'})}>
                                                {body.name} {body.modelUrl && '✓'}
                                            </div>
                                        ))}
                                    </TabsContent>
                                    <TabsContent value="hair-color-upload">
                                        {allHairstyles.map(style => (
                                            <div key={style.id} className="p-2 my-1">
                                                <p className="font-semibold">{style.styleName}</p>
                                                {style.colors.map((color, index) => (
                                                    <div key={`${style.id}-${index}`} className={cn("p-2 my-1 ml-4 rounded-md cursor-pointer", assetToUploadFor?.id === style.id && assetToUploadFor?.colorIndex === index && 'bg-primary/20')} onClick={() => setAssetToUploadFor({id: style.id, type: 'hairColor', colorIndex: index})}>
                                                        {color.name} {color.modelUrl && '✓'}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </TabsContent>
                                </ScrollArea>
                            </Tabs>
                            <div className="space-y-2">
                                <Label>Selected Asset: <span className="font-bold">{getSelectedAssetName()}</span></Label>
                                <Input type="file" accept=".glb" onChange={(e) => setGlbFile(e.target.files ? e.target.files[0] : null)} disabled={isUploading || !assetToUploadFor}/>
                                <Button onClick={handleModelUpload} disabled={isUploading || !glbFile || !assetToUploadFor}>
                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />} Upload & Save Model
                                </Button>
                            </div>
                        </CardContent>
                     </Card>
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-3 space-y-4">
                            {/* Library of assets */}
                            <Card>
                                <CardHeader><CardTitle>Base Bodies</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-3 gap-2">
                                    {allBodies.map(body => (
                                        <div key={body.id} className={cn("border p-1 rounded-md cursor-pointer hover:border-primary", selectedBody?.id === body.id && "border-primary ring-2 ring-primary")} onClick={() => setSelectedBody(body)}>
                                            <NextImage src={body.thumbnailUrl} alt={body.name} width={100} height={100} className="w-full h-auto object-contain bg-gray-200 rounded-sm" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                            <Tabs defaultValue="armor" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="armor">Armor</TabsTrigger>
                                    <TabsTrigger value="hairstyles">Hairstyles</TabsTrigger>
                                </TabsList>
                                <ScrollArea className="h-[55vh] mt-2">
                                    <TabsContent value="armor" className="p-1">
                                        <div className="grid grid-cols-3 gap-2">
                                            {allArmor.map(piece => (
                                                <div key={piece.id} className={cn("border p-1 rounded-md cursor-pointer hover:border-primary", equippedArmor.some(p => p.id === piece.id) && "border-primary ring-2 ring-primary")} onClick={() => handleEquipArmor(piece)}>
                                                    <NextImage src={piece.thumbnailUrl || piece.imageUrl} alt={piece.name} width={100} height={100} className="w-full h-auto object-contain bg-gray-200 rounded-sm" />
                                                    <p className="text-xs text-center mt-1 truncate">{piece.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="hairstyles" className="p-1">
                                         <div className="grid grid-cols-3 gap-2">
                                            {allHairstyles.map(style => (
                                                <div key={style.id} className={cn("border p-1 rounded-md cursor-pointer hover:border-primary", equippedHairstyle?.id === style.id && "border-primary ring-2 ring-primary")} onClick={() => handleEquipHairstyle(style)}>
                                                    <NextImage src={style.thumbnailUrl || style.baseImageUrl} alt={style.styleName} width={100} height={100} className="w-full h-auto object-contain bg-gray-200 rounded-sm" />
                                                    <p className="text-xs text-center mt-1 truncate">{style.styleName}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                </ScrollArea>
                            </Tabs>
                        </div>
                        <div className="lg:col-span-9 relative">
                            <div className="relative w-full aspect-square bg-gray-700 rounded-lg">
                                <Suspense fallback={<CharacterViewerFallback />}>
                                    <CharacterViewer3D 
                                        bodyUrl={bodyModelUrl}
                                        armorPieces={armorPiecesWithModels}
                                        hairUrl={hairModelUrl}
                                        hairId={equippedHairstyle?.id}
                                        armorTransforms={armorTransforms}
                                        hairTransform={hairstyleTransform}
                                        onTransformUpdate={handle3DTransformUpdate}
                                        activePieceId={activePiece?.id || null}
                                        onPieceClick={setActivePiece}
                                        isOrbitControlsEnabled={isOrbitControlsEnabled}
                                    />
                                </Suspense>
                            </div>
                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle>Controls</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Label htmlFor="orbit-controls" className="flex items-center gap-1 cursor-pointer"><Orbit className="h-4 w-4"/> Rotate</Label>
                                        <Switch id="orbit-controls" checked={isOrbitControlsEnabled} onCheckedChange={setIsOrbitControlsEnabled} />
                                    </div>
                                    {activePiece ? (
                                        <div className="space-y-2 animate-in fade-in-50">
                                            <p>Editing: <span className="font-bold text-primary">{'styleName' in activePiece ? activePiece.styleName : activePiece.name}</span></p>
                                            <Label htmlFor="3d-scale" className="flex items-center gap-1"><Scaling className="h-4 w-4"/> 3D Scale: {active3DScale.toFixed(2)}x</Label>
                                            <Slider id="3d-scale" value={[active3DScale]} onValueChange={([val]) => handle3DScaleChange(val)} min={0.1} max={3} step={0.01}/>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Click a model in the viewer to select it for editing.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                     </div>
                </div>
            </main>
        </div>
    );
}
