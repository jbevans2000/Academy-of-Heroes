
'use client';

import { useState, useEffect } from 'react';
import type { Student } from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { updateStudentDetails, resetStudentPassword, moderateStudent } from '@/ai/flows/manage-student';
import { getAuth, type User as AuthUser } from 'firebase/auth';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';
import { getAuth as getAdminAuth } from 'firebase-admin/auth'

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

  // Moderation State
  const [isBanned, setIsBanned] = useState(false);
  const [isLoadingBanStatus, setIsLoadingBanStatus] = useState(true);
  const [isModerating, setIsModerating] = useState(false);
  const [isBanConfirmOpen, setIsBanConfirmOpen] = useState(false);
  const [isUnbanConfirmOpen, setIsUnbanConfirmOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  useEffect(() => {
    // Reset state when a new student is selected
    if (isOpen) {
        setStudentName(student.studentName);
        setCharacterName(student.characterName);
        setNewPassword('');
        setActiveTab('details');

        const checkBanStatus = async () => {
            // This is a simplified check. A true implementation would need a secure
            // way to get the user's disabled status from the backend.
            // For now, we'll assume a local state or a field on the student object.
            // Since we can't easily get this from the client, we'll just show both options.
            // In a real app, this would be a backend call.
        };
        checkBanStatus();
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
        throw new Error(result.error);
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
        toast({ variant: 'destructive', title: 'Password Too Short', description: 'New password must be at least 6 characters.' });
        return;
    }
    setIsResettingPassword(true);
    try {
      const result = await resetStudentPassword({ teacherUid, studentUid: student.uid, newPassword });
       if (result.success) {
        toast({ title: 'Password Reset!', description: `${student.characterName}'s password has been updated.` });
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
  };

  const handleModerationAction = async (action: 'ban' | 'unban' | 'delete') => {
    setIsModerating(true);
    try {
      const result = await moderateStudent({ teacherUid, studentUid: student.uid, action });

      if (result.success) {
        toast({ title: 'Action Successful!', description: result.message });
        if (action === 'delete') {
            setStudents(prev => prev.filter(s => s.uid !== student.uid));
            onOpenChange(false); // Close dialog on delete
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Action Failed', description: error.message || 'The moderation action could not be completed.' });
    } finally {
        setIsModerating(false);
        setIsBanConfirmOpen(false);
        setIsUnbanConfirmOpen(false);
        setIsRemoveConfirmOpen(false);
    }
  }


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Hero: {student.characterName}</DialogTitle>
            <DialogDescription>
              Update student details, reset credentials, or perform moderation actions.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="danger">Danger Zone</TabsTrigger>
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
            </TabsContent>
            <TabsContent value="password" className="pt-4">
               <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input 
                            id="new-password"
                            type="text"
                            placeholder="Enter a new temporary password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            disabled={isResettingPassword}
                        />
                         <p className="text-xs text-muted-foreground">Must be at least 6 characters long.</p>
                    </div>
                     <DialogFooter>
                        <Button onClick={handleResetPassword} disabled={isResettingPassword || newPassword.length < 6}>
                           {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Reset Password
                        </Button>
                    </DialogFooter>
               </div>
            </TabsContent>
            <TabsContent value="danger" className="pt-4">
               <div className="space-y-4 p-4 border-destructive border-2 rounded-lg">
                    <h4 className="font-bold text-lg">Moderation Actions</h4>
                    <p className="text-sm text-muted-foreground">These actions have significant consequences. Please be certain.</p>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setIsBanConfirmOpen(true)}>
                            <ShieldOff className="mr-2 h-4 w-4" /> Ban Student
                        </Button>
                        <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700" onClick={() => setIsUnbanConfirmOpen(true)}>
                            <UserCheck className="mr-2 h-4 w-4" /> Unban Student
                        </Button>
                         <Button variant="destructive" onClick={() => setIsRemoveConfirmOpen(true)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remove from Guild
                        </Button>
                    </div>
               </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialogs */}
      <AlertDialog open={isBanConfirmOpen} onOpenChange={setIsBanConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to ban {student.characterName}?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will disable the student's account, preventing them from logging in until you unban them. Their data will be preserved.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleModerationAction('ban')} disabled={isModerating}>
                    {isModerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Yes, Ban Student
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isUnbanConfirmOpen} onOpenChange={setIsUnbanConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to unban {student.characterName}?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will re-enable the student's account, allowing them to log in again immediately.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleModerationAction('unban')} disabled={isModerating} className="bg-green-600 hover:bg-green-700">
                    {isModerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Yes, Unban Student
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRemoveConfirmOpen} onOpenChange={setIsRemoveConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>PERMANENTLY REMOVE {student.characterName}?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action is irreversible. It will permanently delete the student's character data and their login account. This cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleModerationAction('delete')} disabled={isModerating} className="bg-destructive hover:bg-destructive/80">
                     {isModerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Yes, Remove Permanently
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

