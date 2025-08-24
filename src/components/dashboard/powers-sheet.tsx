

'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
    let potentialTargets = partyMembers;

    if (!power.targetSelf) {
        potentialTargets = potentialTargets.filter(s => s.uid !== student.uid);
    }
    
    if (power.target === 'fallen') {
        potentialTargets = potentialTargets.filter(s => s.hp <= 0);
    } else {
        potentialTargets = potentialTargets.filter(s => s.hp > 0);
    }
    
    if (power.name === 'Lesser Heal') {
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

  const handleUsePower = async (power: Power, targets?: string[]) => {
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

    if (power.target && !targets) {
        const currentEligibleTargets = getEligibleTargets(power);
        if (currentEligibleTargets.length === 0) {
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
        await addDoc(powerActivationsRef, {
            studentUid: student.uid,
            studentName: student.characterName,
            powerName: power.name,
            powerMpCost: power.mpCost,
            targets: targets || [],
            timestamp: serverTimestamp(),
        });
        
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

  const hasUsedPowerThisRound = battleState?.powerUsersThisRound?.[student.uid]?.length > 0;

  return (
    <>
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
                              isUnlocked ? powerTypeStyles[power.type] : "border-muted/30 bg-muted/20 text-muted-foreground"
                          )}
                      >
                          <div className="flex justify-between items-start gap-4">
                              <div className="flex-grow">
                                  <h3 className={cn("text-lg font-bold", isUnlocked ? "text-white" : "")}>{power.name}</h3>
                                  <p className={cn("text-sm", isUnlocked ? "text-white/80" : "")}>{power.description}</p>
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
                                  isUnlocked && hasEnoughMp ? "text-blue-400" : "text-gray-400"
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
              onConfirm={(targets) => handleUsePower(selectedPower, targets)}
              battleState={battleState}
              eligibleTargets={eligibleTargets}
          />
      )}
    </>
  );
}
