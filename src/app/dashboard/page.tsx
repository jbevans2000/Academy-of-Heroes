
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

const findTeacherForStudent = async (studentUid: string): Promise<string | null> => {
    const teachersRef = collection(db, 'teachers');
    const teacherSnapshot = await getDocs(teachersRef);

    for (const teacherDoc of teacherSnapshot.docs) {
      const studentDocRef = doc(db, 'teachers', teacherDoc.id, 'students', studentUid);
      const studentSnap = await getDoc(studentDocRef);
      if (studentSnap.exists()) {
        return teacherDoc.id;
      }
    }
    return null;
}

export default function DashboardPage() {
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
        // Dynamically find the teacher for the logged-in student
        const teacherUid = await findTeacherForStudent(user.uid);

        if (teacherUid) {
            const docRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
            
            const snapshotUnsubscribe = onSnapshot(docRef, (docSnap) => {
              if (docSnap.exists()) {
                setStudent(docSnap.data() as Student);
              } else {
                console.error("Student document not found for a validated user. This could happen if the document was deleted after login.");
                router.push('/');
              }
              setIsLoading(false);
            }, (error) => {
                console.error("Error listening to student document:", error);
                setIsLoading(false);
                router.push('/');
            });
            return () => snapshotUnsubscribe();
        } else {
             // This case handles if a user is authenticated but has no student record under ANY teacher.
             console.error(`No teacher found for student with UID: ${user.uid}`);
             const pendingCheckTeachers = await getDocs(collection(db, 'teachers'));
             let foundPending = false;
             for (const teacherDoc of pendingCheckTeachers.docs) {
                 const pendingDoc = await getDoc(doc(db, 'teachers', teacherDoc.id, 'pendingStudents', user.uid));
                 if (pendingDoc.exists()) {
                     foundPending = true;
                     break;
                 }
             }
             if (foundPending) {
                 router.push('/awaiting-approval');
             } else {
                router.push('/');
             }
             setIsLoading(false);
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
      const teacherUid = await findTeacherForStudent(student.uid);
      if (teacherUid) {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', student.uid);
        await updateDoc(studentRef, { isNewlyApproved: false });
      }
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

    