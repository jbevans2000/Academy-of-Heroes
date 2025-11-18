
'use client';

import { useState, useEffect } from 'react';
import { Shield, LogOut, User, MessageSquare, Rss, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Bug, Lightbulb } from "lucide-react";
import { AdminMessageCenter } from './admin-message-center';

interface AdminHeaderProps {
    isAdminPreview?: boolean;
    onOpenMessageCenter: () => void;
    onMarkAllRead: () => void;
    isMarkingRead: boolean;
    hasUnreadMessages?: boolean;
}

export function AdminHeader({ isAdminPreview = false, onOpenMessageCenter, onMarkAllRead, isMarkingRead, hasUnreadMessages }: AdminHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  
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
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-xl">Master Admin Dashboard</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
              <User className="mr-2 h-5 w-5" />
              View as Teacher
          </Button>
           <Button variant="outline" onClick={onOpenMessageCenter} className="relative">
                <MessageSquare className="mr-2 h-5 w-5" />
                Message Center
                {hasUnreadMessages && <span className="absolute top-1 right-1 flex h-3 w-3 rounded-full bg-red-600 animate-pulse" />}
            </Button>
            {hasUnreadMessages && (
                <Button variant="secondary" onClick={onMarkAllRead} disabled={isMarkingRead}>
                    <CheckCheck className="mr-2 h-5 w-5" />
                    Mark All Read
                </Button>
            )}
          <Button onClick={handleLogout} variant="destructive">
            <LogOut className="mr-2 h-5 w-5" />
            Logout
          </Button>
        </div>
      </header>
  );
}
