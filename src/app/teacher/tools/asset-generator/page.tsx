
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db, app } from '@/lib/firebase';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, ImageIcon, Copy, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateImage } from '@/ai/flows/image-generator';
import NextImage from 'next/image';
import { v4 as uuidv4 } from 'uuid';

export default function AssetGeneratorPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    const [isLoadingDummy, setIsLoadingDummy] = useState(false);
    const [isLoadingHit, setIsLoadingHit] = useState(false);
    const [isLoadingMiss, setIsLoadingMiss] = useState(false);

    const [dummyUrl, setDummyUrl] = useState('');
    const [hitUrl, setHitUrl] = useState('');
    const [missUrl, setMissUrl] = useState('');
    
    useState(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    });

    const handleGenerate = async (
        assetType: 'dummy' | 'hit' | 'miss',
        prompt: string,
        setLoading: (loading: boolean) => void,
        setUrl: (url: string) => void
    ) => {
        if (!user) return;
        setLoading(true);
        setUrl('');

        try {
            const dataUri = await generateImage({ prompt });
            const storage = getStorage(app);
            const imageId = uuidv4();
            const storageRef = ref(storage, `dev-assets/${user.uid}/${assetType}-${imageId}`);
            await uploadString(storageRef, dataUri, 'data_url');
            const downloadUrl = await getDownloadURL(storageRef);
            
            setUrl(downloadUrl);
            toast({ title: 'Asset Generated!', description: 'The image has been generated and saved to your storage.' });
        } catch (error) {
            console.error(`Error generating ${assetType}:`, error);
            toast({ variant: 'destructive', title: 'Generation Failed' });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        toast({ title: 'URL Copied!' });
    };

    const renderGeneratorCard = (
        title: string, 
        description: string, 
        prompt: string, 
        isLoading: boolean, 
        imageUrl: string, 
        onGenerate: () => void
    ) => (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={onGenerate} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Image
                </Button>
                {isLoading && (
                    <div className="flex justify-center items-center h-48 bg-muted rounded-md">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {imageUrl && !isLoading && (
                    <div className="space-y-2">
                        <NextImage src={imageUrl} alt={title} width={200} height={200} className="rounded-md border object-contain mx-auto" />
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                           <p className="text-sm truncate text-muted-foreground flex-grow">{imageUrl}</p>
                           <Button size="icon" variant="ghost" onClick={() => copyToClipboard(imageUrl)}>
                               <Copy className="h-4 w-4" />
                           </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="flex min-h-screen w-full flex-col">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Tools
                    </Button>
                    <Card>
                         <CardHeader>
                            <CardTitle className="text-2xl">Asset Generator</CardTitle>
                            <CardDescription>A temporary developer tool to create image assets for other features. Click to generate, then copy the resulting URL.</CardDescription>
                        </CardHeader>
                    </Card>

                    <div className="grid md:grid-cols-3 gap-6">
                        {renderGeneratorCard(
                            'Training Dummy',
                            'Generates the main training dummy image.',
                            'A medieval training dummy, made of wood and straw with simple armor, standing in a grassy training yard. Fantasy concept art, detailed.',
                            isLoadingDummy,
                            dummyUrl,
                            () => handleGenerate('dummy', 'A medieval training dummy, made of wood and straw with simple armor, standing in a grassy training yard. Fantasy concept art, detailed.', setIsLoadingDummy, setDummyUrl)
                        )}
                        {renderGeneratorCard(
                            '"HIT!" Graphic',
                            'Generates the success state overlay.',
                            'The word "HIT!" in a dynamic, impactful, fantasy-style comic book font. The letters should look like they are made of cracked stone, with a bright yellow glow emanating from the cracks. Transparent background.',
                            isLoadingHit,
                            hitUrl,
                            () => handleGenerate('hit', 'The word "HIT!" in a dynamic, impactful, fantasy-style comic book font. The letters should look like they are made of cracked stone, with a bright yellow glow emanating from the cracks. Transparent background.', setIsLoadingHit, setHitUrl)
                        )}
                        {renderGeneratorCard(
                            '"MISS!" Graphic',
                            'Generates the failure state overlay.',
                            'The word "MISS!" in a dynamic, swishing, fantasy-style comic book font. The letters should look like they are made of grey smoke or wind, suggesting a sword swing that cut through empty air. Transparent background.',
                            isLoadingMiss,
                            missUrl,
                            () => handleGenerate('miss', 'The word "MISS!" in a dynamic, swishing, fantasy-style comic book font. The letters should look like they are made of grey smoke or wind, suggesting a sword swing that cut through empty air. Transparent background.', setIsLoadingMiss, setMissUrl)
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
