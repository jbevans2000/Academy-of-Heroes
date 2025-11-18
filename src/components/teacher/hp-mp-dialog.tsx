
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart, Zap } from 'lucide-react';
import { updateStudentStats } from '@/ai/flows/manage-student-stats';

interface HpMpDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: 'restore' | 'remove';
  selectedStudents: string[];
  teacherUid: string;
  onSuccess: () => void;
}

export function HpMpDialog({ isOpen, onOpenChange, mode, selectedStudents, teacherUid, onSuccess }: HpMpDialogProps) {
  const { toast } = useToast();
  const [hpAmount, setHpAmount] = useState<number | string>('');
  const [mpAmount, setMpAmount] = useState<number | string>('');
  const [reason, setReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    const hpValue = Number(hpAmount) || 0;
    const mpValue = Number(mpAmount) || 0;
    
    if (hpValue === 0 && mpValue === 0) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a non-zero amount for HP or MP.' });
        return;
    }
     if (selectedStudents.length === 0) {
        toast({ variant: 'destructive', title: 'No Students Selected', description: 'Please select at least one student.' });
        return;
    }

    setIsUpdating(true);
    const multiplier = mode === 'restore' ? 1 : -1;
    
    try {
        const result = await updateStudentStats({
            teacherUid,
            studentUids: selectedStudents,
            hp: hpValue * multiplier,
            mp: mpValue * multiplier,
            reason: reason || `${mode === 'restore' ? 'Restored' : 'Removed'} by Guild Leader`,
        });

        if (result.success) {
            toast({
                title: 'Stats Updated!',
                description: `Successfully updated stats for ${result.studentCount} student(s).`,
            });
            onSuccess();
            onOpenChange(false);
            setHpAmount('');
            setMpAmount('');
            setReason('');
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsUpdating(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{mode} HP/MP</DialogTitle>
          <DialogDescription>
            Enter a positive value to {mode} for all selected students.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hp-amount" className="text-right">
                <Heart className="inline-block mr-2 h-4 w-4 text-red-500" /> HP Amount
            </Label>
            <Input
              id="hp-amount"
              type="number"
              value={hpAmount}
              onChange={(e) => setHpAmount(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 10"
              disabled={isUpdating}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="mp-amount" className="text-right">
                <Zap className="inline-block mr-2 h-4 w-4 text-blue-500" /> MP Amount
            </Label>
            <Input
              id="mp-amount"
              type="number"
              value={mpAmount}
              onChange={(e) => setMpAmount(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 5"
              disabled={isUpdating}
            />
          </div>
           <div className="space-y-2 col-span-4">
              <Label htmlFor="hpmp-reason">
                  Reason (Optional)
              </Label>
              <Textarea
                  id="hpmp-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Rewarded for a brave act."
                  disabled={isUpdating}
              />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpdate} disabled={isUpdating || selectedStudents.length === 0}>
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            <span className="capitalize">{mode}</span> Stats ({selectedStudents.length} selected)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    