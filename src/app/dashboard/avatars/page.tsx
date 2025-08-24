
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { avatarData } from '@/lib/avatars';
import { DashboardHeader } from '@/components/dashboard/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CheckCircle, UserCheck } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function ChangeAvatarPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [avatarToConfirm, setAvatarToConfirm] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const studentMetaRef = doc(db, 'students', user.uid);
        const studentMetaSnap = await getDoc(studentMetaRef);

        if (studentMetaSnap.exists()) {
          const teacherUid = studentMetaSnap.data().teacherUid;
          const studentRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
          const studentSnap = await getDoc(studentRef);

          if (studentSnap.exists()) {
            const studentData = { uid: studentSnap.id, ...studentSnap.data() } as Student;
            setStudent(studentData);
            setIsLoading(false);
          } else {
            router.push('/');
          }
        } else {
          router.push('/');
        }
      } else {
        router.push('/');
      }
    });

    return () => authUnsubscribe();
  }, [router]);

  const handleAvatarClick = (url: string) => {
    if (url === student?.avatarUrl) return; // Don't open dialog for the current avatar
    setAvatarToConfirm(url);
    setIsConfirming(true);
  };

  const handleConfirmSave = async () => {
    if (!student || !avatarToConfirm) {
        setIsConfirming(false);
        return;
    };
    setIsSaving(true);

    try {
        const studentRef = doc(db, 'teachers', student.teacherUid, 'students', student.uid);
        await updateDoc(studentRef, { avatarUrl: avatarToConfirm });
        toast({
            title: 'Avatar Updated!',
            description: 'Your hero has a new look.',
        });
        setStudent(prev => prev ? { ...prev, avatarUrl: avatarToConfirm } : null);
        router.push('/dashboard');
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not save your new avatar. Please try again.',
        });
        console.error("Error updating avatar:", error);
    } finally {
        setIsSaving(false);
        setIsConfirming(false);
        setAvatarToConfirm(null);
    }
  };
  
  const renderAvatarGroups = () => {
    if (!student) return null;

    const { class: studentClass, level = 1 } = student;
    const classAvatars = avatarData[studentClass];
    if (!classAvatars) return <p>No avatars available for your class.</p>;

    const unlockedLevels = Object.keys(classAvatars)
        .map(Number)
        .filter(l => l <= level)
        .sort((a,b) => a-b);
    
    return unlockedLevels.map(lvl => (
        <div key={lvl}>
            <h3 className="text-2xl font-bold font-headline mb-4">Level {lvl} Avatars</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {classAvatars[lvl].map((url: string, index: number) => (
                    <div 
                        key={`${lvl}-${index}`} 
                        className={cn(
                            "relative p-2 border-4 rounded-lg cursor-pointer transition-all duration-300 hover:scale-110",
                            student.avatarUrl === url ? 'border-primary ring-4 ring-primary/50' : 'border-transparent hover:border-primary/50'
                        )}
                        onClick={() => handleAvatarClick(url)}
                    >
                        <Image src={url} alt={`Avatar level ${lvl} - ${index + 1}`} width={200} height={200} className="w-full h-auto rounded-md object-cover" />
                         {student.avatarUrl === url && (
                            <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                                <UserCheck className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
             <hr className="my-6" />
        </div>
    ));
  };
  
   if (isLoading || !student) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <Skeleton className="h-10 w-48 mb-6" />
                <Skeleton className="h-96 w-full" />
            </main>
        </div>
    );
  }

  const nextUnlockLevel = student.level + 1;
  const isMaxLevel = student.level >= 20;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader className="items-center">
                    <AlertDialogTitle>Set this as your new Avatar?</AlertDialogTitle>
                    <div className="relative w-[500px] h-[500px] my-4">
                        {avatarToConfirm && (
                            <Image src={avatarToConfirm} alt="Avatar to confirm" fill className="object-contain rounded-lg" />
                        )}
                    </div>
                    <AlertDialogDescription>
                       This will become your new look across the realm.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Change Your Avatar Image
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <DashboardHeader characterName={student.characterName}/>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                     <Button variant="outline" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-headline">Choose Your Avatar</CardTitle>
                        <CardDescription>
                            {isMaxLevel 
                                ? "You have unlocked all avatar images! You have ascended!" 
                                : `Select from any of your unlocked looks. New avatars unlock at Level ${nextUnlockLevel}!`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderAvatarGroups()}
                    </CardContent>
                </Card>
            </div>
        </main>
    </div>
  );
}
