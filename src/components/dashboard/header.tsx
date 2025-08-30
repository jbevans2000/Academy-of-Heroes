

'use client';

import { useState, useEffect } from 'react';
import { Sword, LogOut, LifeBuoy, Bug, Lightbulb, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { StudentMessageDialog } from './student-message-dialog';

interface DashboardHeaderProps {
    characterName?: string;
}

export function DashboardHeader({ characterName = 'Account' }: DashboardHeaderProps) {
  const router = useRouter();
  const [isFeedbackPanelVisible, setIsFeedbackPanelVisible] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
       if (currentUser) {
        const studentMetaRef = doc(db, 'students', currentUser.uid);
        const studentMetaSnap = await getDoc(studentMetaRef);
        if (studentMetaSnap.exists()) {
          setTeacherUid(studentMetaSnap.data().teacherUid);
        }
      }
    });
     const settingsRef = doc(db, 'settings', 'global');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            setIsFeedbackPanelVisible(docSnap.data().isFeedbackPanelVisible || false);
        }
    });

    return () => {
        unsubscribeAuth();
        unsubscribeSettings();
    }
  }, []);

  useEffect(() => {
    if (!user || !teacherUid) return;

    // Listener for unread messages
    const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
    const unsubscribeStudent = onSnapshot(studentRef, (studentDoc) => {
        if (studentDoc.exists() && studentDoc.data().hasUnreadMessages) {
            setHasUnreadMessages(true);
        } else {
            setHasUnreadMessages(false);
        }
    });

    // Effect to manage online presence
    const setOnline = () => {
      updateDoc(studentRef, {
        onlineStatus: { status: 'online', lastSeen: serverTimestamp() }
      });
    };

    const setOffline = () => {
      // Check if studentRef still exists before trying to update
      if (studentRef) {
          updateDoc(studentRef, {
              onlineStatus: { status: 'offline', lastSeen: serverTimestamp() }
          }).catch(error => {
              // This can happen on logout if component unmounts too fast. It's safe to ignore.
              console.log("Benign error on logout/unmount:", error.message);
          });
      }
    };
    
    setOnline(); // Set online when component mounts/user is identified

    window.addEventListener('beforeunload', setOffline);

    return () => {
        unsubscribeStudent();
        setOffline(); // Set offline when component unmounts
        window.removeEventListener('beforeunload', setOffline);
    };
  }, [user, teacherUid]);


  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

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
          <Button onClick={handleLogout} className="bg-amber-500 hover:bg-amber-600 text-white">
              <LogOut className="mr-2 h-5 w-5" />
              Logout
          </Button>
      </div>
    </header>
    </>
  );
}
