
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, KeyRound, School, Briefcase, Phone, Check, Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, collection, serverTimestamp, addDoc } from 'firebase/firestore';

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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [className, setClassName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const handleNextStep = () => {
    // Add validation before proceeding
    if (step === 1 && (!name || !email || !password)) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in your name, email, and password.' });
        return;
    }
     if (step === 2 && (!schoolName || !className)) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in your school and class name.' });
        return;
    }
    setStep(s => s + 1);
  }

  const handlePrevStep = () => {
    setStep(s => s - 1);
  }

  const handleSubmit = async () => {
    // This is where final submission happens. For now, we skip actual payment.
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
            schoolName: schoolName,
            className: className,
            classCode: classCode, // Save the generated class code
        };

        if (phoneNumber) {
            teacherData.phoneNumber = phoneNumber;
        }

        // Save teacher info to a new document in the 'teachers' collection
        await setDoc(doc(db, "teachers", user.uid), teacherData);

        // Automatically create the first "Independent Chapters" Hub for the new teacher
        const questHubsRef = collection(db, 'teachers', user.uid, 'questHubs');
        await addDoc(questHubsRef, {
            name: "Independent Chapters",
            hubOrder: 1,
            worldMapUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FGeneric%20Map.jpg?alt=media&token=8d234199-3178-432e-9087-3e117498305c",
            coordinates: { x: 50, y: 50 },
            createdAt: serverTimestamp(),
        });

        toast({
            title: 'Registration Successful!',
            description: "Welcome! Your account has been created.",
        });
        router.push('/teacher/dashboard?new=true');

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
      <Card className="w-full max-w-lg shadow-2xl bg-card/90">
        <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline text-primary">Teacher Registration</CardTitle>
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
                    <div className={`w-16 h-1 ${step > 2 ? 'bg-primary' : 'bg-muted'}`}></div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</div>
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
                        <Label htmlFor="phone"><Phone className="inline-block mr-2" />Phone Number (Optional)</Label>
                        <Input id="phone" type="tel" placeholder="For optional two-factor authentication" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                    </div>
                </div>
            )}

            {/* Step 2: School Info */}
            {step === 2 && (
                <div className="space-y-4 animate-in fade-in-50">
                    <h3 className="text-xl font-semibold text-center">Step 2: Class Information</h3>
                    <div className="space-y-2">
                        <Label htmlFor="school-name"><School className="inline-block mr-2" />School Name</Label>
                        <Input id="school-name" placeholder="e.g., Luminaria High" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="class-name"><Briefcase className="inline-block mr-2" />Class Name</Label>
                        <Input id="class-name" placeholder="e.g., Grade 5 History" value={className} onChange={(e) => setClassName(e.target.value)} />
                    </div>
                </div>
            )}

             {/* Step 3: Billing Placeholder */}
            {step === 3 && (
                <div className="space-y-4 animate-in fade-in-50">
                    <h3 className="text-xl font-semibold text-center">Step 3: Choose Your Plan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Free Plan */}
                        <Card className="p-4 flex flex-col text-center">
                             <CardHeader>
                                <CardTitle>Free Plan</CardTitle>
                                <CardDescription>$0 / month</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <ul className="space-y-2 text-sm text-muted-foreground text-left">
                                    <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-green-500" />Up to 30 students</li>
                                    <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-green-500" />Basic questing</li>
                                    <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-green-500" />Basic tools</li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full" onClick={handleSubmit} disabled={isLoading}>
                                     {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Select Free Plan
                                </Button>
                            </CardFooter>
                        </Card>
                         {/* Premium Plan */}
                        <Card className="p-4 flex flex-col text-center border-primary border-2 relative">
                            <div className="absolute top-0 -translate-y-1/2 w-full">
                                <div className="mx-auto bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full w-fit">Most Popular</div>
                            </div>
                             <CardHeader>
                                <CardTitle>Premium Plan</CardTitle>
                                <CardDescription>$12 / month</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <ul className="space-y-2 text-sm text-muted-foreground text-left">
                                    <li className="flex items-center"><Star className="w-4 h-4 mr-2 text-yellow-500" />Unlimited students</li>
                                    <li className="flex items-center"><Star className="w-4 h-4 mr-2 text-yellow-500" />Advanced customization</li>
                                    <li className="flex items-center"><Star className="w-4 h-4 mr-2 text-yellow-500" />All classroom tools</li>
                                    <li className="flex items-center"><Star className="w-4 h-4 mr-2 text-yellow-500" />Priority support</li>
                                </ul>
                            </CardContent>
                             <CardFooter>
                                <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Select Premium Plan
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            )}
            
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
             <div className="flex justify-between w-full">
                {step > 1 ? (
                    <Button variant="outline" onClick={handlePrevStep} disabled={isLoading}>Previous</Button>
                ) : <div />}
                {step < 3 && (
                    <Button onClick={handleNextStep} disabled={isLoading}>Next</Button>
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
    </div>
  );
}
