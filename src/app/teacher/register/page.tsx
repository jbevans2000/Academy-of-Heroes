
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, KeyRound, School, Briefcase, CreditCard, Calendar, Lock } from 'lucide-react';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function TeacherRegisterPage() {
  const [step, setStep] = useState(1);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    setStep(s => s + 1);
  }

  const handlePrevStep = () => {
    setStep(s => s - 1);
  }

  const handleSubmit = async () => {
     if (!schoolName || !className) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in your school and class name.' });
        return;
    }
    setIsLoading(true);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save teacher info to a new document in the 'teachers' collection
        // The document ID will be the new user's UID
        await setDoc(doc(db, "teachers", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            schoolName: schoolName,
            className: className,
        });

        toast({
            title: 'Registration Successful!',
            description: "Welcome! Your account has been created.",
        });
        router.push('/teacher/dashboard');

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
      className="flex items-center justify-center min-h-screen bg-muted/40 p-4"
    >
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline text-primary">Teacher Registration</CardTitle>
            <CardDescription>Join the Academy of Heroes and bring your classroom to life.</CardDescription>
        </CardHeader>
        <CardContent>
            {/* Step Indicator */}
            <div className="flex justify-center items-center mb-6">
                <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
                    <div className={`w-24 h-1 ${step > 1 ? 'bg-primary' : 'bg-muted'}`}></div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
            </div>

            {/* Step 1: Account Info */}
            {step === 1 && (
                <div className="space-y-4 animate-in fade-in-50">
                    <h3 className="text-xl font-semibold text-center">Account Information</h3>
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
                </div>
            )}

            {/* Step 2: School Info */}
            {step === 2 && (
                <div className="space-y-4 animate-in fade-in-50">
                    <h3 className="text-xl font-semibold text-center">Class Information</h3>
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
            
        </CardContent>
        <CardFooter className="flex justify-between">
            {step > 1 ? (
                 <Button variant="outline" onClick={handlePrevStep} disabled={isLoading}>Previous</Button>
            ) : <div />}
            {step < 2 ? (
                <Button onClick={handleNextStep}>Next</Button>
            ) : (
                <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Complete Registration'}
                </Button>
            )}
        </CardFooter>
        <div className="text-center text-sm pb-4 text-muted-foreground">
             Already a teacher? <Link href="/teacher/login" className="underline text-primary">Login here</Link>.
        </div>
      </Card>
    </div>
  );
}
