
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
} from 'firebase/auth';
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
import { Sword, School, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!studentId || !password) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please enter both Student ID and Password.',
      });
      return;
    }

    setIsLoading(true);
    const email = `${studentId}@academy-heroes-mziuf.firebaseapp.com`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Login Successful!',
        description: 'Welcome back to your adventure.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      let description = 'An unexpected error occurred. Please try again.';
       if (error.code) {
        switch (error.code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                description = 'Invalid Student ID or password.';
                break;
            case 'auth/network-request-failed':
                description = 'Network error. Please check your connection.';
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
        backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Aug%2014%2C%202025%2C%2009_44_22%20PM.png?alt=media&token=cb2379fa-3333-44f9-b4fb-b4a72672a312')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Sword className="h-10 w-10 text-primary" />
        </div>
        <Card className="shadow-2xl bg-card/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline text-primary">
              Welcome to The Academy of Heroes!
            </CardTitle>
            <CardDescription>
              Login to Continue Your Quest, or Create a New Avatar Below!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student-id" className="text-black">Student ID Number</Label>
                <Input
                  id="student-id"
                  type="text"
                  placeholder="Enter your ID number"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
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
              <Button
                type="button"
                className="w-full"
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Login as Student
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/register')}
                    disabled={isLoading}
                >
                    Create New Avatar
                </Button>
            </div>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
             <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push('/teacher/login')}
              disabled={isLoading}
            >
              <School className="mr-2 h-4 w-4" />
              Teacher Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
