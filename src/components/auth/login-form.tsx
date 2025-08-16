
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
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
import { School, Eye, EyeOff, Loader2, UserPlus, BookUser, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logGameEvent } from '@/lib/gamelog';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import Link from 'next/link';

export function LoginForm() {
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
        description: 'Please enter your username/email and password.',
      });
      return;
    }

    setIsLoading(true);

    // This part of the logic is now broken because we don't have a class code
    // to look up the teacher. I will add a placeholder error.
    toast({
        variant: 'destructive',
        title: 'Login Disabled',
        description: 'Student login is currently disabled because the class code is missing.',
    });
    setIsLoading(false);

    // The original logic is commented out below because it cannot function
    // without the teacher's UID derived from the class code.
    /*
    const email = `${studentId}-${teacherUid.slice(0,5)}@academy-heroes-mziuf.firebaseapp.com`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const studentRef = doc(db, 'teachers', teacherUid, 'students', userCredential.user.uid);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        const studentName = studentSnap.data().studentName || 'A student';
         await logGameEvent('ACCOUNT', `${studentName} logged in.`);
      }

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
            description = 'Invalid Student ID or password for the provided Class Code.';
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
    */
  };
  
  const handleTeacherLoginRedirect = () => {
    router.push('/teacher/login');
  }

  return (
    <div className="space-y-4 rounded-lg bg-background/50 p-4 border">
        <div className="space-y-2">
        <Label htmlFor="student-id">Username / Email</Label>
        <Input
            id="student-id"
            type="text"
            placeholder="Enter your username or email"
            required
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={isLoading}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
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
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-s5" />}
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
        Login
        </Button>
    </div>
  );
}
