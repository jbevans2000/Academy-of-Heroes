
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
import { Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleReset = async () => {
        if (!email) {
            toast({
                variant: 'destructive',
                title: 'Email Required',
                description: 'Please enter the email address associated with your account.',
            });
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            toast({
                title: 'Password Reset Email Sent',
                description: `If an account exists for ${email}, a password reset link has been sent. Please check your inbox (and spam folder).`,
                duration: 8000,
            });
            router.push('/login');
        } catch (error: any) {
            console.error("Password reset error:", error);
            let description = 'Could not send the password reset email. Please ensure the email address is correct and try again.';
             if (error.code === 'auth/user-not-found') {
                description = 'No account was found with that email address.';
            }
             toast({
                variant: 'destructive',
                title: 'Reset Failed',
                description: description,
            });
        } finally {
            setIsLoading(false);
        }
    };


    return (
         <div 
            className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8"
            style={{
              backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Aug%2014%2C%202025%2C%2009_44_22%20PM.png?alt=media&token=cb2379fa-3333-44f9-b4fb-b4a72672a312')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
        >
            <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <KeyRound className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-headline">Forgot Your Password?</CardTitle>
                    <CardDescription>Enter your email address and we'll send you a link to reset it. This only works for accounts registered with a real email.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email"><Mail className="inline-block mr-2 h-4 w-4" />Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder="you@example.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                     <Button type="button" className="w-full" onClick={handleReset} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Send Reset Link
                    </Button>
                </CardContent>
                 <CardFooter className="flex-col gap-4">
                    <p className="text-xs text-muted-foreground">If you signed up with a Username, your teacher must reset your password for you from their dashboard.</p>
                    <Button variant="outline" className="w-full" asChild>
                        <Link href="/login">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
