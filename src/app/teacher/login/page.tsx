
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { School, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// IMPORTANT: This is the designated teacher's email address
const TEACHER_EMAIL = 'jevans@nca.connectionsacademy.org'; 

export default function TeacherLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      // Step 1: Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 2: Check if the logged-in user is the designated teacher
      if (user.email === TEACHER_EMAIL) {
        toast({
          title: 'Login Successful!',
          description: 'Welcome back, teacher.',
        });
        router.push('/teacher/dashboard');
      } else {
        // If it's a valid user but not the teacher, sign them out and show an error
        await auth.signOut();
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'This login is for teachers only.',
        });
      }
    } catch (error: any) {
      console.error(error);
      let description = 'An unexpected error occurred. Please try again.';
      if (error.code) {
        switch (error.code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                description = 'Invalid email or password.';
                break;
            case 'auth/network-request-failed':
                description = 'Network error. Please check your connection.';
                break;
            case 'auth/configuration-not-found':
                 description = 'Firebase configuration is missing or invalid. Please contact support.';
                 break;
            default:
                description = `An error occurred: ${error.message}`;
        }
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <School className="h-10 w-10 text-primary" />
        </div>
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline text-primary">
              Teacher Dashboard
            </CardTitle>
            <CardDescription>
              Enter your credentials to manage your students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@school.edu"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    required 
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
              <Button type="button" className="w-full" onClick={handleLogin} disabled={isLoading}>
                 {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Login
              </Button>
            </div>
             <div className="mt-4 text-center text-sm">
                <Button
                    type="button"
                    variant="link"
                    className="w-full"
                    onClick={() => router.push('/')}
                    disabled={isLoading}
                >
                    Back to Student Login
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
