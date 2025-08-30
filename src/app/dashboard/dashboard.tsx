
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardClient } from './dashboard-client';
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
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
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
        const studentMetaRef = doc(db, 'students', user.uid);
        const studentMetaSnap = await getDoc(studentMetaRef);

        if (studentMetaSnap.exists()) {
          const { teacherUid: foundTeacherUid, approved } = studentMetaSnap.data();
          setTeacherUid(foundTeacherUid);
          
          if (!approved) {
             router.push('/awaiting-approval');
             return;
          }
          
          const studentRef = doc(db, 'teachers', foundTeacherUid, 'students', user.uid);
          const unsub = onSnapshot(studentRef, (docSnap) => {
            if (docSnap.exists()) {
              const studentData = { uid: docSnap.id, ...docSnap.data() } as Student;
              if (studentData.isArchived) {
                router.push('/account-archived');
                return;
              }
              setStudent(studentData);
              setIsLoading(false);
            } else {
              setIsLoading(true);
            }
          }, (error) => {
             console.error("Error listening to student document:", error);
             router.push('/');
          });
          
          return () => unsub();
        } else {
          console.error(`No teacher metadata found for student with UID: ${user.uid}`);
          router.push('/');
        }
      } else {
        setIsLoading(false);
        router.push('/');
      }
    });

    return () => authUnsubscribe();
  }, [router]);
  
  const handleCloseApprovedDialog = async () => {
    setShowApprovedDialog(false);
    if (student && teacherUid) {
      const studentRef = doc(db, 'teachers', teacherUid, 'students', student.uid);
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
