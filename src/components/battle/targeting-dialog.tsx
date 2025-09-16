

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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Power } from '@/lib/powers';
import { Student } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Dices, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';

interface TargetingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  power: Power;
  students: Student[];
  caster: Student;
  onConfirm: (targets: string[], inputValue?: number) => void;
  battleState: any; // Pass the live battle state for checks
  eligibleTargets: Student[];
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

export function TargetingDialog({ isOpen, onOpenChange, power, students, caster, onConfirm, battleState, eligibleTargets }: TargetingDialogProps) {
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isFateDeciding, setIsFateDeciding] = useState(false);
  const { toast } = useToast();
  
  // New state for multi-step powers
  const [currentStep, setCurrentStep] = useState(1);
  const [inputValue, setInputValue] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedUids([]);
      setIsConfirming(false);
      setInputValue('');
      setCurrentStep(power.isMultiStep ? 1 : 2); // Start at step 1 for multi-step powers
    }
  }, [isOpen, power.isMultiStep]);

  const handleSelectStudent = (uid: string) => {
    const targetCount = power.targetCount || 1;

    setSelectedUids(prev => {
      if (prev.includes(uid)) {
        return prev.filter(id => id !== uid);
      }
      if (prev.length < targetCount) {
        return [...prev, uid];
      }
      toast({ title: `You can only select ${targetCount} target(s).`, description: 'Deselect a player to choose another.' });
      return prev;
    });
  };


  const handleLetFateDecide = () => {
    setIsFateDeciding(true);
    const targetCount = power.targetCount || 1;
    const maxSelectable = Math.min(targetCount, eligibleTargets.length);

    if (maxSelectable === 0) {
        toast({ variant: 'destructive', title: 'Not Enough Targets', description: 'There are not enough eligible targets to randomly select.' });
        setIsFateDeciding(false);
        return;
    }
    const shuffled = shuffleArray(eligibleTargets);
    const randomUids = shuffled.slice(0, maxSelectable).map(s => s.uid);
    onConfirm(randomUids, Number(inputValue) || undefined);
  };

  const handleConfirmClick = () => {
    // For non-input powers or after input has been given
    if (power.target) {
        const targetCount = power.targetCount || 1;
        const canSelectMax = eligibleTargets.length >= targetCount;
        
        const isSelectionComplete = (canSelectMax 
                ? selectedUids.length === targetCount 
                : selectedUids.length > 0 && selectedUids.length <= eligibleTargets.length);
        
        if (!isSelectionComplete) {
             toast({ title: 'Invalid Selection', description: `Please select up to ${Math.min(targetCount, eligibleTargets.length)} players.`});
             return;
        }

        if (!canSelectMax && selectedUids.length > 0) {
            setIsConfirming(true); // Show confirmation for casting with fewer targets
        } else {
            onConfirm(selectedUids, Number(inputValue) || undefined);
        }
    } else {
         onConfirm([], Number(inputValue) || undefined);
    }
  };
  
  const handleNextStep = () => {
      if (power.name === 'Absorb') {
          const mpNeeded = caster.maxMp - caster.mp;
          const maxHpToConvert = Math.min(caster.hp - 1, mpNeeded * 2);
          const hpToConvert = Number(inputValue);
          if (inputValue === '' || hpToConvert <= 0 || hpToConvert > maxHpToConvert) {
              toast({ variant: 'destructive', title: 'Invalid Amount', description: `Please enter an amount between 1 and ${maxHpToConvert} HP.`});
              return;
          }
          onConfirm([], hpToConvert);
          return;
      } else if (power.name === 'Arcane Redirect') {
          const maxCanAfford = Math.floor(caster.mp / (power.mpCost || 15));
          const numToEmpower = Number(inputValue);
          if (inputValue === '' || numToEmpower <= 0 || numToEmpower > maxCanAfford) {
               toast({ variant: 'destructive', title: 'Cannot Cast', description: `You can empower between 1 and ${maxCanAfford} Mages.`});
              return;
          }
           onConfirm([], numToEmpower);
      }
  }

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
      const targetCount = power.targetCount || 1;
      const canSelectMax = eligibleTargets.length >= targetCount;
      const isSelectionComplete = power.target
          ? (canSelectMax 
                  ? selectedUids.length === targetCount 
                  : selectedUids.length > 0 && selectedUids.length <= eligibleTargets.length)
          : true;

      return (
          <>
            <DialogHeader>
                <DialogTitle>Select Target(s) for {power.name}</DialogTitle>
                <DialogDescription>
                    {power.targetCount ? `Choose up to ${targetCount} player(s) to affect with this power.` : 'Choose players to affect with this power.'}
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-72 w-full rounded-md border p-4">
                <div className="space-y-4">
                    {eligibleTargets.map(student => (
                        <div key={student.uid} className="flex items-center space-x-2">
                            <Checkbox
                                id={`target-${student.uid}`}
                                checked={selectedUids.includes(student.uid)}
                                onCheckedChange={() => handleSelectStudent(student.uid)}
                            />
                            <Label htmlFor={`target-${student.uid}`} className="flex-1 cursor-pointer">
                                <div className="font-bold">{student.characterName}</div>
                                <div className="text-xs text-muted-foreground">
                                    {student.studentName} ({student.hp}/{student.maxHp} HP) ({student.mp}/{student.maxMp} MP)
                                </div>
                            </Label>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <DialogFooter className="sm:justify-between">
                {power.target && (
                     <Button variant="outline" onClick={handleLetFateDecide} disabled={isFateDeciding}>
                        {isFateDeciding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Dices className="mr-2 h-4 w-4" />}
                        Let Fate Decide
                    </Button>
                )}
                <Button type="button" onClick={handleConfirmClick} disabled={!isSelectionComplete}>
                    Confirm Selection ({selectedUids.length}/{canSelectMax ? targetCount : eligibleTargets.length})
                </Button>
            </DialogFooter>
        </>
      )
  }

  return (
    <>
        <Dialog open={isOpen && !isConfirming} onOpenChange={(open) => { if(!open) onOpenChange(false); }}>
            <DialogContent className="sm:max-w-md">
               {currentStep === 1 ? renderStep1() : renderStep2()}
            </DialogContent>
        </Dialog>
        <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cast with fewer targets?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have not selected the maximum number of targets for this power. The power's effect will be divided by the maximum, so casting now may be less effective. Do you wish to proceed?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>No, let me reconsider</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onConfirm(selectedUids)}>Yes, cast the spell</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
