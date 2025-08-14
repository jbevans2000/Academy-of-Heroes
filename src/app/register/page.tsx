
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Heart, Wand, User, KeyRound, Star, Eye } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type ClassType = 'Guardian' | 'Healer' | 'Mage' | '';

const classData = {
  Guardian: {
    avatars: [
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%201%20(Level%201%20Guardian%20Images).png?alt=media&token=1d82ab1e-9631-4d14-8cac-91c943758b9f',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%202%20(Level%201%20Guardian%20Images).png?alt=media&token=b4d5ba45-2a57-446d-86d6-4183ba231104',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%203%20(Level%201%20Guardian%20Images).png?alt=media&token=dfc45b89-dbd0-4fbd-90ad-d5632cb130ee',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%204%20(Level%201%20Guardian%20Images).png?alt=media&token=d526181b-f8fb-42b6-80a5-ae101d7e63b5',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%205%20(Level%201%20Guardian%20Images).png?alt=media&token=5dbf4c82-f529-4e40-9a95-6ab0de2354da',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%207%20(Level%201%20Guardian%20Images).png?alt=media&token=cbb6584f-f732-4bc5-a538-9ccc08dabef2',
      'https://firebasestorage.googleapis.com/v0/b/classcraft-c7d14.firebasestorage.app/o/Guardian%20Images%2FTrickster%208%20(Level%201%20Guardian%20Images).png?alt=media&token=f33d3ca1-a917-4920-bd81-b55141969354',
      `https://placehold.co/256x256/3498db/ffffff?text=Guardian+8`
    ],
    backgrounds: Array.from({ length: 6 }, (_, i) => `https://placehold.co/800x600/3498db/ffffff?text=BG+${i + 1}`),
  },
  Healer: {
    avatars: Array.from({ length: 8 }, (_, i) => `https://placehold.co/256x256/2ecc71/ffffff?text=Healer+${i + 1}`),
    backgrounds: Array.from({ length: 6 }, (_, i) => `https://placehold.co/800x600/2ecc71/ffffff?text=BG+${i + 1}`),
  },
  Mage: {
    avatars: Array.from({ length: 8 }, (_, i) => `https://placehold.co/256x256/9b59b6/ffffff?text=Mage+${i + 1}`),
    backgrounds: Array.from({ length: 6 }, (_, i) => `https://placehold.co/800x600/9b59b6/ffffff?text=BG+${i + 1}`),
  },
};

export default function RegisterPage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!studentId || !password || !studentName || !characterName || !selectedClass || !selectedAvatar || !selectedBackground) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill out all fields and make your selections.',
      });
      return;
    }
    setIsLoading(true);
    const email = `${studentId}@academy-heroes-mziuf.firebaseapp.com`;

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Here you would typically save the rest of the user data (name, class, avatar, etc.) to a database like Firestore.
      toast({
        title: 'Account Created!',
        description: "Welcome to Luminaria! Your adventure begins now.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'This Student ID is already registered.'
            : 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClassChange = (value: string) => {
    const classValue = value as ClassType;
    setSelectedClass(classValue);
    setSelectedAvatar(null);
    setSelectedBackground(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Create Your Hero</CardTitle>
          <CardDescription>Fill in your details and choose your path to begin your adventure in Luminaria.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
          {/* Left Column: Form Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class" className="flex items-center"><Wand className="w-4 h-4 mr-2" />Select Your Class</Label>
              <Select onValueChange={handleClassChange} disabled={isLoading} value={selectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your destiny" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Guardian"><Shield className="w-4 h-4 mr-2" />Guardian</SelectItem>
                  <SelectItem value="Healer"><Heart className="w-4 h-4 mr-2" />Healer</SelectItem>
                  <SelectItem value="Mage"><Wand className="w-4 h-4 mr-2" />Mage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-id" className="flex items-center"><KeyRound className="w-4 h-4 mr-2" />Student ID</Label>
              <Input id="student-id" placeholder="Your school ID number" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center"><Eye className="w-4 h-4 mr-2" />Password</Label>
              <Input id="password" type="password" placeholder="Choose a secure password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-name" className="flex items-center"><User className="w-4 h-4 mr-2" />Student Name</Label>
              <Input id="student-name" placeholder="Your real name" value={studentName} onChange={(e) => setStudentName(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="character-name" className="flex items-center"><Star className="w-4 h-4 mr-2" />Character Name</Label>
              <Input id="character-name" placeholder="Your hero's name" value={characterName} onChange={(e) => setCharacterName(e.target.value)} disabled={isLoading} />
            </div>
          </div>

          {/* Right Column: Selections */}
          <div className="space-y-6">
            {selectedClass ? (
              <>
                <div>
                  <Label className="text-lg font-semibold">Choose Your Avatar</Label>
                  <Card className="mt-2 p-2 bg-secondary/50">
                    <div className="grid grid-cols-4 gap-2">
                      {classData[selectedClass].avatars.map((avatar, index) => (
                        <div
                          key={index}
                          onClick={() => !isLoading && setSelectedAvatar(avatar)}
                          className={cn(
                            'cursor-pointer rounded-md overflow-hidden border-2 transition-all duration-200',
                            selectedAvatar === avatar
                              ? 'border-primary ring-2 ring-primary'
                              : 'border-transparent hover:border-primary/50'
                          )}
                        >
                          <Image src={avatar} alt={`Avatar ${index + 1}`} width={100} height={100} className="w-full aspect-square object-contain" />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
                <div>
                  <Label className="text-lg font-semibold">Choose Your Background</Label>
                   <Card className="mt-2 p-2 bg-secondary/50">
                    <div className="grid grid-cols-3 gap-2">
                      {classData[selectedClass].backgrounds.map((bg, index) => (
                        <div
                          key={index}
                          onClick={() => !isLoading && setSelectedBackground(bg)}
                          className={cn(
                            'cursor-pointer rounded-md overflow-hidden border-2 transition-all duration-200',
                             selectedBackground === bg
                              ? 'border-primary ring-2 ring-primary'
                              : 'border-transparent hover:border-primary/50'
                          )}
                        >
                          <Image src={bg} alt={`Background ${index + 1}`} width={150} height={100} className="w-full aspect-video object-contain" />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full bg-secondary/30 rounded-lg">
                <p className="text-muted-foreground">Please select a class to see options.</p>
              </div>
            )}
          </div>
        </CardContent>
         <div className="col-span-1 md:col-span-2 px-6 pb-6">
            <Button onClick={handleSubmit} disabled={isLoading} className="w-full text-lg py-6">
              {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Generate Avatar and Enter Luminaria'}
            </Button>
            <p className="text-center text-sm mt-4 text-muted-foreground">
              Already have a hero? <Link href="/" className="underline text-primary">Login here</Link>.
            </p>
         </div>
      </Card>
    </div>
  );
}
