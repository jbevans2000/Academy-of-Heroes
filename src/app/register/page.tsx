
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Heart, Wand, User, KeyRound, Star, Eye, EyeOff, BookUser, ChevronsUpDown, ShieldAlert, Mail } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ClassType } from '@/lib/data';
import { avatarData } from '@/lib/avatars';
import { getGlobalSettings } from '@/ai/flows/manage-settings';
import { createStudentDocuments } from '@/ai/flows/create-student';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { generateName } from '@/ai/flows/name-generator';


export default function RegisterPage() {
  const [signupMethod, setSignupMethod] = useState<'email' | 'alias'>('email');
  const [classCode, setClassCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isGeneratingName, setIsGeneratingName] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    const checkRegistrationStatus = async () => {
        setIsCheckingStatus(true);
        try {
            const settings = await getGlobalSettings();
            setIsRegistrationOpen(settings.isStudentRegistrationOpen);
        } catch (error) {
            console.error("Failed to check registration status:", error);
            setIsRegistrationOpen(true);
        } finally {
            setIsCheckingStatus(false);
        }
    };
    checkRegistrationStatus();
  }, []);

  const handleGenerateName = async () => {
    setIsGeneratingName(true);
    try {
        const name = await generateName(selectedGender);
        setCharacterName(name);
    } catch (error) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Name Generation Failed',
            description: 'Could not generate a name at this time. Please try again or enter one manually.',
        });
    } finally {
        setIsGeneratingName(false);
    }
  };

  const handleSubmit = async () => {
    if (!classCode || (signupMethod === 'alias' && !studentId) || (signupMethod === 'email' && !email) || !password || !confirmPassword || !studentName || !characterName || !selectedClass || !selectedAvatar) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill out all fields, including the Guild Code, and select your class and avatar.',
      });
      return;
    }
     if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password Too Short',
        description: 'Your password must be at least 6 characters long.',
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords Do Not Match',
        description: 'Please ensure both password fields are identical.',
      });
      return;
    }
    setIsLoading(true);

    try {
      // Step 1: Create user in Firebase Auth on the client
      const finalEmail = signupMethod === 'email' ? email : `${studentId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`;
      const finalStudentId = signupMethod === 'email' ? email : studentId; // Use email as identifier if provided

      const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
      const user = userCredential.user;

      // Step 2: Call server action to create Firestore documents
      const result = await createStudentDocuments({
        classCode,
        userUid: user.uid,
        email: finalEmail,
        studentId: finalStudentId,
        studentName,
        characterName,
        selectedClass,
        selectedAvatar,
      });

      if (result.success) {
        toast({
          title: 'Your Hero Awaits Approval!',
          description: "Your request to join the guild has been sent.",
        });
        router.push('/awaiting-approval');
      } else {
        // This is a tricky state. The user exists in Auth but not Firestore.
        // For simplicity, we'll ask them to contact the teacher. A more robust solution might try to clean up the user.
        throw new Error(result.error || "Your account was created, but we couldn't add you to the guild. Please contact your teacher.");
      }
    } catch (error: any) {
      console.error(error);
      let description = 'An unexpected error occurred. Please try again.';
      if (error.code) {
        switch(error.code) {
          case 'auth/email-already-in-use':
            description = signupMethod === 'email' ? 'This email is already registered.' : 'This username is already registered. Please choose another.';
            break;
          case 'auth/invalid-email':
            description = 'The email address is not valid.';
            break;
          case 'auth/weak-password':
            description = 'The password is too weak. Please choose a stronger password.';
            break;
        }
      } else {
        description = error.message;
      }

      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: description,
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

  const RegistrationClosedCard = () => (
    <Card className="w-full max-w-lg shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
            <ShieldAlert className="h-16 w-16 mx-auto text-amber-500" />
            <CardTitle className="text-3xl font-headline text-primary">Registration Temporarily Closed</CardTitle>
            <CardDescription>New hero creation has been paused by the Grandmaster.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-black">Please check back later or contact your Guild Leader for more information. The realm awaits your return!</p>
        </CardContent>
         <CardFooter>
            <Button className="w-full" asChild>
                <Link href="/login">Return to Login</Link>
            </Button>
        </CardFooter>
    </Card>
  );
  
  const isFormDisabled = classCode.trim() === '';

  return (
    <TooltipProvider>
      <div 
        className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6"
        style={{
          backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Sep%2012%2C%202025%2C%2005_51_46%20PM.png?alt=media&token=0d3a14f7-9769-4696-95a5-09e6b578c949')`,
          backgroundSize: 'cover',
          backgroundPosition: 'top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {isCheckingStatus ? <Loader2 className="h-16 w-16 animate-spin text-primary" /> :
         !isRegistrationOpen ? <RegistrationClosedCard /> :
        <Card className="w-full max-w-4xl shadow-2xl bg-card/90 backdrop-blur-sm">
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
                    <Label className="font-semibold">Sign-up Method</Label>
                    <RadioGroup
                        value={signupMethod}
                        onValueChange={(value) => setSignupMethod(value as 'email' | 'alias')}
                        className="flex space-x-4"
                        disabled={isFormDisabled || isLoading}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="email" id="signup-email" />
                            <Label htmlFor="signup-email">Use Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="alias" id="signup-alias" />
                            <Label htmlFor="signup-alias">Use Username</Label>
                        </div>
                    </RadioGroup>
                  </div>

                  {signupMethod === 'email' ? (
                    <div className="space-y-2 animate-in fade-in-50">
                        <Label htmlFor="email" className="flex items-center"><Mail className="w-4 h-4 mr-2" />Email Address</Label>
                        <Input id="email" placeholder="Your email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isFormDisabled || isLoading} />
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in-50">
                        <Label htmlFor="student-id" className="flex items-center"><KeyRound className="w-4 h-4 mr-2" />Username</Label>
                        <Input id="student-id" placeholder="Choose a unique username" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={isFormDisabled || isLoading} />
                        <Alert variant="destructive" className="mt-2">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>Important!</AlertTitle>
                            <AlertDescription>
                                If you use a Username, you will NOT be able to reset your password! Make sure you keep it SAFE or you will have to make a new account!
                            </AlertDescription>
                        </Alert>
                    </div>
                  )}

                <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center"><KeyRound className="w-4 h-4 mr-2" />Password</Label>
                    <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Choose a secure password (at least 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isFormDisabled || isLoading}
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                        disabled={isFormDisabled || isLoading}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="flex items-center"><KeyRound className="w-4 h-4 mr-2" />Confirm Password</Label>
                    <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isFormDisabled || isLoading}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="student-name" className="flex items-center"><User className="w-4 h-4 mr-2" />Student Name</Label>
                    <Input id="student-name" placeholder="Your real name" value={studentName} onChange={(e) => setStudentName(e.target.value)} disabled={isFormDisabled || isLoading} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="class" className="flex items-center"><Wand className="w-4 h-4 mr-2" />Choose Your Calling</Label>
                    <Select onValueChange={handleClassChange} disabled={isFormDisabled || isLoading} value={selectedClass}>
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
                    <Label className="font-semibold">Character Gender</Label>
                    <RadioGroup
                        value={selectedGender}
                        onValueChange={(value) => setSelectedGender(value as 'male' | 'female')}
                        className="flex space-x-4"
                        disabled={isFormDisabled || isLoading}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="male" id="gender-male" />
                            <Label htmlFor="gender-male">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="female" id="gender-female" />
                            <Label htmlFor="gender-female">Female</Label>
                        </div>
                    </RadioGroup>
                  </div>
                <div className="space-y-2">
                    <Label htmlFor="character-name" className="flex items-center"><Star className="w-4 h-4 mr-2" />Character Name</Label>
                    <div className="flex gap-2">
                      <Input id="character-name" placeholder="Your hero's name" value={characterName} onChange={(e) => setCharacterName(e.target.value)} disabled={isFormDisabled || isLoading || isGeneratingName} />
                       <Button variant="outline" onClick={handleGenerateName} disabled={isFormDisabled || isLoading || isGeneratingName}>
                            {isGeneratingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Name Generator
                       </Button>
                    </div>
                </div>
                </div>

                {/* Right Column: Selections */}
                <div className="space-y-6 flex flex-col justify-center">
                {selectedClass && !isFormDisabled ? (
                    <>
                    <div>
                        <Label className="text-lg font-semibold">Choose Your Avatar</Label>
                        <Card className="mt-2 p-4 bg-secondary/50">
                        <div className="grid grid-cols-4 gap-4">
                            {avatarData[selectedClass]?.[1]?.map((avatar: string, index: number) => (
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
                        <p className={cn("p-4 text-center", isFormDisabled ? "text-destructive font-bold text-xl" : "text-muted-foreground")}>
                            {isFormDisabled ? 'Please enter a Guild Code to enable the rest of the form.' : 'Please select a class to see avatar options.'}
                        </p>
                    </div>
                )}
                </div>
            </div>
           <div className="col-span-1 md:col-span-2 pt-6">
              <Button onClick={handleSubmit} disabled={isFormDisabled || isLoading} className="w-full text-lg py-6">
                {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Request to Join Guild'}
              </Button>
              <p className="text-center text-sm mt-4 text-muted-foreground">
                Already have a hero? <Link href="/login" className="underline text-primary">Login here</Link>.
              </p>
           </div>
          </CardContent>
        </Card>
        }
      </div>
    </TooltipProvider>
  );
}
