
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, KeyRound, School, Briefcase, Phone, Check, Star, ArrowLeft, ShieldAlert, MapPin, Gavel } from 'lucide-react';
import Link from 'next/link';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getGlobalSettings } from '@/ai/flows/manage-settings';
import { populateDefaultBoons } from '@/ai/flows/manage-boons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';


// Function to generate a random, easy-to-read class code
const generateClassCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omitted I, O, 0, 1 for clarity
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result.match(/.{1,3}/g)!.join('-'); // Add a hyphen in the middle
};


export default function TeacherRegisterPage() {
  const [step, setStep] = useState(1);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [address, setAddress] = useState('');
  const [className, setClassName] = useState('');

  // NDA State
  const [ndaSignature, setNdaSignature] = useState('');
  const [ndaAgreed, setNdaAgreed] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  
  const maxSteps = 2;

  const router = useRouter();
  const { toast } = useToast();

   useEffect(() => {
    const checkRegistrationStatus = async () => {
        setIsCheckingStatus(true);
        try {
            const settings = await getGlobalSettings();
            setIsRegistrationOpen(settings.isTeacherRegistrationOpen);
        } catch (error) {
            console.error("Failed to check registration status:", error);
            // Default to open if there's an error, to not block registration unintentionally
            setIsRegistrationOpen(true);
        } finally {
            setIsCheckingStatus(false);
        }
    };
    checkRegistrationStatus();
  }, []);
  
  const handleNextStep = () => {
    // Add validation before proceeding
    if (step === 1 && (!name || !email || !password || !confirmPassword || !phoneNumber)) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in your name, email, phone number, and both password fields.' });
        return;
    }
    if (password !== confirmPassword) {
        toast({ variant: 'destructive', title: 'Passwords Do Not Match', description: 'Please ensure your passwords match.' });
        return;
    }
    setStep(s => s + 1);
  }

  const handlePrevStep = () => {
    setStep(s => s - 1);
  }

  const handleSubmit = async () => {
    if ((!schoolName || !className || !address)) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in your school, address, and guild name.' });
        return;
    }
    
    // Authoritative check on submission
    const settings = await getGlobalSettings();
    if (!settings.isTeacherRegistrationOpen) {
        toast({
            variant: 'destructive',
            title: 'Registration Closed',
            description: 'New account creation has been paused by the Grandmaster.',
        });
        setIsRegistrationOpen(false); // Update UI just in case
        return;
    }

    setIsLoading(true);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Generate a unique class code for the new teacher
        const classCode = generateClassCode();

        const teacherData: any = {
            uid: user.uid,
            name: name,
            email: email,
            phoneNumber: phoneNumber,
            schoolName: schoolName,
            address: address,
            className: className,
            classCode: classCode, // Save the generated class code
            createdAt: serverTimestamp(),
        };

        const teacherRef = doc(db, "teachers", user.uid);
        await setDoc(teacherRef, teacherData);

        // After successfully creating the teacher, populate default boons and quests
        await populateDefaultBoons(user.uid);
        
        // Create the first "Independent Chapters" Hub for the new teacher
        const questHubsRef = collection(db, 'teachers', user.uid, 'questHubs');
        const newHubRef = doc(questHubsRef); // Create a reference with a new ID
        await setDoc(newHubRef, {
            name: "Independent Chapters",
            hubOrder: 1,
            worldMapUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FGeneric%20Map.jpg?alt=media&token=8d234199-3178-432e-9087-3e117498305c",
            coordinates: { x: 50, y: 50 },
            createdAt: serverTimestamp(),
        });
        
        // Send verification email
        await sendEmailVerification(user);

        toast({
            title: 'Registration Almost Complete!',
            description: "We've sent a verification link to your email address.",
        });
        router.push('/teacher/verify-email');

    } catch (error: any) {
        console.error("Error creating teacher account:", error);
        let description = 'An unexpected error occurred. Please try again.';
        if (error.code) {
            switch(error.code) {
                case 'auth/email-already-in-use':
                    description = 'An account with this email address already exists.';
                    break;
                case 'auth/invalid-email':
                    description = 'The email address is not valid.';
                    break;
                case 'auth/weak-password':
                    description = 'The password is too weak. Please choose a stronger password.';
                    break;
            }
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

  const RegistrationClosedCard = () => (
    <Card className="w-full max-w-lg shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
            <ShieldAlert className="h-16 w-16 mx-auto text-amber-500" />
            <CardTitle className="text-3xl font-headline text-primary">Registration Temporarily Closed</CardTitle>
            <CardDescription>New Guild Leader registration has been paused by the Grandmaster.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p>Please check back later. The realm awaits your return!</p>
        </CardContent>
         <CardFooter>
            <Button className="w-full" asChild>
                <Link href="/login">Return to Login</Link>
            </Button>
        </CardFooter>
    </Card>
  );

  return (
    <div 
        className="relative flex items-center justify-center min-h-screen p-4"
    >
        <div 
            className="absolute inset-0 -z-10"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-b2ed6807-b64f-48e1-9b8c-a2d0b719db78.jpg?alt=media&token=793c0484-06f3-49ab-9557-9ca0a9b0f6bf')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        />

        {isCheckingStatus ? (
             <Loader2 className="h-16 w-16 animate-spin text-primary" />
        ) : !isRegistrationOpen ? (
            <RegistrationClosedCard />
        ) : (
            <Card className="w-full max-w-lg shadow-2xl bg-card/90">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline text-primary">Guild Leader's Registration</CardTitle>
                    <CardDescription>Join the Academy of Heroes and bring your classroom to life.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Step Indicator */}
                    <div className="flex justify-center items-center mb-6">
                        <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
                            <div className={`w-16 h-1 ${step > 1 ? 'bg-primary' : 'bg-muted'}`}></div>
                        </div>
                        <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
                        </div>
                    </div>

                    {/* Step 1: Account Info */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in-50">
                            <h3 className="text-xl font-semibold text-center">Step 1: Account Information</h3>
                            <div className="space-y-2">
                                <Label htmlFor="name"><User className="inline-block mr-2" />Full Name</Label>
                                <Input id="name" placeholder="e.g., Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email"><User className="inline-block mr-2" />Email Address</Label>
                                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password"><KeyRound className="inline-block mr-2" />Password</Label>
                                <Input id="password" type="password" placeholder="Choose a secure password (at least 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="confirm-password"><KeyRound className="inline-block mr-2" />Confirm Password</Label>
                                <Input id="confirm-password" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone"><Phone className="inline-block mr-2" />Phone Number</Label>
                                <Input id="phone" type="tel" placeholder="For account verification" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Step 2: School Info */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in-50">
                            <h3 className="text-xl font-semibold text-center">Step 2: Guild Information</h3>
                            <div className="space-y-2">
                                <Label htmlFor="school-name"><School className="inline-block mr-2" />School Name</Label>
                                <Input id="school-name" placeholder="e.g., Luminaria High" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="address"><MapPin className="inline-block mr-2" />School Address</Label>
                                <Input id="address" placeholder="e.g., 123 Hero Lane, Townsville" value={address} onChange={(e) => setAddress(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="class-name"><Briefcase className="inline-block mr-2" />Guild Name</Label>
                                <Input id="class-name" placeholder="e.g., Grade 5 History" value={className} onChange={(e) => setClassName(e.target.value)} />
                            </div>
                        </div>
                    )}

                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <div className="flex justify-between w-full">
                        {step > 1 ? (
                            <Button variant="outline" onClick={handlePrevStep} disabled={isLoading}>Previous</Button>
                        ) : <div />}
                        {step < maxSteps ? (
                            <Button onClick={handleNextStep} disabled={isLoading}>Next</Button>
                        ) : (
                             <Button onClick={handleSubmit} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} 
                                Complete Registration
                            </Button>
                        )}
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                        Already Registered? <Link href="/teacher/login" className="underline text-primary">Login here</Link>.
                    </div>
                    <Button variant="link" className="w-full text-muted-foreground" onClick={() => router.push('/')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Splash Page
                    </Button>
                </CardFooter>
            </Card>
        )}
    </div>
  );
}

    