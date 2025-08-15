
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // We have a user, now set up the real-time listener for their data
        const docRef = doc(db, 'students', user.uid);
        
        const snapshotUnsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setStudent(docSnap.data() as Student);
          } else {
            // This case handles if the student document is ever deleted while they are logged in
            console.error("No such student document!");
            router.push('/');
          }
          setIsLoading(false);
        }, (error) => {
            console.error("Error listening to student document:", error);
            setIsLoading(false);
            router.push('/');
        });

        // Return the unsubscribe function for the snapshot listener
        // This will be called when the component unmounts
        return () => snapshotUnsubscribe();

      } else {
        // No user is signed in.
        setIsLoading(false);
        router.push('/');
      }
    });

    // Return the unsubscribe function for the auth listener
    return () => authUnsubscribe();
  }, [router]);

  if (isLoading || !student) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                 <div className="space-y-6">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
            </main>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <DashboardHeader characterName={student.characterName}/>
      <main className="flex-1">
        <DashboardClient student={student} />
      </main>
    </div>
  );
}
