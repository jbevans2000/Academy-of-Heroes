
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

  // Ban/Unban/Delete State
  const [isModerating, setIsModerating] = useState(false);
  const [isBanConfirmOpen, setIsBanConfirmOpen] = useState(false);
  const [isUnbanConfirmOpen, setIsUnbanConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
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
  
  const handleModerateStudent = async (action: 'ban' | 'unban' | 'delete') => {
      setIsModerating(true);
      try {
          const result = await StudentManager.moderateStudent({
              teacherUid,
              studentUid: student.uid,
              action,
          });
          
          if (result.success) {
              toast({ title: result.message });
              onOpenChange(false); // Close dialog on success
              if (action === 'delete') {
                  setStudents(prev => prev.filter(s => s.uid !== student.uid));
              } else {
                   setStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, isArchived: action === 'ban' } : s));
              }
          } else {
              throw new Error(result.error);
          }
      } catch (error: any) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
      } finally {
          setIsModerating(false);
          setIsBanConfirmOpen(false);
          setIsUnbanConfirmOpen(false);
          setIsDeleteConfirmOpen(false);
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
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
            <TabsContent value="status" className="pt-4">
                <div className="space-y-4">
                    {student.isArchived ? (
                         <Button onClick={() => setIsUnbanConfirmOpen(true)} className="w-full bg-green-600 hover:bg-green-700">
                             <UserCheck className="mr-2 h-4 w-4" /> Restore Student Account
                         </Button>
                    ) : (
                         <Button onClick={() => setIsBanConfirmOpen(true)} variant="destructive" className="w-full">
                            <ShieldOff className="mr-2 h-4 w-4" /> Archive Student Account
                        </Button>
                    )}
                    <Button onClick={() => setIsDeleteConfirmOpen(true)} variant="destructive" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" /> Permanently Delete Student
                    </Button>
                </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

       <AlertDialog open={isBanConfirmOpen} onOpenChange={setIsBanConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {student.characterName}'s Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving an account will prevent the student from logging in. You can restore their account later from the "Archived Heroes" tool. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleModerateStudent('ban')} className="bg-destructive hover:bg-destructive/90">Archive Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isUnbanConfirmOpen} onOpenChange={setIsUnbanConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {student.characterName}'s Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will re-enable the student's account, allowing them to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleModerateStudent('unban')}>Restore Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete {student.characterName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All of this student's data, including their character, progress, and authentication record, will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleModerateStudent('delete')} className="bg-destructive hover:bg-destructive/90">Yes, Permanently Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
