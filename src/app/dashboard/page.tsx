'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { classData } from '@/lib/data';
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'students', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStudent(docSnap.data() as Student);
        } else {
          // Handle case where user exists in Auth but not Firestore
          console.error("No such student document!");
          router.push('/');
        }
      } else {
        // No user is signed in.
        router.push('/');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleAvatarChange = async (avatarUrl: string) => {
    if (student) {
      const docRef = doc(db, 'students', student.uid);
      await updateDoc(docRef, { avatarUrl });
      setStudent(prev => prev ? { ...prev, avatarUrl } : null);
    }
  };

  const handleBackgroundChange = async (backgroundUrl: string) => {
    if (student) {
      const docRef = doc(db, 'students', student.uid);
      await updateDoc(docRef, { backgroundUrl });
      setStudent(prev => prev ? { ...prev, backgroundUrl } : null);
    }
  };


  if (isLoading || !student) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                 <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                        <Skeleton className="h-24 w-full rounded-xl" />
                    </div>
                    <div className="md:col-span-1">
                        <Skeleton className="h-full w-full rounded-xl" />
                    </div>
                </div>
            </main>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <DashboardHeader characterName={student.characterName}/>
      <main className="flex-1">
        <DashboardClient
          student={student}
          avatars={classData[student.class]?.avatars || []}
          backgrounds={classData[student.class]?.backgrounds || []}
          onAvatarChange={handleAvatarChange}
          onBackgroundChange={handleBackgroundChange}
        />
      </main>
    </div>
  );
}
