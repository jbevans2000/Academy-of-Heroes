
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
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

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

export default function Dashboard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApprovedDialog, setShowApprovedDialog] = useState(false);

  // Daily Reminder State
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminder, setReminder] = useState<{ title: string; message: string } | null>(null);

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
          const unsub = onSnapshot(studentRef, async (docSnap) => {
            if (docSnap.exists()) {
              const studentData = { uid: docSnap.id, ...docSnap.data() } as Student;
              if (studentData.isArchived) {
                router.push('/account-archived');
                return;
              }
              
              const today = new Date();
              let updates: Partial<Student> = {};
              let performedRegen = false;

              // --- DAILY REGENERATION LOGIC ---
              const lastRegenDate = studentData.lastDailyRegen?.toDate();
              if (!lastRegenDate || !isSameDay(today, lastRegenDate)) {
                  const hpRegen = Math.ceil(studentData.maxHp * 0.05);
                  const mpRegen = Math.ceil(studentData.maxMp * 0.05);
                  
                  const newHp = Math.min(studentData.maxHp, studentData.hp + hpRegen);
                  const newMp = Math.min(studentData.maxMp, studentData.mp + mpRegen);

                  if (newHp !== studentData.hp || newMp !== studentData.mp) {
                    updates.hp = newHp;
                    updates.mp = newMp;
                  }
                  
                  updates.lastDailyRegen = serverTimestamp();
                  performedRegen = true;
              }
              
              if (performedRegen) {
                  await updateDoc(studentRef, updates);
                  // The onSnapshot listener will pick up this change and update the state.
              } else {
                 setStudent(studentData);
              }
              // --- END REGENERATION LOGIC ---
              
              // --- DAILY REMINDER LOGIC ---
              const lastChapterDate = studentData.lastChapterCompletion?.toDate();
              const hasCompletedToday = lastChapterDate && isSameDay(today, lastChapterDate);
              const reminderShown = sessionStorage.getItem('dailyReminderShown');
              if (!hasCompletedToday && !reminderShown) {
                const teacherRef = doc(db, 'teachers', foundTeacherUid);
                const teacherSnap = await getDoc(teacherRef);
                if (teacherSnap.exists()) {
                    const teacherData = teacherSnap.data();
                    const title = teacherData.dailyReminderTitle || "A Hero's Duty Awaits!";
                    const message = teacherData.dailyReminderMessage || "Greetings, adventurer! A new day dawns, and the realm of Luminaria has a quest with your name on it. Your legend will not write itself! Embark on a chapter from the World Map to continue your training. For each quest you complete, you will be rewarded with valuable **Experience (XP)** to grow stronger and **Gold** to fill your coffers. Your next great deed awaits!";
                    setReminder({ title, message });
                    setShowReminderDialog(true);
                    sessionStorage.setItem('dailyReminderShown', 'true');
                }
              }
              // --- END REMINDER LOGIC ---

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

      <AlertDialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl">{reminder?.title}</AlertDialogTitle>
                <AlertDialogDescription className="text-base text-foreground" dangerouslySetInnerHTML={{ __html: reminder?.message.replace(/\n/g, '<br/>') || '' }} />
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction>Embark!</AlertDialogAction>
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
