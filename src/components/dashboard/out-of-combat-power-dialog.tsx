
'use client';

import { useState, useEffect } from 'react';
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
import { classPowers, type Power } from '@/lib/powers';
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

export function OutOfCombatPowerDialog({ isOpen, onOpenChange, student }: OutOfCombatPowerDialogProps) {
  const { toast } = useToast();
  const [availablePowers, setAvailablePowers] = useState<Power[]>([]);
  const [selectedPower, setSelectedPower] = useState<Power | null>(null);
  const [companyMembers, setCompanyMembers] = useState<Student[]>([]);
  const [eligibleTargets, setEligibleTargets] = useState<Student[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCasting, setIsCasting] = useState(false);

  // New state for multi-step powers
  const [currentStep, setCurrentStep] = useState(1);
  const [inputValue, setInputValue] = useState<number | ''>('');

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog is closed
      setSelectedPower(null);
      setSelectedTargets([]);
      setIsConfirming(false);
      return;
    }

    // Determine available powers
    const allClassPowers = classPowers[student.class] || [];
    const outOfCombatPowers = allClassPowers.filter(p => p.outOfCombat && student.level >= p.level && student.mp >= p.mpCost);
    setAvailablePowers(outOfCombatPowers);

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
  }, [isOpen, student]);
  
  useEffect(() => {
      if (selectedPower) {
          let targets = companyMembers;
          if (selectedPower.name === 'Focused Restoration') {
              targets = targets.filter(s => s.hp < s.maxHp * 0.5);
          } else if (selectedPower.name === 'Lesser Heal') {
              targets = targets.filter(s => s.hp < s.maxHp);
          }
          setEligibleTargets(targets);
      }
  }, [selectedPower, companyMembers]);

  const handlePowerSelect = (power: Power) => {
    setSelectedPower(power);
  };
  
  const handleTargetSelect = (uid: string) => {
      const targetCount = selectedPower?.targetCount || 1;
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
    const targetCount = selectedPower?.targetCount || 1;
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
    if (!selectedPower || !student.teacherUid) return;

    if(selectedPower.target && finalTargets.length === 0) {
        toast({ variant: 'destructive', title: 'No Targets', description: 'Please select at least one target for this power.' });
        return;
    }
    
    setIsCasting(true);
    try {
        const result = await useOutOfCombatPower({
            teacherUid: student.teacherUid,
            casterUid: student.uid,
            powerName: selectedPower.name,
            targets: finalTargets,
            inputValue: Number(inputValue) || undefined,
        });
        
        if (result.success) {
            toast({ title: 'Power Cast!', description: result.message });
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


    const renderStep1 = () => {
        if (power.name === 'Absorb') {
            const mpNeeded = caster.maxMp - caster.mp;
            const maxHpToConvert = Math.min(caster.hp - 1, mpNeeded * 2);
            
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
         if (power.name === 'Arcane Redirect') {
            const costPerMage = power.mpCost || 15;
            const maxCanAfford = Math.floor(caster.mp / costPerMage);
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
                        <p className="text-sm">Potential Cost: <span className={cost > caster.mp ? 'text-destructive' : 'text-primary'}>{cost} MP</span> (You have {caster.mp} MP. You can empower up to {maxCanAfford} Mages)</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleNextStep} disabled={cost > caster.mp || inputValue === '' || Number(inputValue) <= 0}>Confirm Pledge</Button>
                    </DialogFooter>
                </>
            )
        }
        return null;
    }

  const renderStep2 = () => {
      const targetCount = selectedPower?.targetCount || 1;
      const canSelectMax = eligibleTargets.length >= targetCount;
      const isSelectionComplete = selectedPower?.target
          ? (canSelectMax 
                  ? selectedTargets.length === targetCount 
                  : selectedTargets.length > 0 && selectedTargets.length <= eligibleTargets.length)
          : true;

      return (
          <>
            <DialogHeader>
                <DialogTitle>Select Target(s) for {selectedPower?.name}</DialogTitle>
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
                                <span>{member.characterName}</span>
                                <span className="text-xs text-muted-foreground">{member.hp}/{member.maxHp} HP</span>
                            </div>
                        </Label>
                    </div>
                )) : <p className="text-center text-muted-foreground">No eligible targets found.</p>}
            </ScrollArea>
             <DialogFooter className="sm:justify-between">
                {selectedPower?.target && (
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
    <Dialog open={isOpen && !selectedPower} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Out of Combat Powers</DialogTitle>
          <DialogDescription>Select a power to use. You must have enough MP and be the required level.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            {availablePowers.length > 0 ? (
                availablePowers.map(power => (
                    <Button key={power.name} variant="outline" className="w-full justify-start text-left h-auto" onClick={() => handlePowerSelect(power)}>
                        <div>
                            <p className="font-bold">{power.name}</p>
                            <p className="text-xs text-muted-foreground">{power.description}</p>
                            <p className="text-xs font-semibold">Cost: {power.mpCost} MP</p>
                        </div>
                    </Button>
                ))
            ) : (
                <p className="text-center text-muted-foreground">You have no available powers at this time.</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
    
    {selectedPower && (
      <Dialog open={isOpen && !!selectedPower} onOpenChange={(open) => { if(!open) setSelectedPower(null); }}>
          <DialogContent>
            {selectedPower.isMultiStep && currentStep === 1 ? renderStep1() : renderStep2()}
          </DialogContent>
      </Dialog>
    )}
    
    <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Cast {selectedPower?.name}?</AlertDialogTitle>
                 <AlertDialogDescription>
                    This will cost {selectedPower?.mpCost} MP. This action cannot be undone.
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
