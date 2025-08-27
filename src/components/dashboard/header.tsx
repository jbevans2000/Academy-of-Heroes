

'use client';

import { useState, useEffect } from 'react';
import { Sword, LogOut, LifeBuoy, Bug, Lightbulb, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const studentMetaRef = doc(db, 'students', user.uid);
    const unsubMeta = onSnapshot(studentMetaRef, (docSnap) => {
        if (docSnap.exists()) {
            const teacherUid = docSnap.data().teacherUid;
            const messagesQuery = query(
                collection(db, 'teachers', teacherUid, 'students', user.uid, 'messages'),
                where('isRead', '==', false),
                where('sender', '==', 'teacher')
            );
            const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
                setHasUnreadMessages(!snapshot.empty);
            });
            return () => unsubscribeMessages();
        }
    });

    return () => unsubMeta();
  }, [user]);

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
