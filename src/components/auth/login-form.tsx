
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logGameEvent } from '@/lib/gamelog';
import { doc, getDoc, getDocs, collection, query, writeBatch, serverTimestamp, setDoc, where } from 'firebase/firestore';
import Link from 'next/link';

export function LoginForm() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!loginId || !password) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: "Please enter your email or Hero's Alias and Password.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // First, try logging in assuming loginId is a real email.
      try {
        await attemptLogin(loginId, password);
      } catch (emailError: any) {
        // If the email login fails (likely with user-not-found or invalid-credential),
        // try again assuming the loginId is a Hero's Alias.
        if (emailError.code === 'auth/invalid-credential' || emailError.code === 'auth/user-not-found' || emailError.code === 'auth/invalid-email') {
            try {
                 const dummyEmail = `${loginId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`;
                 await attemptLogin(dummyEmail, password);
            } catch (aliasError: any) {
                // If the alias login also fails, show a generic error.
                throw aliasError;
            }
        } else {
            // If the error was something else (e.g., network error), throw it.
            throw emailError;
        }
      }
    } catch (error: any) {
      console.error(error);
      let description = 'An unexpected error occurred. Please try again.';
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-email':
            description = 'Invalid email/alias or password.';
            break;
          case 'auth/network-request-failed':
            description = 'Network error. Please check your connection.';
            break;
          default:
            description = `An error occurred: ${error.message}`;
        }
      } else {
        description = error.message;
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

  const attemptLogin = async (email: string, pass: string) => {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;

      const studentMetaRef = doc(db, 'students', user.uid);
      let studentMetaSnap = await getDoc(studentMetaRef);
      
      let teacherUid = '';
      let isApproved = false;

      if (studentMetaSnap.exists()) {
        teacherUid = studentMetaSnap.data().teacherUid;
        isApproved = studentMetaSnap.data().approved;
      } else {
        throw new Error("Your hero's record could not be found in any guild.");
      }

      const studentSnap = await getDoc(doc(db, 'teachers', teacherUid, 'students', user.uid));
      if (studentSnap.exists()) {
          const studentData = studentSnap.data();

          if (studentData.isArchived) {
              router.push('/account-archived');
              return;
          }

          if (!isApproved) {
            router.push('/awaiting-approval');
            return;
          }

          await logGameEvent(teacherUid, 'ACCOUNT', `${studentSnap.data().characterName} logged in.`);
          const justApproved = studentSnap.data().isNewlyApproved ?? false;
          const teacherData = await getDoc(doc(db, 'teachers', teacherUid));
          const className = teacherData.exists() ? teacherData.data().className : 'the guild';

          router.push(`/dashboard${justApproved ? `?approved=true&className=${encodeURIComponent(className)}` : ''}`);
      } else {
         // This case handles when a student is approved but their document isn't created yet,
         // OR if the student is unapproved.
         await setDoc(doc(db, 'students', user.uid), { teacherUid: teacherUid, approved: false });
         router.push('/awaiting-approval');
      }
  }

  return (
    <div className="space-y-4 rounded-lg bg-background/50 p-4 border">
        <div className="space-y-2">
            <Label htmlFor="login-id"><KeyRound className="inline-block mr-2 h-4 w-4" />Email or Hero's Alias</Label>
            <Input
                id="login-id"
                type="text"
                placeholder="Enter your email or alias"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
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
        <div className="text-center text-sm">
            <Link href="/forgot-password" className="underline text-primary hover:text-primary/80">
                Forgot your password?
            </Link>
        </div>
    </div>
  );
}
