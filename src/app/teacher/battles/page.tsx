'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, writeBatch, deleteDoc, setDoc, onSnapshot, query, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Eye, Loader2, LayoutDashboard, Edit, Trash2, BookHeart, Users, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { logGameEvent } from '@/lib/gamelog';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { format } from 'date-fns';

interface BossBattle {
  id: string;
  battleName: string;
}

export default function BossBattlesPage() {
  const [battles, setBattles] = useState<BossBattle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingBattleId, setStartingBattleId] = useState<string | null>(null);
  const [selectedBattleForStart, setSelectedBattleForStart] = useState<BossBattle | null>(null);
  const [isStartBattleDialogOpen, setIsStartBattleDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [teacher, setTeacher] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        if (user) {
            setTeacher(user);
        } else {
            router.push('/teacher/login');
        }
    });
    return () => unsubscribe();
  }, [router]);


  useEffect(() => {
    if (!teacher) return;
    setIsLoading(true);

    const battlesRef = collection(db, 'teachers', teacher.uid, 'bossBattles');
    const unsubscribe = onSnapshot(battlesRef, (querySnapshot) => {
        const battlesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as BossBattle));
        setBattles(battlesData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching boss battles: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch battle data.' });
        setIsLoading(false);
    });
    
    return () => unsubscribe;

  }, [teacher, toast]);

  const handleStartIndividualBattle = async (battle: BossBattle) => {
    if (!teacher) return;
    setStartingBattleId(battle.id);
    try {
        const batch = writeBatch(db);
        
        const archiveRef = doc(collection(db, 'teachers', teacher.uid, 'savedBattles'));
        
        batch.set(archiveRef, {
            battleId: battle.id,
            battleName: battle.battleName,
            status: 'WAITING',
            startedAt: serverTimestamp(),
        });

        const liveBattleRef = doc(db, 'teachers', teacher.uid, 'liveBattles', 'active-battle');
        batch.set(liveBattleRef, {
            battleId: battle.id,
            parentArchiveId: archiveRef.id,
            status: 'WAITING',
            currentQuestionIndex: 0,
            lastRoundDamage: 0,
            lastRoundBaseDamage: 0,
            lastRoundPowerDamage: 0,
            lastRoundPowersUsed: [],
            totalDamage: 0,
            totalBaseDamage: 0,
            totalPowerDamage: 0,
            removedAnswerIndices: [],
            powerEventMessage: '',
            targetedEvent: null,
            powerUsersThisRound: {},
            queuedPowers: [],
            fallenPlayerUids: [],
            empoweredMageUids: [],
            cosmicDivinationUses: 0,
            voteState: null,
        });
        
        await batch.commit();

        await logGameEvent(teacher.uid, 'BOSS_BATTLE', `Individual Boss Battle '${battle.battleName}' has been activated.`);

        toast({
            title: 'Individual Battle Started!',
            description: 'Students can now join the battle waiting room.',
        });

        router.push(`/teacher/battle/live/${battle.id}`);

    } catch (error) {
        console.error("Error starting battle:", error);
        toast({
            variant: 'destructive',
            title: 'Failed to Start Battle',
            description: 'Could not create the live battle state. Please try again.',
        });
    } finally {
        setStartingBattleId(null);
        setIsStartBattleDialogOpen(false);
    }
  };

  const handleStartGroupBattle = (battleId: string) => {
    router.push(`/teacher/battle/group/${battleId}`);
    setIsStartBattleDialogOpen(false);
  }

  const handleDeleteBattle = async (battleId: string) => {
    if (!teacher) return;
    try {
        const battleToDelete = battles.find(b => b.id === battleId);
        await deleteDoc(doc(db, 'teachers', teacher.uid, 'bossBattles', battleId));
        await logGameEvent(teacher.uid, 'GAMEMASTER', `Deleted Boss Battle: '${battleToDelete?.battleName || battleId}'.`);

        toast({
            title: 'Battle Deleted',
            description: 'The boss battle has been removed successfully.',
        });
    } catch (error) {
        console.error("Error deleting battle:", error);
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: 'Could not delete the boss battle. Please try again.',
        });
    }
  };

  const navigateToCreate = () => {
    router.push('/teacher/battles/new');
  };
  
  const navigateToDashboard = () => {
    router.push('/teacher/dashboard');
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col">
        <AlertDialog open={isStartBattleDialogOpen} onOpenChange={setIsStartBattleDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Choose Battle Mode for "{selectedBattleForStart?.battleName}"</AlertDialogTitle>
                    <AlertDialogDescription>
                        How would you like to run this battle?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => handleStartGroupBattle(selectedBattleForStart!.id)}>
                        <Users className="h-8 w-8 text-primary"/>
                        <span className="font-semibold">Group Battle</span>
                        <span className="text-xs text-muted-foreground text-center">Teacher-led on a single screen.</span>
                    </Button>
                     <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => handleStartIndividualBattle(selectedBattleForStart!)}>
                        {startingBattleId === selectedBattleForStart?.id ? (
                            <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                            <User className="h-8 w-8 text-primary"/>
                        )}
                        <span className="font-semibold">Individual Battle</span>
                        <span className="text-xs text-muted-foreground text-center">Students log in and play on their own devices.</span>
                    </Button>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div 
            className="absolute inset-0 -z-10"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-21eb570e-7d33-47da-8e3a-4a9f4c5ea0de.jpg?alt=media&token=a6ea0696-903a-4056-9fad-2d053078fcb9')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.25,
            }}
        />
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">The Monster Compendium</h1>
          <div className="flex gap-2">
             <Button onClick={() => router.push('/teacher/battles/summary')} variant="secondary">
                <BookHeart className="mr-2 h-5 w-5" />
                Archived Battles
            </Button>
            <Button onClick={navigateToCreate}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Boss Battle
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : battles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-20 text-center bg-card/50">
            <h2 className="text-xl font-semibold text-muted-foreground">No Boss Battles Have Been Created</h2>
            <p className="mt-2 text-sm text-muted-foreground">Get started by creating your first boss battle.</p>
            <Button onClick={navigateToCreate} className="mt-4">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create a Boss Battle
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {battles.map((battle) => (
              <Card key={battle.id} className="bg-card/90">
                <CardHeader>
                  <CardTitle>{battle.battleName}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-2">
                        <Button 
                            className="w-full" 
                            onClick={() => {
                                setSelectedBattleForStart(battle);
                                setIsStartBattleDialogOpen(true);
                            }}
                            disabled={!!startingBattleId}
                        >
                            {startingBattleId === battle.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Start Battle
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => router.push(`/teacher/battles/preview/${battle.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Preview Battle
                        </Button>
                         <Button variant="secondary" className="w-full" onClick={() => router.push(`/teacher/battles/edit/${battle.id}`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Battle
                        </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Battle
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the
                                    <span className="font-bold"> {battle.battleName} </span>
                                    battle and all of its associated data.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteBattle(battle.id)}>
                                    Yes, delete battle
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
