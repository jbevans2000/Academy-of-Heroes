
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { LogOut, UserCheck } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';

export function ImpersonationBanner() {
  const [impersonating, setImpersonating] = useState(false);
  const [studentName, setStudentName] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkImpersonation = async () => {
      const user = auth.currentUser;
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        const claims = idTokenResult.claims;
        if (claims.impersonating && claims.original_uid) {
            setImpersonating(true);
            try {
                const studentMetaRef = doc(db, 'students', user.uid);
                const studentMetaSnap = await getDoc(studentMetaRef);
                if (studentMetaSnap.exists()) {
                    const studentTeacherUid = studentMetaSnap.data().teacherUid;
                    const studentRef = doc(db, 'teachers', studentTeacherUid, 'students', user.uid);
                    const studentSnap = await getDoc(studentRef);
                    if (studentSnap.exists()) {
                        setStudentName(studentSnap.data().characterName || 'Student');
                    }
                }
            } catch (error) {
                 console.error("Error fetching student name for banner:", error);
            }
        }
      }
    };
    
    // We need to listen to auth state changes to catch the impersonated sign-in
    const unsubscribe = auth.onIdTokenChanged(checkImpersonation);
    return () => unsubscribe();
  }, []);

  const handleReturnToTeacher = async () => {
    try {
        await signOut(auth);
        router.push('/teacher/login');
    } catch (error) {
        console.error("Error during return to teacher account:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not sign out properly. Please log in again manually.',
        });
        router.push('/teacher/login');
    }
  };
  
  if (!impersonating) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 bg-yellow-500 text-black px-4 py-2 flex flex-col items-start justify-center shadow-lg rounded-lg w-auto">
      <div className="flex items-center gap-2">
        <UserCheck className="h-5 w-5" />
        <span className="font-bold">
            Impersonating: {studentName}
        </span>
      </div>
      <Button size="sm" onClick={handleReturnToTeacher} variant="destructive" className="mt-2 w-full">
        <LogOut className="mr-2 h-4 w-4" />
        Log Back in as a Teacher
      </Button>
    </div>
  );
}
