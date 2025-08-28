
'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import type { Student } from "@/lib/data";
import { classPowers, type Power, type PowerType } from "@/lib/powers";
import { cn } from "@/lib/utils";
import { Wand2, Zap, Shield, Heart, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TargetingDialog } from '@/components/battle/targeting-dialog';

interface LiveBattleState {
    empoweredMageUids?: string[];
    powerUsersThisRound?: { [key: string]: string[] };
    sorcerersIntuitionUses?: { [key: string]: number };
    elementalFusionCasts?: { [studentUid: string]: number };
    globalElementalFusionCasts?: number;
    inspiringStrikeCasts?: { [studentUid: string]: number };
    immuneToRevival?: string[];
    martialSacrificeCasterUid?: string;
    arcaneSacrificeCasterUid?: string;
    divineSacrificeCasterUid?: string;
    chaosStormCasts?: { [studentUid: string]: number };
}

interface PowersSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
  isBattleView?: boolean;
  teacherUid?: string;
  battleId?: string;
  battleState: LiveBattleState | null;
}

const powerTypeStyles: { [key in PowerType]: string } = {
    damage: "border-red-500/50 bg-red-900/20 text-red-300 hover:bg-red-800/40",
    support: "border-blue-500/50 bg-blue-900/20 text-blue-300 hover:bg-blue-800/40",
    healing: "border-green-500/50 bg-green-900/20 text-green-300 hover:bg-green-800/40",
    utility: "border-yellow-500/50 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-800/40",
};

const classIconMap: { [key: string]: React.ReactNode } = {
    Guardian: <Shield className="h-8 w-8 text-primary" />,
    Healer: <Heart className="h-8 w-8 text-primary" />,
    Mage: <Wand2 className="h-8 w-8 text-primary" />,
};

