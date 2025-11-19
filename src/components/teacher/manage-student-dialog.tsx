
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
import * as StudentManager from '@/ai/flows/manage-student';

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

  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  useEffect(() => {
    // Reset state when a new student is selected
    if (isOpen) {
        setStudentName(student.studentName);
        setCharacterName(student.characterName);
        setNewPassword('');
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
      const result = await StudentManager.updateStudentDetails({
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
  
  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
        toast({ variant: 'destructive', title: 'Password Too Short', description: 'New password must be at least 6 characters.'});
        return;
    }
    setIsResettingPassword(true);
    try {
        const result = await StudentManager.resetStudentPassword({
            studentUid: student.uid,
            newPassword: newPassword,
        });
        if (result.success) {
            toast({ title: 'Password Reset Successfully!', description: 'The student can now log in with their new password.' });
            setNewPassword('');
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Reset Failed', description: error.message || 'Could not reset the password.' });
    } finally {
        setIsResettingPassword(false);
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Hero: {student.characterName}</DialogTitle>
            <DialogDescription>
              Update student details or manage their account status.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="pt-4">
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
                  <Label htmlFor="alias">Username / Email</Label>
                  <Input id="alias" value={student.studentId || student.email} disabled />
                  <p className="text-xs text-muted-foreground">The Username/Email cannot be changed after creation.</p>
                </div>
                <DialogFooter>
                  <Button onClick={handleUpdateDetails} disabled={isSavingDetails}>
                    {isSavingDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Details
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
            <TabsContent value="password" className="pt-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter a new password"
                    disabled={isResettingPassword}
                  />
                  <p className="text-xs text-muted-foreground">The student will be able to log in with this password immediately.</p>
                </div>
                <DialogFooter className="mt-4">
                    <Button onClick={handleResetPassword} disabled={isResettingPassword || !newPassword}>
                        {isResettingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                        Reset Password
                    </Button>
                </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
