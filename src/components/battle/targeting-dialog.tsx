

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

interface TargetingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  power: Power;
  students: Student[];
  caster: Student;
  onConfirm: (targets: string[]) => void;
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

  useEffect(() => {
    if (isOpen) {
      setSelectedUids([]);
      setIsConfirming(false);
    }
  }, [isOpen]);

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
    onConfirm(randomUids);
  };

  const handleConfirmClick = () => {
    const maxTargets = power.targetCount || 1;
    if (eligibleTargets.length >= maxTargets) {
        // If enough targets are available, they MUST select the max.
        // This button should be disabled anyway, but this is a safeguard.
        if (selectedUids.length < maxTargets) return;
        onConfirm(selectedUids);
    } else {
        // Not enough targets available, show confirmation dialog
        setIsConfirming(true);
    }
  };

  const targetCount = power.targetCount || 1;
  const canSelectMax = eligibleTargets.length >= targetCount;
  const isSelectionComplete = canSelectMax 
    ? selectedUids.length === targetCount 
    : selectedUids.length > 0;

  return (
    <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle>Select Target(s) for {power.name}</DialogTitle>
            <DialogDescription>
                Choose up to {targetCount} player(s) to affect with this power.
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
            <Button variant="outline" onClick={handleLetFateDecide} disabled={isFateDeciding}>
                {isFateDeciding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Dices className="mr-2 h-4 w-4" />}
                Let Fate Decide
            </Button>
            <Button type="button" onClick={handleConfirmClick} disabled={!isSelectionComplete}>
                Confirm Selection ({selectedUids.length}/{canSelectMax ? targetCount : eligibleTargets.length})
            </Button>
            </DialogFooter>
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
