
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logGameEvent } from '@/lib/gamelog';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { findTeacherForStudent } from '@/lib/utils';

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
        description: 'Please enter your Hero\'s Alias and Password.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const email = `${studentId}@academy-heroes-mziuf.firebaseapp.com`;

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // After successful login, find which teacher this student belongs to
      const teacherUid = await findTeacherForStudent(user.uid);
      const studentSnap = teacherUid ? await getDoc(doc(db, 'teachers', teacherUid, 'students', user.uid)) : null;

      if (teacherUid && studentSnap?.exists()) {
        await logGameEvent(teacherUid, 'ACCOUNT', `${studentSnap.data().studentName} logged in.`);
      } else {
         // This case would be rare, meaning a user exists in Auth but has no student document
         console.warn(`A user with UID ${user.uid} logged in but has no student record.`);
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
            description = 'Invalid hero alias or password.';
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
    <div className="space-y-4 rounded-lg bg-background/50 p-4 border">
        <div className="space-y-2">
            <Label htmlFor="student-id"><KeyRound className="inline-block mr-2 h-4 w-4" />Hero's Alias</Label>
            <Input
                id="student-id"
                type="text"
                placeholder="Enter your hero's alias"
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
                placeholder="Enter your password"
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
        Login to My Hero
        </Button>
    </div>
  );
}
