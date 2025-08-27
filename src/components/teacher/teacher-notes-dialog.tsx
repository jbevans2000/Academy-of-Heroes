
'use client';

import { useState, useEffect } from 'react';
import type { Student } from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { updateStudentNotes } from '@/ai/flows/manage-student';

interface TeacherNotesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
  teacherUid: string;
}

export function TeacherNotesDialog({ isOpen, onOpenChange, student, teacherUid }: TeacherNotesDialogProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotes(student.teacherNotes || '');
    }
  }, [isOpen, student.teacherNotes]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const result = await updateStudentNotes({
        teacherUid: teacherUid,
        studentUid: student.uid,
        notes: notes,
      });

      if (result.success) {
        toast({ title: 'Notes Saved', description: `Your private notes for ${student.characterName} have been updated.` });
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'Could not save your notes.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Private Notes for {student.characterName}</DialogTitle>
          <DialogDescription>
            These notes are only visible to you and will not be seen by the student.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Needs extra help with fractions, gets distracted easily by the window..."
            rows={8}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
