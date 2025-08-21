'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, collection, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Heart, Wand, User, KeyRound, Star, Eye, EyeOff, BookUser, ChevronsUpDown } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { classData, type ClassType } from '@/lib/data';
import { logGameEvent } from '@/lib/gamelog';

export default function RegisterPage() {
  const [classCode, setClassCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const getTeacherUidFromClassCode = async (code: string): Promise<string | null> => {
    const uppercaseCode = code.toUpperCase();
    const teachersRef = collection(db, 'teachers');
    const q = query(teachersRef, where('classCode', '==', uppercaseCode), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }
    
    return querySnapshot.docs[0].id;
  }

  const handleSubmit = async () => {
    if (!classCode || !studentId || !password || !studentName || !characterName || !selectedClass || !selectedAvatar) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill out all fields, including the Guild Code, and select your class and avatar.',
      });
      return;
    }
    setIsLoading(true);

    const teacherUid = await getTeacherUidFromClassCode(classCode);
    if (!teacherUid) {
        toast({
            variant: 'destructive',
            title: 'Invalid Guild Code',
            description: 'The Guild Code you entered does not exist. Please check with your Guild Leader.',
        });
        setIsLoading(false);
        return;
    }

    const email = `${studentId}@academy-heroes-mziuf.firebaseapp.com`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const classInfo = classData[selectedClass];
      const baseStats = classInfo.baseStats;

      // Create the main pending student document
      await setDoc(doc(db, 'teachers', teacherUid, 'pendingStudents', user.uid), {
        uid: user.uid,
        teacherUid: teacherUid,
        studentId: studentId,
        email: email,
        studentName: studentName,
        characterName: characterName,
        class: selectedClass,
        avatarUrl: selectedAvatar,
        hp: baseStats.hp,
        mp: baseStats.mp,
        maxHp: baseStats.hp,
        maxMp: baseStats.mp,
        status: 'pending',
        requestedAt: serverTimestamp(),
      });

      // Create the global student metadata document for quick lookup
      await setDoc(doc(db, 'students', user.uid), {
        teacherUid: teacherUid,
      });
      
      toast({
        title: 'Your Hero Awaits Approval!',
        description: "Your request to join the guild has been sent.",
      });
      router.push('/awaiting-approval');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'This Hero\'s Alias is already registered for this guild.'
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
  };

  return (
    <TooltipProvider>
      <div 
        className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6"
        style={{
          backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Aug%2014%2C%202025%2C%2009_59_49%20PM.png?alt=media&token=747d1d1c-a431-40bd-9305-e0141bd548df')`,
          backgroundSize: 'cover',
          backgroundPosition: 'top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Card className="w-full max-w-4xl shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline text-primary">Forge Your Hero</CardTitle>
            <CardDescription>Fill in your details and choose your path to begin your adventure in Luminaria.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2 text-center bg-primary/10 p-4 rounded-lg">
                <Label htmlFor="class-code" className="flex items-center justify-center text-lg font-semibold"><BookUser className="w-5 h-5 mr-2" />Guild Code</Label>
                 <p className="text-sm text-black">This is the most important step! Get this code from your Guild Leader.</p>
                <Input 
                    id="class-code" 
                    placeholder="ENTER GUILD CODE" 
                    value={classCode} 
                    onChange={(e) => setClassCode(e.target.value)} 
                    disabled={isLoading} 
                    className="max-w-xs mx-auto text-center h-12 text-lg tracking-widest font-bold"
                />
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Form Inputs */}
                <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="student-id" className="flex items-center"><KeyRound className="w-4 h-4 mr-2" />Hero's Alias</Label>
                    <Input id="student-id" placeholder="Choose a hero's alias (username)" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center"><Eye className="w-4 h-4 mr-2" />Password</Label>
                    <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Choose a secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                        disabled={isLoading}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="student-name" className="flex items-center"><User className="w-4 h-4 mr-2" />Your Mortal Name</Label>
                    <Input id="student-name" placeholder="Your real name" value={studentName} onChange={(e) => setStudentName(e.target.value)} disabled={isLoading} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="class" className="flex items-center"><Wand className="w-4 h-4 mr-2" />Choose Your Calling</Label>
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
                    <Label htmlFor="character-name" className="flex items-center"><Star className="w-4 h-4 mr-2" />Character Name</Label>
                    <Input id="character-name" placeholder="Your hero's name" value={characterName} onChange={(e) => setCharacterName(e.target.value)} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                    <Label>Need help with a name?</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" disabled>
                           Random Male
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                           Random Female
                        </Button>
                        <Button variant="outline" size="sm" disabled className="col-span-2">
                           Random Non-binary
                        </Button>
                    </div>
                </div>
                </div>

                {/* Right Column: Selections */}
                <div className="space-y-6 flex flex-col justify-center">
                {selectedClass ? (
                    <>
                    <div>
                        <Label className="text-lg font-semibold">Choose Your Avatar</Label>
                        <Card className="mt-2 p-4 bg-secondary/50">
                        <div className="grid grid-cols-4 gap-4">
                            {classData[selectedClass].avatars.map((avatar, index) => (
                            <Tooltip key={index} delayDuration={100}>
                                <TooltipTrigger asChild>
                                <div
                                    onClick={() => !isLoading && setSelectedAvatar(avatar)}
                                    className={cn(
                                    'cursor-pointer rounded-md overflow-hidden border-2 transition-all duration-200 aspect-square flex items-center justify-center',
                                    selectedAvatar === avatar
                                        ? 'border-primary ring-2 ring-primary'
                                        : 'border-transparent hover:border-primary/50'
                                    )}
                                >
                                    <Image src={avatar} alt={`Avatar ${index + 1}`} width={100} height={100} className="object-contain" />
                                </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                <Image src={avatar} alt={`Avatar ${index + 1}`} width={256} height={256} className="w-64 h-64 object-contain" />
                                </TooltipContent>
                            </Tooltip>
                            ))}
                        </div>
                        </Card>
                    </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full bg-secondary/30 rounded-lg">
                    <p className="text-muted-foreground">Please select a class to see avatar options.</p>
                    </div>
                )}
                </div>
            </div>
           <div className="col-span-1 md:col-span-2 pt-6">
              <Button onClick={handleSubmit} disabled={isLoading} className="w-full text-lg py-6">
                {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Request to Join Guild'}
              </Button>
              <p className="text-center text-sm mt-4 text-muted-foreground">
                Already have a hero? <Link href="/login" className="underline text-primary">Login here</Link>.
              </p>
           </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
