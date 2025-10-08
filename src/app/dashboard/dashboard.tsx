
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp, Timestamp, collection, query, where, getDocs, deleteField } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Student, Company } from '@/lib/data';
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
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MeditationChamber } from '@/components/dashboard/meditation-chamber';


const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

interface TeacherData {
    levelingTable?: { [level: number]: number };
    dailyRegenPercentage?: number;
    isDailyReminderActive?: boolean;
    dailyReminderTitle?: string;
    dailyReminderMessage?: string;
    worldMapUrl?: string;
}

export default function Dashboard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApprovedDialog, setShowApprovedDialog] = useState(false);

  // Daily Reminder State
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminder, setReminder] = useState<{ title: string; message: string } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

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
          const { teacherUid, approved } = studentMetaSnap.data();

          if (user.disabled) {
            router.push('/account-archived');
            return;
          }
          
          if (!approved) {
             router.push('/awaiting-approval');
             return;
          }
          
          const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
          const unsub = onSnapshot(studentRef, async (docSnap) => {
            if (docSnap.exists()) {
              let studentData = { uid: docSnap.id, ...docSnap.data() } as Student;
              
              if (studentData.forceLogout) {
                  await updateDoc(studentRef, { forceLogout: false });
                  await auth.signOut();
                  toast({
                      title: "Session Expired",
                      description: "Your Guild Leader has ended your session. Please log in again.",
                  });
                  return;
              }

              if (studentData.isArchived) {
                router.push('/account-archived');
                return;
              }

              // Handle automatic release from meditation
              if (studentData.isInMeditationChamber && studentData.meditationReleaseAt) {
                  const releaseTime = (studentData.meditationReleaseAt as Timestamp).toDate();
                  if (new Date() >= releaseTime) {
                      // Automatically release the student
                      await updateDoc(studentRef, {
                          isInMeditationChamber: false,
                          meditationMessage: deleteField(),
                          meditationReleaseAt: deleteField(),
                          meditationDuration: deleteField(),
                      });
                      // studentData will be updated by the onSnapshot listener,
                      // so we don't need to setStudent here. The component will re-render.
                      return; // Exit this snapshot handler to wait for the next one
                  }
              }
              
              const teacherRef = doc(db, 'teachers', teacherUid);
              const teacherSnap = await getDoc(teacherRef);
              const fetchedTeacherData = teacherSnap.exists() ? (teacherSnap.data() as TeacherData) : null;
              setTeacherData(fetchedTeacherData);

              if (studentData.companyId) {
                const companyRef = doc(db, 'teachers', teacherUid, 'companies', studentData.companyId);
                const companySnap = await getDoc(companyRef);
                if (companySnap.exists()) {
                    setCompany(companySnap.data() as Company);
                } else {
                    setCompany(null);
                }
              } else {
                  setCompany(null);
              }
              
              const today = new Date();
              let updates: Partial<Student> = {};
              let performedRegen = false;

              // --- DAILY REGENERATION LOGIC ---
              const lastRegenDate = studentData.lastDailyRegen?.toDate();
              if (!lastRegenDate || !isSameDay(today, lastRegenDate)) {
                  const regenPercent = (fetchedTeacherData?.dailyRegenPercentage || 0) / 100;

                  if (regenPercent > 0) {
                      const hpRegen = Math.ceil(studentData.maxHp * regenPercent);
                      const mpRegen = Math.ceil(studentData.maxMp * regenPercent);
                      
                      const newHp = Math.min(studentData.maxHp, studentData.hp + hpRegen);
                      const newMp = Math.min(studentData.maxMp, studentData.mp + mpRegen);

                      if (newHp !== studentData.hp || newMp !== studentData.mp) {
                        updates.hp = newHp;
                        updates.mp = newMp;
                      }
                  }
                  
                  updates.lastDailyRegen = serverTimestamp();
                  performedRegen = true;
              }
              
              if (performedRegen && Object.keys(updates).length > 1) { // more than just timestamp
                  await updateDoc(studentRef, updates);
                  // The onSnapshot listener will pick up this change and update the state.
              } else {
                 setStudent(studentData);
              }
              // --- END REGENERATION LOGIC ---
              
              // --- DAILY REMINDER LOGIC ---
              const reminderShown = sessionStorage.getItem('dailyReminderShown');
              if (!reminderShown && fetchedTeacherData) {
                if (fetchedTeacherData.isDailyReminderActive) {
                    const title = fetchedTeacherData.dailyReminderTitle || "A Hero's Duty Awaits!";
                    const message = fetchedTeacherData.dailyReminderMessage || "Greetings, adventurer! A new day dawns, and the realm of Luminaria has a quest with your name on it. Your legend will not write itself! Embark on a chapter from the World Map to continue your training. For each quest you complete, you will be rewarded with valuable **Experience (XP)** to grow stronger and **Gold** to fill your coffers.\\n\\nYour next great deed awaits!";
                    setReminder({ title, message });
                    setShowReminderDialog(true);
                    sessionStorage.setItem('dailyReminderShown', 'true');
                }
              }
              // --- END REMINDER LOGIC ---
              setIsLoading(false); // Data is loaded or initial logic is complete
            } else {
              await auth.signOut();
              router.push('/');
            }
          }, (error) => {
             console.error("Error listening to student document:", error);
             router.push('/');
          });
          
          return () => unsub();
        } else {
          await auth.signOut();
          router.push('/');
        }
      } else {
        router.push('/');
      }
    });

    return () => authUnsubscribe();
  }, [router, toast]);
  
  const handleCloseApprovedDialog = async () => {
    setShowApprovedDialog(false);
    if (student) {
      const studentMetaRef = doc(db, 'students', student.uid);
      const metaSnap = await getDoc(studentMetaRef);
      if (metaSnap.exists()) {
        const studentRef = doc(db, 'teachers', metaSnap.data().teacherUid, 'students', student.uid);
        await updateDoc(studentRef, { isNewlyApproved: false });
      }
    }
    router.replace('/dashboard', { scroll: false });
  };
  
  const approvedClassName = searchParams.get('className');
  const backgroundUrl = company?.backgroundUrl || teacherData?.worldMapUrl || 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Sep%2027%2C%202025%2C%2009_44_04%20AM.png?alt=media&token=0920ef19-d5d9-43b1-bab7-5ab134373ed3';

  if (isLoading || !student || !teacherData) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                 <div className="mx-auto max-w-4xl space-y-6">
                    <Skeleton className="h-[450px] w-full rounded-xl" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            </main>
        </div>
    );
  }

  if (student.isInMeditationChamber) {
    return (
        <MeditationChamber student={student} teacherUid={student.teacherUid} />
    );
  }

  return (
    <div 
        className="flex min-h-screen w-full flex-col bg-center bg-no-repeat"
        style={{ 
            backgroundImage: backgroundUrl ? `url('${backgroundUrl}')` : 'none',
            backgroundColor: backgroundUrl ? '' : 'hsl(var(--background))',
            backgroundSize: '60%',
        }}
    >
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
                <AlertDialogDescription className="text-base text-foreground whitespace-pre-wrap">
                  {reminder?.message}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction>Got it!</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DashboardHeader characterName={student.characterName}/>
      <main className="flex-1 bg-background/50 backdrop-blur-sm">
        <DashboardClient student={student} />
      </main>
    </div>
  );
}
