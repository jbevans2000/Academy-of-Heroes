
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { School, Loader2, KeyRound, Mail, ArrowLeft, ShieldAlert } from 'lucide-react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TeacherLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email || !password) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Please enter both your email and password.',
        });
        return;
    }
    setIsLoading(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch teacher document to check for legacy status
        const teacherDocRef = doc(db, 'teachers', user.uid);
        const teacherDocSnap = await getDoc(teacherDocRef);

        const isLegacyAccount = teacherDocSnap.exists() && teacherDocSnap.data().isLegacyAccount === true;

        // **** CRITICAL SECURITY CHECK ****
        // Bypass verification only if it's a legacy account.
        if (!user.emailVerified && !isLegacyAccount) {
            toast({
                variant: 'destructive',
                title: 'Email Not Verified',
                description: 'You must verify your email address before you can log in. Please check your inbox for the verification link.',
                duration: 8000,
            });
            router.push('/teacher/verify-email');
            return; // Stop the login process
        }

        // Check if the user is a master admin
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
            toast({
                title: 'Admin Login Successful!',
                description: 'Welcome, Master Administrator!',
            });
            router.push('/admin/dashboard');
        } else {
             toast({
                title: 'Login Successful!',
                description: 'Welcome back to the Academy of Heroes, Wise One!',
            });
            const teacherData = teacherDocSnap.exists() ? teacherDocSnap.data() : null;
            const route = teacherData?.isNewlyRegistered ? '/teacher/dashboard?new=true' : '/teacher/dashboard';
            router.push(route);
        }

    } catch (error: any) {
        console.error("Authentication Error Code:", error.code);
        let description = 'An unexpected error occurred. Please try again.';
        if (error.code) {
            switch (error.code) {
                case 'auth/invalid-email':
                    description = 'The email address you entered is not valid. Please check the format.';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    description = 'Invalid email or password. Please check your credentials and try again.';
                    break;
                case 'auth/network-request-failed':
                    description = 'Network error. Please check your internet connection.';
                    break;
                default:
                    description = `An error occurred: ${error.message}`;
            }
        }
        toast({
            variant: 'destructive',
            title: 'Authentication Failed',
            description: description,
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!email) {
        toast({
            variant: 'destructive',
            title: 'Email Required',
            description: 'Please enter your email address in the field above to receive a password reset link.',
        });
        return;
    }
    setIsResetting(true);
    try {
        await sendPasswordResetEmail(auth, email);
        toast({
            title: 'Password Reset Email Sent',
            description: `If an account exists for ${email}, a password reset link has been sent to it. Please check your inbox.`,
        });
    } catch (error: any) {
         console.error("Password reset error:", error);
         toast({
            variant: 'destructive',
            title: 'Reset Failed',
            description: 'Could not send password reset email. Please ensure the email address is correct.',
        });
    } finally {
        setIsResetting(false);
    }
  }


  return (
    <div 
        className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8"
        style={{
          backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-b2ed6807-b64f-48e1-9b8c-a2d0b719db78.jpg?alt=media&token=793c0484-06f3-49ab-9557-9ca0a9b0f6bf')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
    >
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-4 bg-yellow-100/90 border-yellow-500 text-yellow-900 dark:bg-yellow-900/80 dark:text-yellow-100">
            <ShieldAlert className="h-4 w-4 !text-yellow-900 dark:!text-yellow-100" />
            <AlertTitle className="font-bold">Attention Existing BETA Testers!</AlertTitle>
            <AlertDescription>
                Due to recent security updates, you MAY be required to re-verify your email address. When you login, you may have to click the "Resend Verification Email" button, and go to your email to re-verify the account. All of your account information will still be there. We apologize for the inconvenience!
            </AlertDescription>
        </Alert>
        <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
                <School className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-headline text-primary">
              Guild Leader's Login
            </CardTitle>
            <CardDescription>
              Please sign in to manage your classroom.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email"><Mail className="inline-block mr-2 h-4 w-4" />Email</Label>
                <Input 
                    id="email" 
                    type="email" 
                    placeholder="teacher@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || isResetting}
                />
            </div>
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password"><KeyRound className="inline-block mr-2 h-4 w-4" />Password</Label>
                     <button onClick={handlePasswordReset} disabled={isResetting || isLoading} className="text-xs text-black hover:underline focus:outline-none">
                        Forgot your password?
                    </button>
                </div>
                <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isResetting}
                />
            </div>
            <Button type="button" className="w-full" onClick={handleLogin} disabled={isLoading || isResetting}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Login
            </Button>
             <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/teacher/register" className="underline">
                    Register here
                </Link>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Home Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