export function PowersSheet({ isOpen, onOpenChange, student, isBattleView = false, teacherUid, battleId, battleState }: PowersSheetProps) {
  const powers = classPowers[student.class] || [];
  const { toast } = useToast();
  const [isCasting, setIsCasting] = useState<string | null>(null);

  // State for targeting dialog
  const [isTargeting, setIsTargeting] = useState(false);
  const [selectedPower, setSelectedPower] = useState<Power | null>(null);
  const [partyMembers, setPartyMembers] = useState<Student[]>([]);
  const [eligibleTargets, setEligibleTargets] = useState<Student[]>([]);

  // State for Sacrifice Confirmation
  const [isConfirmingSacrifice, setIsConfirmingSacrifice] = useState(false);
  const [powerToConfirm, setPowerToConfirm] = useState<Power | null>(null);


  useEffect(() => {
    if (!isBattleView || !teacherUid) return;

    // This listener will keep party members' stats (HP, MP) up to date in real-time
    const studentsRef = collection(db, 'teachers', teacherUid, 'students');
    const unsubscribe = onSnapshot(studentsRef, (snapshot) => {
        const allStudents = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
        setPartyMembers(allStudents);
    }, (error) => {
        console.error("Failed to fetch party members:", error);
    });

    return () => unsubscribe();
  }, [isBattleView, teacherUid, battleId]);


  const getEligibleTargets = (power: Power): Student[] => {
    // START: Bug fix - First, filter for students who are actually in the battle.
    let potentialTargets = partyMembers.filter(s => s.inBattle);
    // END: Bug fix

    const immuneUids = battleState?.immuneToRevival || [];

    // Rule: Fallen players can ONLY be targeted by powers specifically for 'fallen' targets.
    if (power.target === 'fallen') {
        potentialTargets = potentialTargets.filter(s => s.hp <= 0 && !immuneUids.includes(s.uid));
    } else {
        potentialTargets = potentialTargets.filter(s => s.hp > 0);
    }

    if (!power.targetSelf) {
        potentialTargets = potentialTargets.filter(s => s.uid !== student.uid);
    }

    if (power.name === 'Guard') {
      potentialTargets = potentialTargets.filter(s => 
          (s.class === 'Mage' || s.class === 'Healer') &&
          (!s.shielded || s.shielded.roundsRemaining <= 0) &&
          !s.guardedBy
      );
    } else if (power.name === 'Lesser Heal') {
      potentialTargets = potentialTargets.filter(s => s.hp < s.maxHp);
    } else if (power.name === 'Focused Restoration') {
        potentialTargets = potentialTargets.filter(s => s.hp <= s.maxHp * 0.5);
    } else if (power.name === 'Solar Empowerment') {
        potentialTargets = potentialTargets.filter(p => 
            p.class === 'Mage' && 
            !(battleState?.empoweredMageUids || []).includes(p.uid)
        );
    } else if (power.name === 'Psionic Aura') {
        potentialTargets = potentialTargets.filter(s => s.mp <= s.maxMp * 0.75);
    } else if (power.name === 'Psychic Flare') {
        potentialTargets = potentialTargets.filter(s => s.mp < s.maxMp * 0.5);
    } else if (power.name === 'Arcane Shield') {
        potentialTargets = potentialTargets.filter(s => !s.shielded || s.shielded.roundsRemaining <= 0);
    }

    return potentialTargets;
  }
  
  const proceedWithPower = async (power: Power, targets?: string[], inputValue?: number) => {
      if (!isBattleView || !teacherUid || !battleId || !battleState) {
        toast({ variant: 'destructive', title: 'Error', description: 'Powers can only be used inside a live battle.' });
        return;
    }
    
    if (power.name === 'Sorcerer’s Intuition') {
        const uses = battleState.sorcerersIntuitionUses?.[student.uid] || 0;
        if (uses >= 3) {
            toast({
                variant: 'destructive',
                title: 'Power Exhausted',
                description: 'The Psychic winds will no longer answer your call.',
                duration: 5000,
            });
            return;
        }
    }
    
    if (power.name === 'Elemental Fusion') {
        const personalCasts = battleState.elementalFusionCasts?.[student.uid] || 0;
        if (personalCasts >= 2) {
            toast({ variant: 'destructive', title: 'Power Limit Reached', description: 'You have exhausted your connection to the elements. Choose a different power.' });
            return;
        }
        const globalCasts = battleState.globalElementalFusionCasts || 0;
        if (globalCasts >= 6) {
            toast({ variant: 'destructive', title: 'Battle Limit Reached', description: 'The Elemental energies of the area have been drained! Choose a different power!' });
            return;
        }
    }
    
    if (power.name === 'Inspiring Strike') {
        const uses = battleState.inspiringStrikeCasts?.[student.uid] || 0;
        if (uses >= 2) {
             toast({ variant: 'destructive', title: 'Power Limit Reached', description: 'Your voice is hoarse! You cannot inspire again this battle.' });
            return;
        }
    }
    if (power.name === 'Chaos Storm') {
        const uses = battleState.chaosStormCasts?.[student.uid] || 0;
        if (uses >= 2) {
             toast({ variant: 'destructive', title: 'Power Limit Reached', description: 'You are too exhausted to control the forces of Chaos! Choose another power!' });
            return;
        }
    }

    if(power.name === 'Martial Sacrifice' && battleState.martialSacrificeCasterUid) {
        toast({
            variant: 'destructive',
            title: 'Sacrifice Already Made',
            description: 'A Guardian has already made the ultimate sacrifice this battle.',
        });
        return;
    }

    if(power.name === 'Arcane Sacrifice' && battleState.arcaneSacrificeCasterUid) {
        toast({
            variant: 'destructive',
            title: 'Sacrifice Already Made',
            description: 'A Mage has already made the ultimate sacrifice this battle.',
        });
        return;
    }
    
    if(power.name === 'Divine Sacrifice' && battleState.divineSacrificeCasterUid) {
        toast({
            variant: 'destructive',
            title: 'Sacrifice Already Made',
            description: 'A Healer has already made the ultimate sacrifice this battle.',
        });
        return;
    }

    if ((power.target || power.isMultiStep) && !targets) {
        const currentEligibleTargets = getEligibleTargets(power);
        if (power.target && currentEligibleTargets.length === 0) {
            toast({
                title: 'No Eligible Targets',
                description: `There are no available targets for ${power.name} right now.`,
                duration: 5000,
            });
            return;
        }
        setEligibleTargets(currentEligibleTargets);
        setSelectedPower(power);
        setIsTargeting(true);
        return;
    }
    
    setIsCasting(power.name);
    try {
        const powerActivationsRef = collection(db, 'teachers', teacherUid, `liveBattles/${battleId}/powerActivations`);
        
        const payload: any = {
            studentUid: student.uid,
            studentName: student.characterName,
            powerName: power.name,
            powerMpCost: power.name === 'Arcane Redirect' ? (inputValue || 0) * 15 : power.mpCost,
            targets: targets || [],
            timestamp: serverTimestamp(),
        };

        if (inputValue) {
            payload.inputValue = inputValue;
        }
        
        await addDoc(powerActivationsRef, payload);
        
        onOpenChange(false);

    } catch (error) {
        console.error("Failed to use power:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred while using the power.' });
    } finally {
        setIsCasting(null);
        setIsTargeting(false);
        setSelectedPower(null);
    }
  }

  const handleUsePower = async (power: Power, targets?: string[], inputValue?: number) => {
    const sacrificePowers = ["Martial Sacrifice", "Arcane Sacrifice", "Divine Sacrifice"];
    if (sacrificePowers.includes(power.name)) {
        setPowerToConfirm(power);
        setIsConfirmingSacrifice(true);
    } else {
        proceedWithPower(power, targets, inputValue);
    }
  };

  const hasUsedPowerThisRound = battleState?.powerUsersThisRound?.[student.uid]?.length > 0;

  return (
    <>
      <AlertDialog open={isConfirmingSacrifice} onOpenChange={setIsConfirmingSacrifice}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to make the ultimate sacrifice?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                    <p>This action cannot be undone and will have major consequences:</p>
                    <ul className="list-disc list-inside font-semibold">
                        <li>Your HP and MP will drop to 0 for the rest of the battle.</li>
                        <li className="text-destructive">You CANNOT be revived during this battle.</li>
                        <li>You will forfeit all personal XP and Gold rewards.</li>
                    </ul>
                     <p>In return, your party will gain a significant bonus. Do you wish to proceed?</p>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={() => {
                        if(powerToConfirm) proceedWithPower(powerToConfirm);
                        setIsConfirmingSacrifice(false);
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Confirm & Sacrifice
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-4">
              {classIconMap[student.class]}
              <div>
                  <SheetTitle className="text-2xl">{student.class} Powers</SheetTitle>
                  <SheetDescription>
                      New powers are unlocked as you gain levels.
                  </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="py-4 space-y-4">
              {powers.length > 0 ? powers.map((power, index) => {
                  const isUnlocked = student.level >= power.level;
                  const hasEnoughMp = student.mp >= power.mpCost;
                  const canUsePower = isUnlocked && hasEnoughMp && isBattleView && !isCasting && !hasUsedPowerThisRound;
                  
                  return (
                      <div 
                          key={index}
                          className={cn(
                              "p-4 rounded-lg border-2 transition-all",
                              isUnlocked ? powerTypeStyles[power.type] : "border-muted/30 bg-muted/20 text-black"
                          )}
                      >
                          <div className="flex justify-between items-start gap-4">
                              <div className="flex-grow">
                                  <h3 className={cn("text-lg font-bold", !isUnlocked && 'text-black')}>{power.name}</h3>
                                  <p className={cn("text-sm", isUnlocked ? "text-white/80" : "text-black")}>{power.description}</p>
                              </div>
                              {isBattleView && (
                                  <Button size="sm" disabled={!canUsePower} variant={isUnlocked ? 'secondary' : 'ghost'} onClick={() => handleUsePower(power)}>
                                      {isCasting === power.name ? <Loader2 className="h-4 w-4 animate-spin" /> : hasUsedPowerThisRound ? 'Used' : 'Use Power'}
                                  </Button>
                              )}
                          </div>
                          <div className="flex justify-between items-end mt-2">
                              <p className={cn(
                                  "font-semibold text-sm",
                                  isUnlocked && hasEnoughMp ? "text-blue-400" : !isUnlocked ? "text-black" : "text-gray-400"
                              )}>
                                  MP Cost: {power.mpCost}
                              </p>
                              <p className={cn(
                                  "font-semibold text-sm",
                                  isUnlocked ? "text-green-400" : "text-black"
                              )}>
                                  {!isUnlocked 
                                      ? `Unlocks at Level ${power.level}`
                                      : !hasEnoughMp
                                      ? `Not enough MP`
                                      : hasUsedPowerThisRound
                                      ? `Power Used`
                                      : "Unlocked"
                                  }
                              </p>
                          </div>
                      </div>
                  )
              }) : (
                  <p className="text-center text-muted-foreground p-8">This class does not have any powers defined yet.</p>
              )}
          </div>
        </SheetContent>
      </Sheet>
      {selectedPower && (
          <TargetingDialog
              isOpen={isTargeting}
              onOpenChange={setIsTargeting}
              power={selectedPower}
              students={partyMembers}
              caster={student}
              onConfirm={(targets, inputValue) => handleUsePower(selectedPower, targets, inputValue)}
              battleState={battleState}
              eligibleTargets={eligibleTargets}
          />
      )}
    </>
  );
}
