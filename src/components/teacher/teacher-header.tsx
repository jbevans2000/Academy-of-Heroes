
'use client';

import { useState, useEffect } from 'react';
import { School, LogOut, LifeBuoy, Shield, User as UserIcon, MessageSquare, Rss, CheckCheck, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Bug, Lightbulb } from "lucide-react";
import { TeacherAdminMessageDialog } from './teacher-admin-message-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Gamepad2 } from 'lucide-react';


interface TeacherHeaderProps {
    isAdminPreview?: boolean;
}

export function TeacherHeader({ isAdminPreview = false }: TeacherHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isFeedbackPanelVisible, setIsFeedbackPanelVisible] = useState(false);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [hasUnreadAdminMessages, setHasUnreadAdminMessages] = useState(false);
  const [hasNewBroadcasts, setHasNewBroadcasts] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        if(currentUser) {
            setTeacher(currentUser);
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
            const teacherData = docSnap.data();
            setHasUnreadAdminMessages(teacherData.hasUnreadAdminMessages || false);

            const lastSeenTimestamp = teacherData.lastSeenBroadcastTimestamp?.toDate() ?? new Date(0);
            
            // Check for new broadcasts
            const broadcastsRef = collection(db, 'settings', 'global', 'broadcasts');
            const q = query(broadcastsRef, orderBy('sentAt', 'desc'), limit(1));
            getDocs(q).then(snapshot => {
                if (!snapshot.empty) {
                    const latestBroadcast = snapshot.docs[0].data();
                    if (latestBroadcast.sentAt) {
                        const latestTimestamp = latestBroadcast.sentAt.toDate();
                        if (latestTimestamp > lastSeenTimestamp) {
                            setHasNewBroadcasts(true);
                        } else {
                            setHasNewBroadcasts(false);
                        }
                    }
                }
            });
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

  return (
    <>
      <TeacherAdminMessageDialog isOpen={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen} />
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="/teacher/dashboard" className="flex items-center gap-2 font-semibold border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 transition-colors">
          <School className="h-6 w-6 text-primary" />
          <span className="text-xl">The Guild Leader's Podium</span>
        </Link>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <Button variant="outline">
                    <Gamepad2 className="mr-2 h-5 w-5" />
                    Game Management
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                 <DropdownMenuItem onClick={() => router.push('/teacher/quests')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    The Quest Archives
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => router.push('/teacher/missions')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Special Missions
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
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
          {isAdminPreview && (
              <Button variant="secondary" onClick={() => router.push('/admin/dashboard')}>
                  <Shield className="mr-2 h-5 w-5" />
                  Return to Admin Dashboard
              </Button>
          )}
           <Button variant="outline" onClick={() => router.push('/teacher/broadcasts')} className="relative">
                <Rss className="mr-2 h-5 w-5" />
                Announcements
                {hasNewBroadcasts && <span className="absolute top-1 right-1 flex h-3 w-3 rounded-full bg-red-600 animate-pulse" />}
            </Button>
          <Button variant="outline" onClick={() => setIsMessageDialogOpen(true)} className="relative">
              <MessageSquare className="mr-2 h-5 w-5" />
              Contact Admin
              {hasUnreadAdminMessages && <span className="absolute top-1 right-1 flex h-3 w-3 rounded-full bg-red-600 animate-pulse" />}
          </Button>
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
