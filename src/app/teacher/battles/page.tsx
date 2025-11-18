
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, writeBatch, deleteDoc, setDoc, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PlusCircle, Eye, Loader2, LayoutDashboard, Edit, Trash2, BookHeart, Users, User, Star, Coins } from 'lucide-react';
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
import { Dialog, DialogHeader, DialogFooter, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { logGameEvent } from '@/lib/gamelog';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import type { Company } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';


interface BossBattle {
  id: string;
  battleName: string;
}

export default function BossBattlesPage() {
  const [battles, setBattles] = useState<BossBattle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingBattleId, setStartingBattleId] = useState<string | null>(null);
  const [selectedBattleForStart, setSelectedBattleForStart] = useState<BossBattle | null>(null);
  
  // State for the dialog flow
  const [isModeDialogOpen, setIsModeDialogOpen] = useState(false);
  const [isDeploymentDialogOpen, setIsDeploymentDialogOpen] = useState(false);
  const [isCompanySelectionDialogOpen, setIsCompanySelectionDialogOpen] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  const [deploymentMode, setDeploymentMode] = useState<'guild' | 'company' | 'individual' | null>(null);
  const [xpPerAnswer, setXpPerAnswer] = useState<number | string>('');
  const [goldPerAnswer, setGoldPerAnswer] = useState<number | string>('');
  const [xpParticipation, setXpParticipation] = useState<number | string>('');
  const [goldParticipation, setGoldParticipation] = useState<number | string>('');
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);

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
    const unsubBattles = onSnapshot(battlesRef, (querySnapshot) => {
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
    
    const companiesRef = collection(db, 'teachers', teacher.uid, 'companies');
    const unsubCompanies = onSnapshot(companiesRef, (querySnapshot) => {
      setAllCompanies(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
    });

    return () => {
        unsubBattles();
        unsubCompanies();
    }

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
        setIsModeDialogOpen(false);
    }
  };

  const handleStartGroupBattleFlow = (mode: 'guild' | 'company' | 'individual') => {
    setDeploymentMode(mode);
    setIsDeploymentDialogOpen(false);

    if (mode === 'company' || mode === 'individual') {
      setIsCompanySelectionDialogOpen(true);
    } else { // guild mode
      setIsRewardDialogOpen(true);
    }
  };
  
  const handleCompanySelectionNext = () => {
    if (deploymentMode !== 'guild' && selectedCompanyIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Companies Selected',
        description: 'Please select at least one company to participate.'
      });
      return;
    }
    setIsCompanySelectionDialogOpen(false);
    setIsRewardDialogOpen(true);
  }

  const handleFinalizeGroupBattleSetup = (withRewards: boolean) => {
      const params = new URLSearchParams();
      params.append('mode', deploymentMode!);
      if (withRewards) {
          params.append('xp', String(xpPerAnswer || 0));
          params.append('gold', String(goldPerAnswer || 0));
          params.append('xpParticipation', String(xpParticipation || 0));
          params.append('goldParticipation', String(goldParticipation || 0));
      }
      if (deploymentMode === 'company' || deploymentMode === 'individual') {
        params.append('companies', selectedCompanyIds.join(','));
      }
      router.push(`/teacher/battle/group/${selectedBattleForStart!.id}?${params.toString()}`);
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

  return (
    <div className="flex min-h-screen w-full flex-col">
        {/* Main Mode Dialog */}
        <Dialog open={isModeDialogOpen} onOpenChange={setIsModeDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Choose Battle Type for "{selectedBattleForStart?.battleName}"</DialogTitle>
                    <DialogDescription>How would you like to run this battle?</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <Button variant="outline" className="h-32 flex-col gap-2 p-2" onClick={() => handleStartIndividualBattle(selectedBattleForStart!)}>
                        {startingBattleId === selectedBattleForStart?.id ? <Loader2 className="h-8 w-8 animate-spin" /> : <User className="h-8 w-8 text-primary"/>}
                        <span className="font-semibold">Individual Battle (Live)</span>
                        <span className="text-xs text-muted-foreground whitespace-normal">Students play on their own devices.</span>
                    </Button>
                    <Button variant="outline" className="h-32 flex-col gap-2 p-2" onClick={() => { setIsModeDialogOpen(false); setIsDeploymentDialogOpen(true); }}>
                        <Users className="h-8 w-8 text-primary"/>
                        <span className="font-semibold">Group Battle</span>
                        <span className="text-xs text-muted-foreground whitespace-normal">Teacher-led on a single screen.</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* Group Battle Deployment Dialog */}
        <Dialog open={isDeploymentDialogOpen} onOpenChange={setIsDeploymentDialogOpen}>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle>Choose Group Battle Mode</DialogTitle>
                    <DialogDescription>Select how participants will be chosen for each question.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <Button variant="outline" className="h-20" onClick={() => handleStartGroupBattleFlow('guild')}>Deploy Entire Guild</Button>
                    <Button variant="outline" className="h-20" onClick={() => handleStartGroupBattleFlow('company')}>Deploy Companies</Button>
                    <Button variant="outline" className="h-20" onClick={() => handleStartGroupBattleFlow('individual')}>Deploy Individual Heroes</Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* New Company Selection Dialog */}
        <Dialog open={isCompanySelectionDialogOpen} onOpenChange={setIsCompanySelectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Participating Companies</DialogTitle>
              <DialogDescription>Choose which companies will take part in this battle.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2 max-h-64 overflow-y-auto">
              {allCompanies.map(company => (
                <div key={company.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`company-${company.id}`}
                    checked={selectedCompanyIds.includes(company.id)}
                    onCheckedChange={(checked) => {
                      setSelectedCompanyIds(prev => 
                        checked ? [...prev, company.id] : prev.filter(id => id !== company.id)
                      );
                    }}
                  />
                  <Label htmlFor={`company-${company.id}`}>{company.name}</Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCompanySelectionDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCompanySelectionNext}>Continue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reward Configuration Dialog */}
        <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Configure Battle Rewards</DialogTitle>
                    <DialogDescription>Optionally set rewards for this battle session. These are not saved to the template.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2 p-4 border rounded-md">
                        <Label className="font-semibold">Per Correct Answer</Label>
                        <p className="text-sm text-muted-foreground">Awarded to the participant(s) for each correct answer they provide.</p>
                        <div className="flex gap-4">
                            <Input type="number" placeholder="XP Amount" value={xpPerAnswer} onChange={e => setXpPerAnswer(e.target.value)} />
                            <Input type="number" placeholder="Gold Amount" value={goldPerAnswer} onChange={e => setGoldPerAnswer(e.target.value)} />
                        </div>
                    </div>
                     <div className="space-y-2 p-4 border rounded-md">
                        <Label className="font-semibold">Participation Bonus</Label>
                        <p className="text-sm text-muted-foreground">Awarded to all present students at the end of the battle, regardless of performance.</p>
                        <div className="flex gap-4">
                            <Input type="number" placeholder="XP Amount" value={xpParticipation} onChange={e => setXpParticipation(e.target.value)} />
                            <Input type="number" placeholder="Gold Amount" value={goldParticipation} onChange={e => setGoldParticipation(e.target.value)} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => handleFinalizeGroupBattleSetup(false)}>Training Battle (No Rewards)</Button>
                    <Button onClick={() => handleFinalizeGroupBattleSetup(true)}>Set Rewards & Continue</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <div 
            className="fixed inset-0 -z-10 bg-cover bg-center"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-21eb570e-7d33-47da-8e3a-4a9f4c5ea0de.jpg?alt=media&token=a6ea0696-903a-4056-9fad-2d053078fcb9')`,
            }}
        />
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">The Field of Battle</h1>
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
                                setIsModeDialogOpen(true);
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
