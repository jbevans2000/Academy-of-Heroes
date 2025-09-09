
'use client';

import { useState, useEffect } from 'react';
import { School, LogOut, LifeBuoy, Shield, User as UserIcon, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Bug, Lightbulb } from "lucide-react";
import { TeacherMessageCenter } from './teacher-message-center';

export function TeacherHeader() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFeedbackPanelVisible, setIsFeedbackPanelVisible] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [isMessageCenterOpen, setIsMessageCenterOpen] = useState(false);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        if(currentUser) {
            setTeacher(currentUser);
            const adminRef = doc(db, 'admins', currentUser.uid);
            const adminSnap = await getDoc(adminRef);
            if (adminSnap.exists()) {
                setIsAdmin(true);
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
    };
  }, []);
  
  useEffect(() => {
    if (!teacher) return;
    const teacherRef = doc(db, 'teachers', teacher.uid);
    const unsubscribeTeacher = onSnapshot(teacherRef, (docSnap) => {
        if (docSnap.exists()) {
            setHasUnread(docSnap.data().hasUnreadTeacherMessages || false);
        }
    });

    return () => unsubscribeTeacher();
  }, [teacher]);


  const handleLogout = async () => {
    try {
        await signOut(auth);
        toast({
            title: 'Logged Out',
            description: 'You have been successfully logged out.',
        });
        router.push('/');
    } catch (error) {
        console.error("Error signing out: ", error);
        toast({
            variant: 'destructive',
            title: 'Logout Failed',
            description: 'There was an issue signing you out. Please try again.',
        });
    }
  };
  
  const handleOpenMessageCenter = async () => {
    setIsMessageCenterOpen(true);
    if (teacher && hasUnread) {
        const teacherRef = doc(db, 'teachers', teacher.uid);
        await updateDoc(teacherRef, { hasUnreadTeacherMessages: false });
        setHasUnread(false);
    }
  }

  return (
    <>
    {teacher && <TeacherMessageCenter 
        teacher={teacher}
        isMessageOpen={isMessageCenterOpen}
        onMessageOpenChange={setIsMessageCenterOpen}
    />}
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <Link href="/teacher/dashboard" className="flex items-center gap-2 font-semibold border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 transition-colors">
        <School className="h-6 w-6 text-primary" />
        <span className="text-xl">The Guild Leader's Podium</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {isFeedbackPanelVisible && (
            <>
                 <Button variant="outline" size="sm" onClick={() => router.push('/teacher/feedback?type=bug')}>
                    <Bug className="mr-2 h-4 w-4" /> Report a Bug
                </Button>
                 <Button variant="outline" size="sm" onClick={() => router.push('/teacher/feedback?type=feature')}>
                    <Lightbulb className="mr-2 h-4 w-4" /> Request a Feature
                </Button>
            </>
        )}
        <Button variant="outline" onClick={handleOpenMessageCenter} className="relative">
            <MessageSquare className="mr-2 h-5 w-5" />
            Message Center
            {hasUnread && <span className="absolute top-1 right-1 flex h-3 w-3 rounded-full bg-red-600 animate-pulse" />}
        </Button>
        {isAdmin && (
             <Button variant="secondary" onClick={() => router.push('/admin/dashboard')}>
                <Shield className="mr-2 h-5 w-5" />
                Return to Admin Dashboard
            </Button>
        )}
        <Button variant="outline" onClick={() => router.push('/teacher/profile')}>
            <UserIcon className="mr-2 h-5 w-5" />
            My Profile
        </Button>
        <Button variant="outline" onClick={() => router.push('/teacher/help')}>
            <LifeBuoy className="mr-2 h-5 w-5" />
            Help
        </Button>
        <Button onClick={handleLogout} className="bg-amber-500 hover:bg-amber-600 text-white">
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </div>
    </header>
    </>
  );
}
