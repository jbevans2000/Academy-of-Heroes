
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, User, ShieldCheck, ShieldOff, Trash2, UserCheck } from 'lucide-react';
import { updateStudentDetails } from '@/ai/flows/manage-student';

interface ManageStudentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  teacherUid: string;
}

export function ManageStudentDialog({ isOpen, onOpenChange, student, setStudents, teacherUid }: ManageStudentDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');

  // Details State
  const [studentName, setStudentName] = useState(student.studentName);
  const [characterName, setCharacterName] = useState(student.characterName);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  
  useEffect(() => {
    // Reset state when a new student is selected
    if (isOpen) {
        setStudentName(student.studentName);
        setCharacterName(student.characterName);
        setActiveTab('details');
    }
  }, [isOpen, student]);


  const handleUpdateDetails = async () => {
    if (!studentName || !characterName) {
      toast({ variant: 'destructive', title: 'Missing names', description: 'Student and character names cannot be empty.' });
      return;
    }
    setIsSavingDetails(true);
    try {
      const result = await updateStudentDetails({
        teacherUid,
        studentUid: student.uid,
        studentName,
        characterName,
      });

      if (result.success) {
        setStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, studentName, characterName } : s));
        toast({ title: 'Details Updated', description: "The student's names have been changed." });
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Could not update student details.' });
    } finally {
      setIsSavingDetails(false);
    }
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Hero: {student.characterName}</DialogTitle>
            <DialogDescription>
              Update student details. For password resets, please use the main login page's "Forgot Password" link if the student used an email.
            </DialogDescription>
          </DialogHeader>
            <div className="pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-name">Student's Real Name</Label>
                  <Input
                    id="student-name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    disabled={isSavingDetails}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="character-name">Character Name</Label>
                  <Input
                    id="character-name"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    disabled={isSavingDetails}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alias">Hero's Alias (Login)</Label>
                  <Input id="alias" value={student.studentId} disabled />
                  <p className="text-xs text-muted-foreground">The Hero's Alias cannot be changed after creation.</p>
                </div>
                <DialogFooter>
                  <Button onClick={handleUpdateDetails} disabled={isSavingDetails}>
                    {isSavingDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Details
                  </Button>
                </DialogFooter>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
