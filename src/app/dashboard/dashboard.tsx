
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, collection, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function Dashboard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApprovedDialog, setShowApprovedDialog] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isApproved = searchParams.get('approved') === 'true';
    if (isApproved) {
        setShowApprovedDialog(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Since we don't know the teacher UID on the client, we have to find it.
        // This is inefficient but necessary with the current data structure.
        const teachersSnapshot = await getDocs(collection(db, 'teachers'));
        let foundStudent = false;

        for (const teacherDoc of teachersSnapshot.docs) {
          const studentRef = doc(db, 'teachers', teacherDoc.id, 'students', user.uid);
          const studentSnap = await getDoc(studentRef);

          if (studentSnap.exists()) {
            const studentData = studentSnap.data() as Student;
            
            // Start listening to this student's document for real-time updates
            const unsub = onSnapshot(studentRef, (docSnap) => {
              if (docSnap.exists()) {
                setStudent(docSnap.data() as Student);
              } else {
                router.push('/');
              }
            });
            
            setIsLoading(false);
            foundStudent = true;
            // It's important to return a cleanup function for the listener
            return () => unsub();
          }

          const pendingStudentRef = doc(db, 'teachers', teacherDoc.id, 'pendingStudents', user.uid);
          const pendingStudentSnap = await getDoc(pendingStudentRef);
           if (pendingStudentSnap.exists()) {
              router.push('/awaiting-approval');
              foundStudent = true;
              break;
           }
        }

        if (!foundStudent) {
            console.error(`No teacher found for student with UID: ${user.uid}`);
            router.push('/');
        }

      } else {
        // No user is signed in.
        setIsLoading(false);
        router.push('/');
      }
    });

    // Return the unsubscribe function for the auth listener
    return () => authUnsubscribe();
  }, [router]);
  
  const handleCloseApprovedDialog = async () => {
    setShowApprovedDialog(false);
    if (student) {
      const studentRef = doc(db, 'teachers', student.teacherUid, 'students', student.uid);
      await updateDoc(studentRef, { isNewlyApproved: false });
    }
    router.replace('/dashboard', { scroll: false });
  };
  
  const approvedClassName = searchParams.get('className');


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
      <AlertDialog open={showApprovedDialog} onOpenChange={setShowApprovedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Congratulations, Hero!</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground">
              You have been approved to join the {approvedClassName || 'guild'}! Your adventure begins now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseApprovedDialog}>Begin Your Quest</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DashboardHeader characterName={student.characterName}/>
      <main className="flex-1">
        <DashboardClient student={student} />
      </main>
    </div>
  );
}

    