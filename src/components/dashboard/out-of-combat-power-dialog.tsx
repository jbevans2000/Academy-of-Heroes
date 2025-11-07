
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
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { classPowers, type Power } from '@/lib/powers';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useOutOfCombatPower } from '@/ai/flows/use-out-of-combat-power';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface OutOfCombatPowerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
}

export function OutOfCombatPowerDialog({ isOpen, onOpenChange, student }: OutOfCombatPowerDialogProps) {
  const { toast } = useToast();
  const [availablePowers, setAvailablePowers] = useState<Power[]>([]);
  const [selectedPower, setSelectedPower] = useState<Power | null>(null);
  const [companyMembers, setCompanyMembers] = useState<Student[]>([]);
  const [eligibleTargets, setEligibleTargets] = useState<Student[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCasting, setIsCasting] = useState(false);

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

  const handleConfirmClick = async () => {
    if (!selectedPower || !student.teacherUid) return;

    if(selectedPower.target && selectedTargets.length === 0) {
        toast({ variant: 'destructive', title: 'No Targets', description: 'Please select at least one target for this power.' });
        return;
    }
    
    setIsCasting(true);
    try {
        const result = await useOutOfCombatPower({
            teacherUid: student.teacherUid,
            casterUid: student.uid,
            powerName: selectedPower.name,
            targets: selectedTargets,
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
            <DialogHeader>
                <DialogTitle>Select Targets for {selectedPower.name}</DialogTitle>
                 <DialogDescription>
                    Select up to {selectedPower.targetCount || 1} target(s).
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
             <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedPower(null)}>Back</Button>
                <Button onClick={() => setIsConfirming(true)} disabled={selectedTargets.length === 0}>
                    Confirm Targets ({selectedTargets.length}/{selectedPower.targetCount || 1})
                </Button>
            </DialogFooter>
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
                <AlertDialogAction onClick={handleConfirmClick} disabled={isCasting}>
                    {isCasting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirm & Cast"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
