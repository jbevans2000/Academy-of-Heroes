
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sword, LogOut, LifeBuoy, Bug, Lightbulb, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { StudentMessageDialog } from './student-message-dialog';
import { useToast } from '@/hooks/use-toast';
import { updatePresence } from '@/lib/presence';

interface DashboardHeaderProps {
    characterName?: string;
}

export function DashboardHeader({ characterName = 'Account' }: DashboardHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isFeedbackPanelVisible, setIsFeedbackPanelVisible] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(async (isInactive = false) => {
    if (auth.currentUser && teacherUid) {
      await updatePresence(teacherUid, auth.currentUser.uid, 'offline');
    }

    await signOut(auth);
    
    if (isInactive) {
        toast({
            title: 'Session Ended',
            description: 'You have been logged out due to inactivity.',
            duration: 5000,
        });
    } else {
        toast({
            title: 'Logged Out',
            description: 'You have been successfully signed out.',
        });
    }
    router.push('/');
  }, [router, toast, teacherUid]);
  
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
        handleLogout(true);
    }, 30 * 60 * 1000); // 30 minutes
  }, [handleLogout]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
       if (currentUser) {
        resetInactivityTimer();
        const studentMetaRef = doc(db, 'students', currentUser.uid);
        const studentMetaSnap = await getDoc(studentMetaRef);
        if (studentMetaSnap.exists()) {
          const foundTeacherUid = studentMetaSnap.data().teacherUid;
          setTeacherUid(foundTeacherUid);
        }
      } else {
        if(inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      }
    });

    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            setIsFeedbackPanelVisible(docSnap.data().isFeedbackPanelVisible || false);
        }
    });

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));
    
    return () => {
        unsubscribeAuth();
        unsubscribeSettings();
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
    }
  }, [resetInactivityTimer]);

  useEffect(() => {
    if (!user || !teacherUid) return;

    // Set presence to online now that we have all necessary info
    updatePresence(teacherUid, user.uid, 'online');

    const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
    const unsubscribeStudent = onSnapshot(studentRef, (studentDoc) => {
        if (studentDoc.exists() && studentDoc.data().hasUnreadMessages) {
            setHasUnreadMessages(true);
        } else {
            setHasUnreadMessages(false);
        }
    });

    const setOffline = () => {
        if (auth.currentUser && teacherUid) {
            updatePresence(teacherUid, auth.currentUser.uid, 'offline');
        }
    }

    window.addEventListener('beforeunload', setOffline);

    return () => {
        unsubscribeStudent();
        setOffline();
        window.removeEventListener('beforeunload', setOffline);
    };
  }, [user, teacherUid]);


  return (
    <>
    <StudentMessageDialog isOpen={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen} />
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <Sword className="h-6 w-6 text-primary" />
        <span className="text-xl">The Academy of Heroes</span>
      </Link>
      <div className="ml-auto flex items-center gap-4">
        {isFeedbackPanelVisible && (
            <>
                 <Button variant="outline" size="sm" onClick={() => router.push('/teacher/feedback?type=bug&from=student')}>
                    <Bug className="mr-2 h-4 w-4" /> Report a Bug
                </Button>
                 <Button variant="outline" size="sm" onClick={() => router.push('/teacher/feedback?type=feature&from=student')}>
                    <Lightbulb className="mr-2 h-4 w-4" /> Request a Feature
                </Button>
            </>
        )}
        <Button variant="outline" onClick={() => setIsMessageDialogOpen(true)}>
            <Mail className="mr-2 h-5 w-5" />
            Contact Guild Leader
            {hasUnreadMessages && <span className="ml-2 flex h-3 w-3 translate-y-[-5px] translate-x-[-5px] rounded-full bg-red-600" />}
        </Button>
          <Link href="/dashboard/help" passHref>
            <Button variant="outline">
                <LifeBuoy className="mr-2 h-5 w-5" />
                Help
            </Button>
          </Link>
          <Button onClick={() => handleLogout(false)} className="bg-amber-500 hover:bg-amber-600 text-white">
              <LogOut className="mr-2 h-5 w-5" />
              Logout
          </Button>
      </div>
    </header>
    </>
  );
}
