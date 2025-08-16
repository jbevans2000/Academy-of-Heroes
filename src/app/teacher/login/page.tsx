
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
import { School, Loader2, KeyRound, Mail, ArrowLeft } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function TeacherLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
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
        await signInWithEmailAndPassword(auth, email, password);
        toast({
            title: 'Login Successful!',
            description: 'Welcome back to the Academy of Heroes, Wise One!',
        });
        router.push('/teacher/dashboard');
    } catch (error: any) {
        console.error(error);
        let description = 'An unexpected error occurred. Please try again.';
        if (error.code) {
            switch (error.code) {
                case 'auth/invalid-credential':
                case 'auth/user-not-found':
                case 'auth/wrong-password':
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
        <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
                <School className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-headline text-primary">
              Teacher Dashboard Login
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
                    disabled={isLoading}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="password"><KeyRound className="inline-block mr-2 h-4 w-4" />Password</Label>
                <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                />
            </div>
            <Button type="button" className="w-full" onClick={handleLogin} disabled={isLoading}>
                {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
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
