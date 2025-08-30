
"use client";

import { useState, useEffect } from 'react';
import type { Student } from "@/lib/data";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AvatarDisplay } from "@/components/dashboard/avatar-display";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Map, Swords, Sparkles, BookHeart, ImageIcon, Gem, Package, Hammer, Briefcase, Loader2 } from "lucide-react";
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
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

interface DashboardClientProps {
  student: Student;
  isTeacherPreview?: boolean;
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
    if (!student.teacherUid) return;
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
  }, [student.uid, student.teacherUid]);


  const handleReadyForBattle = async () => {
    // Instead of navigating directly, set a URL parameter and reload the page.
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('ready_for_battle', 'true');
    window.location.href = currentUrl.toString();
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
    const duelRef = doc(db, 'teachers', student.teacherUid, 'duels', activeDuelRequest.id);
    if (accept) {
        await updateDoc(duelRef, { status: 'active' });
        router.push(`/duel/${activeDuelRequest.id}`);
    } else {
        await updateDoc(duelRef, { status: 'declined' });
    }
    setActiveDuelRequest(null);
  };

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
                    {activeDuelRequest?.challengerName} has challenged you to a friendly duel! Do you accept?
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

      <div className="p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <AvatarDisplay
              avatarSrc={student.avatarUrl}
              avatarHint={student.class}
            />
            <div className="grid grid-cols-2 gap-4">
              <Link href="/dashboard/map" passHref className="col-span-2">
                  <Button size="lg" className="w-full py-8 text-lg">
                      <Map className="mr-4 h-8 w-8" />
                      Embark on Your Quest
                  </Button>
              </Link>
              <Button size="lg" className="w-full py-8 text-lg" onClick={() => setIsChallengeDialogOpen(true)}>
                  <Swords className="mr-4 h-8 w-8" />
                  Train with a Guildmate
              </Button>
              <Button size="lg" variant="secondary" className="w-full py-8 text-lg" onClick={handleReadyForBattle}>
                  <Sparkles className="mr-4 h-8 w-8" />
                  Ready for Battle
              </Button>
               <Link href="/dashboard/songs-and-stories" passHref>
                  <Button size="lg" variant="secondary" className="w-full py-8 text-lg">
                      <BookHeart className="mr-4 h-8 w-8" />
                      Songs and Stories
                  </Button>
              </Link>
              <Link href="/dashboard/avatars" passHref>
                  <Button size="lg" variant="secondary" className="w-full py-8 text-lg">
                      <ImageIcon className="mr-4 h-8 w-8" />
                      Change Avatar
                  </Button>
              </Link>
               <Button size="lg" variant="secondary" className="col-span-2 w-full py-8 text-lg" onClick={handleCheckCompany} disabled={isLoadingCompany}>
                  {isLoadingCompany ? <Loader2 className="mr-4 h-8 w-8 animate-spin"/> : <Briefcase className="mr-4 h-8 w-8" />}
                  Check Company
              </Button>
            </div>
          </div>
          <StatsCard 
              student={student}
          />
          {!isTeacherPreview && (
              <TooltipProvider>
                  <div className="flex justify-center pt-6 gap-4">
                      <Link href="/armory" passHref>
                          <Button variant="outline" className="h-auto py-4 px-8 border-2 border-amber-600 bg-amber-500/10 hover:bg-amber-500/20">
                              <div className="relative cursor-pointer transition-transform hover:scale-105 flex items-center gap-4">
                                  <Gem className="h-12 w-12 text-amber-500" />
                                  <div>
                                      <h3 className="text-xl font-bold">The Vault</h3>
                                      <p className="text-muted-foreground">Spend your gold!</p>
                                  </div>
                                  </div>
                          </Button>
                      </Link>
                      
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="outline" disabled className="h-auto py-4 px-8 border-2 border-gray-600 bg-gray-500/10 cursor-not-allowed">
                                  <div className="relative flex items-center gap-4">
                                      <Hammer className="h-12 w-12 text-gray-500" />
                                      <div>
                                          <h3 className="text-xl font-bold">The Forge</h3>
                                          <p className="text-muted-foreground">Equip your Avatar!</p>
                                      </div>
                                  </div>
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The Dwarven Forgemasters are currently visiting the Tavern! Please check back later!</p>
                          </TooltipContent>
                      </Tooltip>

                      <Link href="/dashboard/inventory" passHref>
                          <Button variant="outline" className="h-auto py-4 px-8 border-2 border-purple-600 bg-purple-500/10 hover:bg-purple-500/20">
                              <div className="relative cursor-pointer transition-transform hover:scale-105 flex items-center gap-4">
                                  <Package className="h-12 w-12 text-purple-500" />
                                  <div>
                                      <h3 className="text-xl font-bold">My Inventory</h3>
                                      <p className="text-muted-foreground">View your items!</p>
                                  </div>
                                  </div>
                          </Button>
                      </Link>
                  </div>
              </TooltipProvider>
          )}
        </div>
      </div>
    </>
  );
}
