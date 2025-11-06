
"use client";

import { useState, useEffect } from 'react';
import type { Student } from "@/lib/data";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AvatarDisplay } from "@/components/dashboard/avatar-display";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Map, Swords, Sparkles, BookHeart, Gem, Package, Hammer, Briefcase, Loader2, Trophy, ScrollText, BookOpen, Star as StarIcon, Users } from "lucide-react";
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompanyDisplay } from '@/components/dashboard/company-display';
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
import { ChallengeDialog } from '@/components/dashboard/challenge-dialog';
import { getDuelSettings } from '@/ai/flows/manage-duels';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AvatarLogDialog } from '@/components/dashboard/avatar-log-dialog';
import { xpForLevel as defaultXpTable } from '@/lib/game-mechanics';

interface DashboardClientProps {
  student: Student;
  isTeacherPreview?: boolean;
}

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

export function DashboardClient({ student, isTeacherPreview = false }: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [isFreelancerAlertOpen, setIsFreelancerAlertOpen] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<Student[]>([]);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [isChallengeDialogOpen, setIsChallengeDialogOpen] = useState(false);
  const [activeDuelRequest, setActiveDuelRequest] = useState<any>(null);
  const [isAvatarLogOpen, setIsAvatarLogOpen] = useState(false);
  const [isDailyTrainingEnabled, setIsDailyTrainingEnabled] = useState(true);
  const [levelingTable, setLevelingTable] = useState(defaultXpTable);

  useEffect(() => {
    const fetchTeacherSettings = async () => {
        if (!student.teacherUid) return;
        const teacherRef = doc(db, 'teachers', student.teacherUid);
        const teacherSnap = await getDoc(teacherRef);
        if (teacherSnap.exists()) {
            const data = teacherSnap.data();
            if (data.levelingTable && Object.keys(data.levelingTable).length > 0) {
                setLevelingTable(data.levelingTable);
            }
        }
    };
    fetchTeacherSettings();
  }, [student.teacherUid]);


  useEffect(() => {
    // Check for the ready_for_battle URL parameter on page load
    const params = new URLSearchParams(window.location.search);
    if (params.get('ready_for_battle') === 'true') {
      // Clear the parameter from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Now proceed to the battle
      const enterBattle = async () => {
        if (!student.teacherUid) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot find your teacher\'s guild.' });
            return;
        }
        const studentRef = doc(db, 'teachers', student.teacherUid, 'students', student.uid);
        await updateDoc(studentRef, { inBattle: true });
        router.push('/battle/live');
      }
      enterBattle();
    }
  }, [student, router, toast]);
  
  useEffect(() => {
    if (!student.teacherUid || isTeacherPreview) return;
    
    // Fetch duel settings to check if daily training is enabled
    getDuelSettings(student.teacherUid).then(settings => {
        setIsDailyTrainingEnabled(settings.isDailyTrainingEnabled ?? true);
    });

    const duelsRef = collection(db, 'teachers', student.teacherUid, 'duels');
    const q = query(duelsRef, where('opponentUid', '==', student.uid), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const duelDoc = snapshot.docs[0];
            setActiveDuelRequest({ id: duelDoc.id, ...duelDoc.data() });
        } else {
            setActiveDuelRequest(null);
        }
    });
    return () => unsubscribe();
  }, [student.uid, student.teacherUid, isTeacherPreview]);


  const handleReadyForBattle = async () => {
    // Instead of navigating directly, set a URL parameter and reload the page.
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('ready_for_battle', 'true');
    window.location.href = currentUrl.toString();
  };

  const handleDailyTrainingClick = () => {
    if (isDailyTrainingEnabled) {
      router.push('/dashboard/training');
    } else {
      toast({
        title: 'Training Paused',
        description: 'The Guild Leader has currently paused Daily Training. Check back later!',
      });
    }
  };


  const handleCheckCompany = async () => {
      if (!student.companyId || !student.teacherUid) {
          setIsFreelancerAlertOpen(true);
          return;
      }
      setIsLoadingCompany(true);
      try {
          const q = query(
              collection(db, 'teachers', student.teacherUid, 'students'),
              where('companyId', '==', student.companyId)
          );
          const querySnapshot = await getDocs(q);
          const members = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
          setCompanyMembers(members);
          setIsCompanyDialogOpen(true);
      } catch (error) {
          console.error("Error fetching company members:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch company data.' });
      } finally {
          setIsLoadingCompany(false);
      }
  };
  
  const handleDuelRequestResponse = async (accept: boolean) => {
    if (!activeDuelRequest || !student.teacherUid) return;
    
    if (accept) {
        // Fetch the latest student data before performing checks
        const studentRef = doc(db, 'teachers', student.teacherUid, 'students', student.uid);
        const studentSnap = await getDoc(studentRef);
        if (!studentSnap.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find your student data.' });
            return;
        }
        const freshStudentData = studentSnap.data() as Student;
        
        const settings = await getDuelSettings(student.teacherUid);
        const duelsCompletedToday = freshStudentData.dailyDuelCount || 0;
        
        if (settings.isDailyLimitEnabled && duelsCompletedToday >= (settings.dailyDuelLimit || 999)) {
            toast({ variant: 'destructive', title: 'Daily Limit Reached', description: `You have already completed your daily limit of ${settings.dailyDuelLimit} duels.` });
            accept = false; // Force decline
        }

        if (accept && activeDuelRequest.cost > 0 && freshStudentData.gold < activeDuelRequest.cost) {
            toast({ variant: 'destructive', title: 'Not Enough Gold!', description: `You need ${activeDuelRequest.cost} Gold to accept this duel.` });
            accept = false; // Force decline
        }
    }
    
    const duelRef = doc(db, 'teachers', student.teacherUid, 'duels', activeDuelRequest.id);
    if (accept) {
        await updateDoc(duelRef, { status: 'active' });
        router.push(`/duel/${activeDuelRequest.id}`);
    } else {
        await updateDoc(duelRef, { status: 'declined' });
    }
    setActiveDuelRequest(null);
  };
  
  const teacherPreviewQuery = `?teacherPreview=true&studentUid=${student.uid}`;
  
  let isTrainingDone = false;
  if (student.lastDailyTraining) {
      const today = new Date();
      const lastTrainingDate = student.lastDailyTraining.toDate();
      const hoursSinceLastCompletion = (today.getTime() - lastTrainingDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastCompletion < 23) {
          isTrainingDone = true;
      }
  }

  return (
    <>
      <AlertDialog open={isFreelancerAlertOpen} onOpenChange={setIsFreelancerAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>You are a Freelance Hero!</AlertDialogTitle>
                  <AlertDialogDescription>
                      You are not currently a member of a company. Check with your Guild Leader to add you to the Company Register if you need to join a Company!
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogAction>Okay</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!activeDuelRequest} onOpenChange={(isOpen) => !isOpen && setActiveDuelRequest(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>A Challenger Appears!</AlertDialogTitle>
                <AlertDialogDescription>
                    {activeDuelRequest?.challengerName} has challenged you to a friendly duel!
                    {activeDuelRequest?.cost > 0 && <strong> The entry fee is {activeDuelRequest.cost} Gold.</strong>}
                    <br/>
                    Do you accept?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => handleDuelRequestResponse(false)}>Decline</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDuelRequestResponse(true)}>Accept</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CompanyDisplay 
        isOpen={isCompanyDialogOpen}
        onOpenChange={setIsCompanyDialogOpen}
        members={companyMembers}
      />
      
      <ChallengeDialog 
        isOpen={isChallengeDialogOpen}
        onOpenChange={setIsChallengeDialogOpen}
        student={student}
      />
      
      <AvatarLogDialog
        isOpen={isAvatarLogOpen}
        onOpenChange={setIsAvatarLogOpen}
        student={student}
      />

      <div className="p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {isTeacherPreview && (
            <Alert variant="default" className="bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500">
                <User className="h-4 w-4" />
                <AlertTitle>Teacher Preview Mode</AlertTitle>
                <AlertDescription>
                    You are viewing this dashboard as {student.characterName}. Any actions you take, such as purchasing items from The Vault, will be performed on their behalf.
                </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <AvatarDisplay
              student={student}
            />
            <div className="grid grid-cols-2 gap-4">
                <Link href="/dashboard/map" passHref className="col-span-2">
                    <Button size="lg" className="w-full py-8 text-lg justify-center bg-primary text-primary-foreground hover:bg-primary/90">
                        <Map className="mr-4 h-8 w-8" />
                        Embark on Your Quest
                    </Button>
                </Link>
                <Button size="lg" className="col-span-2 w-full py-8 text-lg justify-center bg-yellow-500 text-black hover:bg-yellow-600" disabled={isTrainingDone} onClick={handleDailyTrainingClick}>
                    <BookOpen className="mr-4 h-8 w-8" />
                    {isTrainingDone ? 'Training Complete for Today' : 'Daily Training'}
                </Button>
                <Button size="lg" className="w-full py-8 text-lg justify-center bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsChallengeDialogOpen(true)}>
                    <Swords className="mr-4 h-8 w-8" />
                    Training Grounds
                </Button>
                <Button size="lg" className="w-full py-8 text-lg justify-center bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleReadyForBattle}>
                    <Sparkles className="mr-4 h-8 w-8" />
                    Ready for Battle
                </Button>
                <Link href="/dashboard/guild-hall" passHref className="w-full">
                    <Button size="lg" className="w-full py-8 text-lg justify-center bg-primary text-primary-foreground hover:bg-primary/90">
                        <Users className="mr-4 h-8 w-8" />
                        The Guild Hall
                    </Button>
                </Link>
                <Link href="/dashboard/songs-and-stories" passHref className="w-full">
                    <Button size="lg" className="w-full py-8 text-lg justify-center bg-primary text-primary-foreground hover:bg-primary/90">
                        <BookHeart className="mr-4 h-8 w-8" />
                        Songs and Stories
                    </Button>
                </Link>
                 <Link href="/dashboard/forge" passHref className="w-full">
                    <Button size="lg" className="w-full py-8 text-lg justify-center bg-primary text-primary-foreground hover:bg-primary/90">
                        <Hammer className="mr-4 h-8 w-8" />
                        The Forge
                    </Button>
                </Link>
                <Button size="lg" className="col-span-2 w-full py-8 text-lg justify-center bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCheckCompany} disabled={isLoadingCompany}>
                    {isLoadingCompany ? <Loader2 className="mr-4 h-8 w-8 animate-spin"/> : <Briefcase className="mr-4 h-8 w-8" />}
                    Check Company
                </Button>
            </div>
          </div>
          <StatsCard 
              student={student}
              levelingTable={levelingTable}
          />
          <TooltipProvider>
              <div className="flex justify-center flex-wrap pt-6 gap-4">
                  <Link href={`/armory${isTeacherPreview ? teacherPreviewQuery : ''}`} passHref>
                      <Button variant="outline" className="h-auto py-4 px-6 border-2 border-amber-600 bg-white hover:bg-gray-100 text-gray-900">
                          <div className="relative cursor-pointer transition-transform hover:scale-105 flex items-center gap-4">
                              <Gem className="h-12 w-12 text-amber-500" />
                              <div>
                                  <h3 className="text-xl font-bold">The Vault</h3>
                                  <p className="text-muted-foreground">Spend your gold!</p>
                              </div>
                          </div>
                      </Button>
                  </Link>
                  
                  <Link href={`/dashboard/leaderboard${isTeacherPreview ? teacherPreviewQuery : ''}`} passHref>
                      <Button variant="outline" className="h-auto py-4 px-6 border-2 border-yellow-400 bg-white hover:bg-gray-100 text-gray-900">
                           <div className="relative cursor-pointer transition-transform hover:scale-105 flex items-center gap-4">
                              <Trophy className="h-12 w-12 text-yellow-400" />
                              <div>
                                  <h3 className="text-xl font-bold">Leaderboards</h3>
                                  <p className="text-muted-foreground">View top heroes!</p>
                              </div>
                          </div>
                      </Button>
                  </Link>

                  <Link href={`/dashboard/inventory${isTeacherPreview ? teacherPreviewQuery : ''}`} passHref>
                      <Button variant="outline" className="h-auto py-4 px-6 border-2 border-purple-600 bg-white hover:bg-gray-100 text-gray-900">
                          <div className="relative cursor-pointer transition-transform hover:scale-105 flex items-center gap-4">
                              <Package className="h-12 w-12 text-purple-500" />
                              <div>
                                  <h3 className="text-xl font-bold">My Inventory</h3>
                                  <p className="text-muted-foreground">View your items!</p>
                              </div>
                          </div>
                      </Button>
                  </Link>

                   <Link href={`/dashboard/missions`} passHref>
                      <Button variant="outline" className="h-auto py-4 px-6 border-2 border-red-600 bg-white hover:bg-gray-100 text-gray-900">
                          <div className="relative cursor-pointer transition-transform hover:scale-105 flex items-center gap-4">
                              <StarIcon className="h-12 w-12 text-red-500" />
                              <div>
                                  <h3 className="text-xl font-bold">Special Missions</h3>
                                  <p className="text-muted-foreground">View your assignments.</p>
                              </div>
                          </div>
                      </Button>
                  </Link>
                  
                  <Button variant="outline" className="h-auto py-4 px-6 border-2 border-sky-600 bg-white hover:bg-gray-100 text-gray-900" onClick={() => setIsAvatarLogOpen(true)}>
                      <div className="relative cursor-pointer transition-transform hover:scale-105 flex items-center gap-4">
                          <ScrollText className="h-12 w-12 text-sky-500" />
                          <div>
                              <h3 className="text-xl font-bold">Avatar Log</h3>
                              <p className="text-muted-foreground">See your history.</p>
                          </div>
                      </div>
                  </Button>
              </div>
          </TooltipProvider>
        </div>
      </div>
    </>
  );
}
