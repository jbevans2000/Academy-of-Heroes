
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, KeyRound, BookUser } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logGameEvent } from '@/lib/gamelog';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

export function LoginForm() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [classCode, setClassCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

   const getTeacherUidFromClassCode = async (code: string): Promise<string | null> => {
    const uppercaseCode = code.toUpperCase();
    const teachersRef = collection(db, 'teachers');
    const q = query(teachersRef, where('classCode', '==', uppercaseCode), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }
    
    return querySnapshot.docs[0].id;
  }

  const handleLogin = async () => {
    if (!studentId || !password || !classCode) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please enter your Class Code, Username, and Password.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const teacherUid = await getTeacherUidFromClassCode(classCode);

      if (!teacherUid) {
          toast({
              variant: 'destructive',
              title: 'Login Failed',
              description: 'Invalid Class Code. Please check with your teacher.',
          });
          setIsLoading(false);
          return;
      }
      
      const email = `${studentId}-${teacherUid.slice(0,5)}@academy-heroes-mziuf.firebaseapp.com`;

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
            description = 'Invalid username, password, or class code.';
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
            <Label htmlFor="class-code"><BookUser className="inline-block mr-2 h-4 w-4" />Class Code</Label>
            <Input
                id="class-code"
                type="text"
                placeholder="Enter your class code"
                required
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                disabled={isLoading}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="student-id"><KeyRound className="inline-block mr-2 h-4 w-4" />Username</Label>
            <Input
                id="student-id"
                type="text"
                placeholder="Enter your username"
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
