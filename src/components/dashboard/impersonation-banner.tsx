
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
  const [impersonatedName, setImpersonatedName] = useState('');
  const [impersonationType, setImpersonationType] = useState<'student' | 'admin' | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkImpersonation = async () => {
      const user = auth.currentUser;
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        const claims = idTokenResult.claims;

        if (claims.impersonating) {
            setImpersonating(true);
            
            if (claims.impersonating === 'admin') {
                setImpersonationType('admin');
                const teacherRef = doc(db, 'teachers', user.uid);
                const teacherSnap = await getDoc(teacherRef);
                if (teacherSnap.exists()) {
                    setImpersonatedName(teacherSnap.data().name || 'Teacher');
                }
            } else {
                 setImpersonationType('student');
                 try {
                    const studentMetaRef = doc(db, 'students', user.uid);
                    const studentMetaSnap = await getDoc(studentMetaRef);
                    if (studentMetaSnap.exists()) {
                        const studentTeacherUid = studentMetaSnap.data().teacherUid;
                        const studentRef = doc(db, 'teachers', studentTeacherUid, 'students', user.uid);
                        const studentSnap = await getDoc(studentRef);
                        if (studentSnap.exists()) {
                            setImpersonatedName(studentSnap.data().characterName || 'Student');
                        }
                    }
                } catch (error) {
                     console.error("Error fetching student name for banner:", error);
                }
            }
        } else {
            setImpersonating(false);
            setImpersonationType(null);
            setImpersonatedName('');
        }
      }
    };
    
    const unsubscribe = auth.onIdTokenChanged(checkImpersonation);
    return () => unsubscribe();
  }, []);

  const handleReturn = async () => {
    try {
        await signOut(auth);
        const destination = impersonationType === 'admin' ? '/admin/dashboard' : '/teacher/dashboard';
        router.push(destination);
    } catch (error) {
        console.error("Error during return from impersonation:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not sign out properly. Please log in again manually.',
        });
        const destination = impersonationType === 'admin' ? '/teacher/login' : '/teacher/login';
        router.push(destination);
    }
  };
  
  if (!impersonating) {
    return null;
  }
  
  const returnText = impersonationType === 'admin' ? 'Return to Admin Dashboard' : 'Return to Your Teacher Account';

  return (
    <div className="fixed top-4 left-4 z-50 bg-yellow-500 text-black px-4 py-2 flex flex-col items-start justify-center shadow-lg rounded-lg w-auto">
      <div className="flex items-center gap-2">
        <UserCheck className="h-5 w-5" />
        <span className="font-bold">
            Impersonating: {impersonatedName}
        </span>
      </div>
      <Button size="sm" onClick={handleReturn} variant="destructive" className="mt-2 w-full">
        <LogOut className="mr-2 h-4 w-4" />
        {returnText}
      </Button>
    </div>
  );
}
