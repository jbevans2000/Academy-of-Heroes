
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db, app } from '@/lib/firebase';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Sparkles, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findTeacherForStudent } from '@/lib/utils';
import { generateImage } from '@/ai/flows/image-generator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

export default function AvatarGeneratorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Generator State
  const [gender, setGender] = useState('');
  const [hairStyle, setHairStyle] = useState('');
  const [hairColor, setHairColor] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [details, setDetails] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const foundTeacherUid = await findTeacherForStudent(currentUser.uid);
        if (foundTeacherUid) {
            setTeacherUid(foundTeacherUid);
        }
      } else {
        router.push('/');
      }
      setIsPageLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleGenerate = async () => {
    if (!gender || !hairStyle || !hairColor || !eyeColor) {
      toast({
        variant: 'destructive',
        title: 'Missing Details',
        description: 'Please select gender, hair style, hair color, and eye color.',
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImageUrl('');

    const prompt = `Fantasy RPG avatar portrait, ${gender}, ${hairStyle} ${hairColor} hair, ${eyeColor} eyes, ${details}`;
    
    try {
      const dataUri = await generateImage({ prompt });
      setGeneratedImageUrl(dataUri);
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'The AI artist could not complete your commission. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSetAvatar = async () => {
    if (!generatedImageUrl || !user || !teacherUid) return;

    setIsLoading(true);
    try {
      const storage = getStorage(app);
      const filePath = `avatars/${user.uid}/avatar.png`;
      const storageRef = ref(storage, filePath);

      await uploadString(storageRef, generatedImageUrl, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);

      const studentDocRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
      await updateDoc(studentDocRef, {
        avatarUrl: downloadUrl,
      });

      toast({
        title: 'Avatar Set!',
        description: 'Your new hero portrait has been saved.',
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error setting avatar:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the new avatar.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
        <DashboardHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center bg-muted/40">
            <div className="w-full max-w-4xl space-y-4">
                 <Button variant="outline" onClick={() => router.push('/dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>
                <Card className="shadow-lg">
                    <CardHeader className="text-center">
                        <Sparkles className="h-12 w-12 mx-auto text-primary" />
                        <CardTitle className="text-2xl">AI Avatar Generator</CardTitle>
                        <CardDescription>Describe your hero and let the AI artist bring them to life!</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select onValueChange={setGender} value={gender}>
                                    <SelectTrigger><SelectValue placeholder="Select Gender..."/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="non-binary">Non-binary</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Hair Style</Label>
                                <Select onValueChange={setHairStyle} value={hairStyle}>
                                    <SelectTrigger><SelectValue placeholder="Select Hair Style..."/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="short">Short</SelectItem>
                                        <SelectItem value="long">Long</SelectItem>
                                        <SelectItem value="ponytail">Ponytail</SelectItem>
                                        <SelectItem value="braided">Braided</SelectItem>
                                        <SelectItem value="bald">Bald</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label>Hair Color</Label>
                                <Select onValueChange={setHairColor} value={hairColor}>
                                    <SelectTrigger><SelectValue placeholder="Select Hair Color..."/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="black">Black</SelectItem>
                                        <SelectItem value="brown">Brown</SelectItem>
                                        <SelectItem value="blonde">Blonde</SelectItem>
                                        <SelectItem value="red">Red</SelectItem>
                                        <SelectItem value="white">White</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Eye Color</Label>
                                <Select onValueChange={setEyeColor} value={eyeColor}>
                                    <SelectTrigger><SelectValue placeholder="Select Eye Color..."/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="blue">Blue</SelectItem>
                                        <SelectItem value="green">Green</SelectItem>
                                        <SelectItem value="brown">Brown</SelectItem>
                                        <SelectItem value="hazel">Hazel</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="details">Additional Details (Optional)</Label>
                                <Input id="details" placeholder="e.g., smiling, wearing leather armor" value={details} onChange={(e) => setDetails(e.target.value)} />
                            </div>
                            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                Generate Portrait
                            </Button>
                        </div>
                        <div className="flex flex-col items-center justify-center space-y-4 p-4 border rounded-lg bg-secondary/50">
                            <div className="relative w-64 h-64 bg-background rounded-md flex items-center justify-center">
                               {isGenerating ? (
                                    <div className="text-center p-4">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                                        <p className="text-muted-foreground">The AI Artist is at work...</p>
                                    </div>
                               ) : generatedImageUrl ? (
                                    <Image src={generatedImageUrl} alt="Generated Avatar" layout="fill" className="object-cover rounded-md" />
                               ) : (
                                    <p className="text-muted-foreground text-center p-4">Your generated portrait will appear here.</p>
                               )}
                            </div>
                            <Button onClick={handleSetAvatar} disabled={isLoading || !generatedImageUrl} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save and Set as Avatar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    </div>
  );
}
