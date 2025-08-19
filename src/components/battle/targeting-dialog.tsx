
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Power } from '@/lib/powers';
import { Student } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Dices } from 'lucide-react';

interface TargetingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  power: Power;
  students: Student[];
  caster: Student;
  onConfirm: (targets: string[]) => void;
  battleState: any; // Pass the live battle state for checks
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

export function TargetingDialog({ isOpen, onOpenChange, power, students, caster, onConfirm, battleState }: TargetingDialogProps) {
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const { toast } = useToast();

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUids([]);
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

  const getEligibleTargets = () => {
    let potentialTargets = students;

    // UNIVERSAL RULE: Can't target self unless specified (Healer powers can often target self)
    if (power.target !== 'ally' && caster.class !== 'Healer') {
         potentialTargets = students.filter(s => s.uid !== caster.uid);
    }
    
    // UNIVERSAL RULE: Fallen players can only be targeted by specific powers
    if (power.target !== 'fallen') {
        potentialTargets = potentialTargets.filter(s => s.hp > 0);
    } else {
        potentialTargets = potentialTargets.filter(s => s.hp <= 0);
    }
    
    // POWER-SPECIFIC RULES
    if (power.name === 'Lesser Heal') {
      potentialTargets = potentialTargets.filter(s => s.hp < s.maxHp);
    } else if (power.name === 'Focused Restoration') {
        potentialTargets = potentialTargets.filter(s => s.hp <= s.maxHp * 0.5);
    } else if (power.name === 'Solar Empowerment') {
        potentialTargets = potentialTargets.filter(p => 
            p.class === 'Mage' && 
            !(battleState.empoweredMageUids || []).includes(p.uid)
        );
    } else if (power.name === 'Psionic Aura') {
        potentialTargets = potentialTargets.filter(s => s.mp <= s.maxMp * 0.75);
    }


    return potentialTargets;
  }

  const eligibleTargets = getEligibleTargets();

  const handleLetFateDecide = () => {
    const targetCount = power.targetCount || 1;
    if (eligibleTargets.length < targetCount) {
        toast({ variant: 'destructive', title: 'Not Enough Targets', description: 'There are not enough eligible targets to randomly select.' });
        return;
    }
    const shuffled = shuffleArray(eligibleTargets);
    const randomUids = shuffled.slice(0, targetCount).map(s => s.uid);
    setSelectedUids(randomUids);
  };

  const targetCount = power.targetCount || 1;
  const isSelectionComplete = selectedUids.length === targetCount;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Target(s) for {power.name}</DialogTitle>
          <DialogDescription>
            Choose {targetCount} player(s) to affect with this power.
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
             {eligibleTargets.length === 0 && (
                <p className="text-center text-muted-foreground py-10">There are no eligible targets for this power right now.</p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="sm:justify-between">
           <Button variant="outline" onClick={handleLetFateDecide}>
                <Dices className="mr-2 h-4 w-4" />
                Let Fate Decide
            </Button>
          <Button type="button" onClick={() => onConfirm(selectedUids)} disabled={!isSelectionComplete}>
            Confirm Power ({selectedUids.length}/{targetCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
