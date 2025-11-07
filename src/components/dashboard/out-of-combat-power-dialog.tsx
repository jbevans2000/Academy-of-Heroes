

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { OutOfCombatPower } from '@/lib/out-of-combat-powers';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Dices } from 'lucide-react';
import { useOutOfCombatPower } from '@/ai/flows/use-out-of-combat-power';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface OutOfCombatPowerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
  powerToCast: OutOfCombatPower | null;
}

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export function OutOfCombatPowerDialog({ isOpen, onOpenChange, student, powerToCast }: OutOfCombatPowerDialogProps) {
  const { toast } = useToast();
  const [companyMembers, setCompanyMembers] = useState<Student[]>([]);
  const [eligibleTargets, setEligibleTargets] = useState<Student[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCasting, setIsCasting] = useState(false);

  // New state for multi-step powers
  const [currentStep, setCurrentStep] = useState(1);
  const [inputValue, setInputValue] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog is opened
      setSelectedTargets([]);
      setIsConfirming(false);
      setInputValue('');
      setCurrentStep(powerToCast?.isMultiStep ? 1 : 2); // Start at step 1 for multi-step powers

      // Fetch company members if needed for targeting
      if (student.companyId && student.teacherUid) {
          const companyQuery = query(
              collection(db, 'teachers', student.teacherUid, 'students'),
              where('companyId', '==', student.companyId)
          );
          const unsubscribe = onSnapshot(companyQuery, (snapshot) => {
              const members = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
              setCompanyMembers(members);
          });
          return () => unsubscribe();
      } else {
          // If no company, only the student themselves can be a target
          setCompanyMembers([student]);
      }
    }
  }, [isOpen, student, powerToCast]);
  
  useEffect(() => {
      if (powerToCast) {
          let targets = companyMembers;
          // Apply power-specific eligibility filters
          if (powerToCast.name === 'Focused Restoration') {
              targets = targets.filter(s => s.hp < s.maxHp * 0.5);
          } else if (powerToCast.name === 'Lesser Heal') {
              targets = targets.filter(s => s.hp < s.maxHp);
          } else if (powerToCast.name === 'Psionic Aura') {
            targets = targets.filter(s => s.mp <= s.maxMp * 0.75);
          } else if (powerToCast.name === 'Psychic Flare') {
            targets = targets.filter(s => s.mp < s.maxMp * 0.5);
          } else if (powerToCast.name === 'Veteran\'s Insight') {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            targets = targets.filter(s => 
                s.level < student.level && 
                (!s.lastReceivedVeteransInsight || s.lastReceivedVeteransInsight.toDate() < twentyFourHoursAgo)
            );
          } else if (powerToCast.name === 'Provision') {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            // Must be in the same company and cannot have received a provision recently.
            targets = targets.filter(s => 
                s.companyId === student.companyId &&
                (!s.lastReceivedProvision || s.lastReceivedProvision.toDate() < twentyFourHoursAgo)
            );
          }
          
          if (!powerToCast.targetSelf) {
            targets = targets.filter(s => s.uid !== student.uid);
          }

          setEligibleTargets(targets);
      }
  }, [powerToCast, companyMembers, student.uid, student.level]);

  const handleTargetSelect = (uid: string) => {
      const targetCount = powerToCast?.targetCount || 1;
      setSelectedTargets(prev => {
          if(prev.includes(uid)) {
              return prev.filter(id => id !== uid);
          }
          if(prev.length < targetCount) {
              return [...prev, uid];
          }
          toast({ title: `You can only select ${targetCount} target(s).` });
          return prev;
      });
  };


  const handleLetFateDecide = () => {
    setIsCasting(true);
    const targetCount = powerToCast?.targetCount || 1;
    const maxSelectable = Math.min(targetCount, eligibleTargets.length);

    if (maxSelectable === 0) {
        toast({ variant: 'destructive', title: 'Not Enough Targets', description: 'There are not enough eligible targets to randomly select.' });
        setIsCasting(false);
        return;
    }
    const shuffled = shuffleArray(eligibleTargets);
    const randomUids = shuffled.slice(0, maxSelectable).map(s => s.uid);
    handleConfirmClick(randomUids);
  };

  const handleConfirmClick = async (targets?: string[]) => {
    const finalTargets = targets || selectedTargets;
    if (!powerToCast || !student.teacherUid) return;

    if(powerToCast.target && finalTargets.length === 0) {
        toast({ variant: 'destructive', title: 'No Targets', description: 'Please select at least one target for this power.' });
        return;
    }
    
    setIsCasting(true);
    setIsConfirming(false); // Close confirmation dialog
    try {
        const result = await useOutOfCombatPower({
            teacherUid: student.teacherUid,
            casterUid: student.uid,
            powerName: powerToCast.name,
            targets: finalTargets,
            inputValue: Number(inputValue) || undefined,
        });
        
        if (result.success) {
            toast({
              title: 'Power Cast!',
              description: result.message,
              duration: 5000,
            });
        } else {
            throw new Error(result.error);
        }
        
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to Cast', description: error.message });
    } finally {
        setIsCasting(false);
        onOpenChange(false); // Close the dialog after casting
    }
  };

  const handleNextStep = () => {
      if (powerToCast?.name === 'Absorb') {
          const mpNeeded = student.maxMp - student.mp;
          const maxHpToConvert = Math.min(student.hp - 1, mpNeeded * 2);
          const hpToConvert = Number(inputValue);
          if (inputValue === '' || hpToConvert <= 0 || hpToConvert > maxHpToConvert) {
              toast({ variant: 'destructive', title: 'Invalid Amount', description: `Please enter an amount between 1 and ${maxHpToConvert} HP.`});
              return;
          }
          handleConfirmClick([]);
          return;
      } else if (powerToCast?.name === 'Arcane Redirect') {
          const maxCanAfford = Math.floor(student.mp / (powerToCast.mpCost || 15));
          const numToEmpower = Number(inputValue);
          if (inputValue === '' || numToEmpower <= 0 || numToEmpower > maxCanAfford) {
               toast({ variant: 'destructive', title: 'Cannot Cast', description: `You can empower between 1 and ${maxCanAfford} Mages.`});
              return;
          }
           handleConfirmClick([], numToEmpower);
      } else if (powerToCast?.name === 'Provision') {
           const maxGold = Math.floor(student.gold * 0.25);
           const goldToSend = Number(inputValue);
           const cost = goldToSend + Math.ceil(goldToSend * 0.05);

           if (inputValue === '' || goldToSend <= 0) {
               toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter an amount of gold to send.'});
               return;
           }
           if (student.gold < cost) {
               toast({ variant: 'destructive', title: 'Insufficient Funds', description: `You need ${cost} gold for this transaction but only have ${student.gold}.` });
               return;
           }
           if (goldToSend > maxGold) {
               toast({ variant: 'destructive', title: 'Amount Too High', description: `You can send a maximum of ${maxGold} gold.` });
               return;
           }
           setCurrentStep(2); // Proceed to target selection
      }
  };

  const renderStep1 = () => {
      if (powerToCast?.name === 'Absorb') {
          const mpNeeded = student.maxMp - student.mp;
          const maxHpToConvert = Math.min(student.hp - 1, mpNeeded * 2);
          
          return (
              <>
                  <DialogHeader>
                      <DialogTitle>Convert HP to MP</DialogTitle>
                      <DialogDescription>How many hit points do you want to convert into magic points? The cost is 2 HP for every 1 MP gained.</DialogDescription>
                  </DialogHeader>
                   <div className="py-4">
                      <Label htmlFor="absorb-amount">HP to Convert (Max: {maxHpToConvert})</Label>
                      <Input id="absorb-amount" type="number" value={inputValue} onChange={e => setInputValue(Number(e.target.value))} max={maxHpToConvert} />
                      <p className="text-sm text-muted-foreground mt-1">You need {mpNeeded} MP to be full. You can convert up to {maxHpToConvert} HP.</p>
                  </div>
                  <DialogFooter>
                      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                      <Button onClick={handleNextStep}>Convert</Button>
                  </DialogFooter>
              </>
          )
      }
      if (powerToCast?.name === 'Arcane Redirect') {
            const costPerMage = powerToCast.mpCost || 15;
            const maxCanAfford = Math.floor(student.mp / costPerMage);
            const cost = (Number(inputValue) || 0) * costPerMage;

            return (
                <>
                    <DialogHeader>
                        <DialogTitle>Arcane Redirect</DialogTitle>
                        <DialogDescription>
                            Pledge your magic to empower allied Mages. For each successful Wildfire they cast, you will pay {costPerMage} MP and their spell's damage will be doubled.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="py-4 space-y-2">
                        <Label htmlFor="mage-count">How many Mages will you empower?</Label>
                        <Input id="mage-count" type="number" value={inputValue} onChange={e => setInputValue(e.target.value === '' ? '' : Number(e.target.value))} />
                        <p className="text-sm">Potential Cost: <span className={cost > student.mp ? 'text-destructive' : 'text-primary'}>{cost} MP</span> (You have {student.mp} MP. You can empower up to {maxCanAfford} Mages)</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleNextStep} disabled={cost > student.mp || inputValue === '' || Number(inputValue) <= 0}>Confirm Pledge</Button>
                    </DialogFooter>
                </>
            )
      }
       if (powerToCast?.name === 'Provision') {
            const maxGold = Math.floor(student.gold * 0.25);
            const goldToSend = Number(inputValue) || 0;
            const fee = Math.ceil(goldToSend * 0.05);
            const totalCost = goldToSend + fee;

            return (
                <>
                    <DialogHeader>
                        <DialogTitle>Provision Company Member</DialogTitle>
                        <DialogDescription>
                            You may send some gold to a fellow company member. You can send up to 25% of your current gold. A 5% transaction fee will be applied.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="py-4 space-y-2">
                        <Label htmlFor="gold-amount">Gold to Send (Max: {maxGold})</Label>
                        <Input id="gold-amount" type="number" value={inputValue} onChange={e => setInputValue(e.target.value === '' ? '' : Number(e.target.value))} />
                        <p className="text-sm text-muted-foreground">Transaction Fee (5%): {fee} Gold</p>
                        <p className="text-sm">Total Cost: <span className={totalCost > student.gold ? 'text-destructive font-bold' : 'text-primary font-semibold'}>{totalCost} Gold</span> (You have {student.gold} Gold)</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleNextStep} disabled={inputValue === '' || goldToSend <= 0 || goldToSend > maxGold || totalCost > student.gold}>Next</Button>
                    </DialogFooter>
                </>
            )
        }
      return null;
  }

  const renderStep2 = () => {
      if (!powerToCast) return null;
      
      const targetCount = powerToCast.targetCount || 1;
      const canSelectMax = eligibleTargets.length >= targetCount;
      const isSelectionComplete = powerToCast.target
          ? (canSelectMax 
                  ? selectedTargets.length === targetCount 
                  : selectedTargets.length > 0 && selectedTargets.length <= eligibleTargets.length)
          : true;

      const isMpPower = powerToCast.name === 'Psionic Aura' || powerToCast.name === 'Psychic Flare';

      return (
          <>
            <DialogHeader>
                <DialogTitle>Select Target(s) for {powerToCast.name}</DialogTitle>
                 <DialogDescription>
                    Select up to {targetCount} target(s).
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-60 rounded-md border p-4">
                {eligibleTargets.length > 0 ? eligibleTargets.map(member => (
                    <div key={member.uid} className="flex items-center space-x-2 p-2 hover:bg-secondary rounded-md">
                        <Checkbox 
                            id={`target-${member.uid}`} 
                            checked={selectedTargets.includes(member.uid)}
                            onCheckedChange={() => handleTargetSelect(member.uid)}
                        />
                        <Label htmlFor={`target-${member.uid}`} className="w-full cursor-pointer">
                            <div className="flex justify-between items-center">
                                <span>{member.characterName} (Lvl {member.level})</span>
                                <span className="text-xs text-muted-foreground">
                                  {isMpPower ? `${member.mp}/${member.maxMp} MP` : `${member.hp}/${member.maxHp} HP`}
                                </span>
                            </div>
                        </Label>
                    </div>
                )) : <p className="text-center text-muted-foreground">No eligible targets found.</p>}
            </ScrollArea>
             <DialogFooter className="sm:justify-between">
                {powerToCast.target && (
                     <Button variant="outline" onClick={handleLetFateDecide} disabled={isCasting}>
                        {isCasting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Dices className="mr-2 h-4 w-4" />}
                        Let Fate Decide
                    </Button>
                )}
                <Button type="button" onClick={() => setIsConfirming(true)} disabled={!isSelectionComplete || isCasting}>
                    {isCasting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Confirm Selection ({selectedTargets.length}/{canSelectMax ? targetCount : eligibleTargets.length})
                </Button>
            </DialogFooter>
        </>
      )
  }

  return (
    <>
        <Dialog open={isOpen && !isConfirming} onOpenChange={(open) => { if(!open) onOpenChange(false); }}>
            <DialogContent className="sm:max-w-md">
               {powerToCast?.isMultiStep && currentStep === 1 ? renderStep1() : renderStep2()}
            </DialogContent>
        </Dialog>
        <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cast {powerToCast?.name}?</AlertDialogTitle>
                     <AlertDialogDescription>
                        This will cost {powerToCast?.name === 'Provision' ? `${(Number(inputValue) || 0) + Math.ceil((Number(inputValue) || 0) * 0.05)} Gold` : `${powerToCast?.mpCost} MP`}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <AlertDialogFooter>
                    <AlertDialogCancel disabled={isCasting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleConfirmClick()} disabled={isCasting}>
                        {isCasting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirm & Cast"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
