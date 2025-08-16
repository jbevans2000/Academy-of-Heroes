
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

export default function TeacherRegisterPage() {
  const [step, setStep] = useState(1);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [className, setClassName] = useState('');
  
  // Dummy Billing State
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');


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
    if (!cardName || !cardNumber || !cardExpiry || !cardCvc) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in all payment details.' });
        return;
    }
    setIsLoading(true);
    
    // In a real application, you would now:
    // 1. Send payment info to a service like Stripe to get a payment token.
    // 2. Create the user account using Firebase Auth.
    // 3. Save the teacher's info (name, school, class) and the Stripe customer ID to your Firestore 'teachers' collection.
    
    // For this prototype, we'll just simulate success.
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: 'Registration Successful!',
      description: "Welcome! Your account has been created.",
    });
    router.push('/teacher/dashboard');
    
    setIsLoading(false);
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
                        <Input id="password" type="password" placeholder="Choose a secure password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
            
            {/* Step 3: Billing Info */}
            {step === 3 && (
                <div className="space-y-4 animate-in fade-in-50">
                    <h3 className="text-xl font-semibold text-center">Billing Information</h3>
                     <div className="space-y-2">
                        <Label htmlFor="card-name"><CreditCard className="inline-block mr-2" />Name on Card</Label>
                        <Input id="card-name" placeholder="e.g., Jane M. Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="card-number">Card Number</Label>
                        <Input id="card-number" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="card-expiry"><Calendar className="inline-block mr-2" />Expiry</Label>
                            <Input id="card-expiry" placeholder="MM / YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="card-cvc"><Lock className="inline-block mr-2" />CVC</Label>
                            <Input id="card-cvc" placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} />
                        </div>
                    </div>
                </div>
            )}
        </CardContent>
        <CardFooter className="flex justify-between">
            {step > 1 ? (
                 <Button variant="outline" onClick={handlePrevStep} disabled={isLoading}>Previous</Button>
            ) : <div />}
            {step < 3 ? (
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
