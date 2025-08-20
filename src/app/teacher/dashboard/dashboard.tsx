
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, getDoc, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, PendingStudent, ClassType } from '@/lib/data';
import { TeacherHeader } from "@/components/teacher/teacher-header";
import { StudentList } from "@/components/teacher/student-list";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Coins, UserX, Swords, BookOpen, Wrench, ChevronDown, Copy, Check, X, Bell, SortAsc, Trash2 } from 'lucide-react';
import { calculateLevel, calculateHpGain, calculateMpGain } from '@/lib/game-mechanics';
import { logGameEvent } from '@/lib/gamelog';
import { onAuthStateChanged, type User } from 'firebase/auth';

interface TeacherData {
    name: string;
    className: string;
    classCode: string;
}

type SortOrder = 'studentName' | 'characterName' | 'xp' | 'class';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [xpAmount, setXpAmount] = useState<number | string>('');
  const [goldAmount, setGoldAmount] = useState<number | string>('');
  const [isAwarding, setIsAwarding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingBattlefield, setIsClearingBattlefield] = useState(false);
  const [isXpDialogOpen, setIsXpDialogOpen] = useState(false);
  const [isGoldDialogOpen, setIsGoldDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isDeleteStep1Open, setIsDeleteStep1Open] = useState(false);
  const [isDeleteStep2Open, setIsDeleteStep2Open] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  
  const [sortOrder, setSortOrder] = useState<SortOrder>('studentName');

  const { toast } = useToast();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        setTeacher(user);
        
        // Fetch static teacher data once
        const teacherRef = doc(db, 'teachers', user.uid);
        const teacherSnap = await getDoc(teacherRef);
        if (teacherSnap.exists()) {
            setTeacherData(teacherSnap.data() as TeacherData);
        }

        // Set up real-time listener for students
        const studentsQuery = collection(db, "teachers", user.uid, "students");
        const studentsUnsubscribe = onSnapshot(studentsQuery, (snapshot) => {
            const studentData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
            setStudents(studentData);
            setIsLoading(false);
        });
      
        // Set up real-time listener for pending students
        const pendingStudentsQuery = collection(db, "teachers", user.uid, "pendingStudents");
        const pendingUnsubscribe = onSnapshot(pendingStudentsQuery, (snapshot) => {
            setPendingStudents(snapshot.docs.map(doc => ({ ...doc.data() } as PendingStudent)));
        });

        // Cleanup listeners on unmount
        return () => {
            studentsUnsubscribe();
            pendingUnsubscribe();
        };

      } else {
        router.push('/teacher/login');
      }
    });

    if (searchParams.get('new') === 'true') {
        setShowWelcomeDialog(true);
    }

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Changed to run only once

  const sortedStudents = useMemo(() => {
    const sorted = [...students];
    switch(sortOrder) {
      case 'studentName':
        sorted.sort((a, b) => a.studentName.localeCompare(b.studentName));
        break;
      case 'characterName':
        sorted.sort((a, b) => a.characterName.localeCompare(b.characterName));
        break;
      case 'xp':
        sorted.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        break;
      case 'class':
        const classOrder: ClassType[] = ['Guardian', 'Healer', 'Mage'];
        sorted.sort((a, b) => classOrder.indexOf(a.class) - classOrder.indexOf(b.class));
        break;
      default:
        break;
    }
    return sorted;
  }, [students, sortOrder]);

  const handleToggleStudentSelection = (uid: string) => {
    setSelectedStudents(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.uid));
    }
  };

  const handleAwardXp = async () => {
      const amount = Number(xpAmount);
      if (isNaN(amount) || amount === 0) {
          toast({
              variant: 'destructive',
              title: 'Invalid Amount',
              description: 'Please enter a valid non-zero number for XP.',
          });
          return;
      }
      if (selectedStudents.length === 0) {
          toast({
              variant: 'destructive',
              title: 'No Students Selected',
              description: 'Please select at least one student.',
          });
          return;
      }

      setIsAwarding(true);
      
      try {
          const batch = writeBatch(db);
          // Use the local state which is already up-to-date
          const studentsToUpdate = students.filter(s => selectedStudents.includes(s.uid));

          for (const studentData of studentsToUpdate) {
              const studentRef = doc(db, 'teachers', teacher!.uid, 'students', studentData.uid);
              const currentXp = studentData.xp || 0;
              const newXp = Math.max(0, currentXp + amount);
              
              const currentLevel = studentData.level || 1;
              const newLevel = calculateLevel(newXp);
              
              const updates: Partial<Student> = { xp: newXp };

              if (newLevel > currentLevel) {
                  const levelsGained = newLevel - currentLevel;
                  const hpGained = calculateHpGain(studentData.class, levelsGained);
                  const mpGained = calculateMpGain(studentData.class, levelsGained);

                  updates.level = newLevel;
                  updates.hp = (studentData.hp || 0) + hpGained;
                  updates.maxHp = (studentData.maxHp || 0) + hpGained;
                  updates.mp = (studentData.mp || 0) + mpGained;
                  updates.maxMp = (studentData.maxMp || 0) + mpGained;
              }
              
              batch.update(studentRef, updates);
          }
          
          await batch.commit();
          // Real-time listener will update the UI automatically
          
          await logGameEvent(teacher!.uid, 'GAMEMASTER', `Bestowed ${amount} XP to ${selectedStudents.length} student(s).`);

          toast({
              title: 'Experience Bestowed!',
              description: `${amount} XP has been bestowed upon ${selectedStudents.length} student(s). Levels, HP, and MP have been updated where appropriate.`,
          });
          setSelectedStudents([]);
          setXpAmount('');
          setIsXpDialogOpen(false);
      } catch (error) {
          console.error("Error awarding XP: ", error);
          toast({
              variant: 'destructive',
              title: 'Update Failed',
              description: 'Could not bestow Experience. Please try again.',
          });
      } finally {
          setIsAwarding(false);
      }
  };

  const handleAwardGold = async () => {
      const amount = Number(goldAmount);
      if (isNaN(amount) || amount === 0) {
          toast({
              variant: 'destructive',
              title: 'Invalid Amount',
              description: 'Please enter a valid non-zero number for Gold.',
          });
          return;
      }
      if (selectedStudents.length === 0) {
          toast({
              variant: 'destructive',
              title: 'No Students Selected',
              description: 'Please select at least one student.',
          });
          return;
      }

      setIsAwarding(true);

      try {
          const batch = writeBatch(db);
          const studentsToUpdate = students.filter(s => selectedStudents.includes(s.uid));

          for (const studentData of studentsToUpdate) {
              const studentRef = doc(db, 'teachers', teacher!.uid, 'students', studentData.uid);
              const currentGold = studentData.gold || 0;
              const newGold = Math.max(0, currentGold + amount);
              batch.update(studentRef, { gold: newGold });
          }

          await batch.commit();
          // Real-time listener will update UI
          
          await logGameEvent(teacher!.uid, 'GAMEMASTER', `Bestowed ${amount} Gold to ${selectedStudents.length} student(s).`);

          toast({
              title: 'Gold Bestowed!',
              description: `${amount} Gold has been bestowed upon ${selectedStudents.length} student(s).`,
          });
          setSelectedStudents([]);
          setGoldAmount('');
          setIsGoldDialogOpen(false);
      } catch (error) {
          console.error("Error awarding Gold: ", error);
          toast({
              variant: 'destructive',
              title: 'Update Failed',
              description: 'Could not bestow Gold. Please try again.',
          });
      } finally {
          setIsAwarding(false);
      }
  };

  const handleDeleteStudents = async () => {
      if (selectedStudents.length === 0 || !teacher) return;
      setIsDeleting(true);

      try {
          const batch = writeBatch(db);
          for (const uid of selectedStudents) {
              const studentRef = doc(db, 'teachers', teacher.uid, 'students', uid);
              batch.delete(studentRef);
          }
          await batch.commit();
          // Real-time listener will update UI
          
          await logGameEvent(teacher.uid, 'GAMEMASTER', `Deleted ${selectedStudents.length} student(s) from the database.`);
          setSelectedStudents([]);
          
          toast({
              title: 'Student Data Deleted',
              description: 'IMPORTANT: You must now manually delete the user(s) from the Firebase Authentication console to prevent them from logging back in.',
              duration: 10000,
          });

      } catch (error) {
          console.error("Error deleting students:", error);
          toast({
              variant: 'destructive',
              title: 'Deletion Failed',
              description: 'Could not delete student data from Firestore.',
          });
      } finally {
          setIsDeleting(false);
          setIsDeleteStep2Open(false);
      }
  };
  
  const copyClassCode = () => {
    if (teacherData?.classCode) {
        navigator.clipboard.writeText(teacherData.classCode);
        toast({ title: "Guild Code Copied!", description: "You can now share it with your students." });
    }
  }

  const handleApproval = async (pendingStudent: PendingStudent, isApproved: boolean) => {
    if (!teacher) return;
    const { uid } = pendingStudent;
  
    const pendingStudentRef = doc(db, 'teachers', teacher.uid, 'pendingStudents', uid);
  
    if (isApproved) {
      const { status, requestedAt, ...newStudentData } = pendingStudent;
      const newStudent: Student = {
        ...newStudentData,
        backgroundUrl: '',
        xp: 0,
        gold: 0,
        level: 1,
        questProgress: {},
        hubsCompleted: 0,
        isNewlyApproved: true,
      };
      
      const newStudentRef = doc(db, 'teachers', teacher.uid, 'students', uid);
      
      const batch = writeBatch(db);
      batch.set(newStudentRef, newStudent);
      batch.delete(pendingStudentRef);
      
      await batch.commit();
      // Real-time listeners will handle UI updates.
      
      await logGameEvent(teacher.uid, 'ACCOUNT', `${newStudent.studentName} (${newStudent.characterName}) was approved and joined the guild.`);
      toast({ title: "Hero Approved!", description: `${newStudent.characterName} has joined your guild.` });
    } else {
      // If rejected, delete the pending doc. Deleting from Auth is a manual step.
      await deleteDoc(pendingStudentRef);
      await logGameEvent(teacher.uid, 'ACCOUNT', `The application for ${pendingStudent.studentName} (${pendingStudent.characterName}) was rejected.`);
      toast({ title: "Request Rejected", description: `The request for ${pendingStudent.characterName} has been deleted.` });
    }
  
    // UI will update from the listener
    if (pendingStudents.length === 1) {
      setIsApprovalDialogOpen(false); // Close dialog if it was the last one
    }
  };

  const handleClearBattlefield = async () => {
      if (!teacher) return;
      setIsClearingBattlefield(true);
      try {
          const liveBattleRef = doc(db, 'teachers', teacher.uid, 'liveBattles', 'active-battle');
          await deleteDoc(liveBattleRef);
          toast({ title: 'Battlefield Cleared', description: 'The live battle has been reset.' });
      } catch (error: any) {
          if (error.code === 'not-found') {
              toast({ title: 'Battlefield Already Clear', description: 'No active battle to clear.' });
          } else {
              console.error("Error clearing battlefield:", error);
              toast({ variant: 'destructive', title: 'Error', description: 'Could not clear the battlefield.' });
          }
      } finally {
          setIsClearingBattlefield(false);
      }
  };


  if (isLoading || !teacher) {
    return (
       <div className="flex min-h-screen w-full flex-col">
        <TeacherHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-4">Your Guild Roster</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-8 w-3/4" />
                         <Skeleton className="h-6 w-1/2" />
                    </div>
                ))}
            </div>
        </main>
      </div>
    )
  }


  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <div 
          className="absolute inset-0 -z-10"
          style={{
              backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-ce8d0a97-c3e6-4724-a068-0252574124c1.jpg?alt=media&token=04749b08-26a8-49b9-83f5-ff45780a6547')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.5,
          }}
      />
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <AlertDialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-3xl">Welcome, Guild Leader!</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-base text-foreground space-y-4">
                        <p>Your guild is ready! To get your students started, give them your unique Guild Code and instruct them to follow these steps:</p>
                        <ol className="list-decimal list-inside space-y-2 pt-2 text-foreground text-lg">
                            <li>Go to the main login page.</li>
                            <li>Click "Forge Your Hero & Join a Guild".</li>
                            <li>Enter your Guild Code: 
                                <strong className="font-mono text-xl bg-primary/10 px-2 py-1 rounded-md mx-1">{teacherData?.classCode}</strong>
                            </li>
                            <li>Fill out the rest of the form to create their character.</li>
                        </ol>
                         <p>Once they register, you will see their application appear in the "Pending Approvals" dialog on this dashboard.</p>
                      </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => {
                        setShowWelcomeDialog(false)
                        copyClassCode()
                        }}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Code & Close
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Pending Guild Applications</DialogTitle>
                    <DialogDescription>
                        The following heroes have requested to join your guild. Approve or reject their applications.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {pendingStudents.length > 0 ? pendingStudents.map(ps => (
                        <div key={ps.uid} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <p className="font-bold">{ps.characterName}</p>
                                <p className="text-sm text-muted-foreground">{ps.studentName}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="destructive" onClick={() => handleApproval(ps, false)}>
                                    <X className="mr-2 h-4 w-4"/> Reject
                                </Button>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproval(ps, true)}>
                                    <Check className="mr-2 h-4 w-4"/> Approve
                                </Button>
                            </div>
                        </div>
                    )) : <p className='text-muted-foreground text-center'>No pending approvals.</p>}
                </div>
            </DialogContent>
        </Dialog>
        
        <div className="mb-4 bg-white/90 p-4 rounded-lg shadow-md">
            <h1 className="text-3xl font-bold">{teacherData?.className || 'The Guild Leader\'s Dais'}</h1>
             {teacherData?.classCode && (
                <div className="flex items-center gap-2 mt-2">
                    <p className="text-muted-foreground">Your Guild Code:</p>
                    <span className="font-mono text-lg font-bold bg-primary/10 px-2 py-1 rounded-md">{teacherData.classCode}</span>
                    <Button variant="ghost" size="icon" onClick={copyClassCode}>
                        <Copy className="h-5 w-5" />
                    </Button>
                </div>
            )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
            <Button 
            onClick={handleSelectAllToggle}
            disabled={students.length === 0}
            variant="outline"
            className="text-black border-black"
            >
            {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
            </Button>
            
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-black border-black">
                    <Wrench className="mr-2 h-4 w-4" />
                    Manage
                    <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => router.push('/teacher/quests')}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>The Quest Archives</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/battles')}>
                        <Swords className="mr-2 h-4 w-4" />
                        <span>The Monster Compendium</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/tools')}>
                        <Wrench className="mr-2 h-4 w-4" />
                        <span>The Guild Leader's Toolkit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/gamelog')}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>The Chronicler's Scroll</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <SortAsc className="mr-2 h-4 w-4" />
                        <span>Sort Students</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                         <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioItem value="studentName">Student Name</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="characterName">Character Name</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="xp">Experience</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="class">Class</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear the Battlefield
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to clear the battlefield?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will delete any active battle data, allowing you to start a new one. This is useful if a battle was ended improperly. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearBattlefield} disabled={isClearingBattlefield}>
                                {isClearingBattlefield && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Yes, Clear Battlefield
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>

            {pendingStudents.length > 0 && (
                <Button variant="secondary" onClick={() => setIsApprovalDialogOpen(true)} className="border-black border">
                    <Bell className="mr-2 h-4 w-4 animate-pulse" />
                    Pending Approvals ({pendingStudents.length})
                </Button>
            )}

            <Dialog open={isXpDialogOpen} onOpenChange={setIsXpDialogOpen}>
            <DialogTrigger asChild>
                <Button disabled={selectedStudents.length === 0} className="text-black border-black border">
                <Star className="mr-2 h-4 w-4" /> Bestow Experience
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Bestow Experience to Selected Students</DialogTitle>
                <DialogDescription>
                    Enter a positive value to add XP or a negative value to remove XP. This will apply to all selected students.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="xp-amount" className="text-right">
                    XP Amount
                    </Label>
                    <Input
                    id="xp-amount"
                    type="number"
                    value={xpAmount}
                    onChange={(e) => setXpAmount(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., 100 or -50"
                    disabled={isAwarding}
                    />
                </div>
                </div>
                <DialogFooter>
                <Button onClick={handleAwardXp} disabled={isAwarding || selectedStudents.length === 0}>
                    {isAwarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Award ({selectedStudents.length} selected)
                </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
            <Dialog open={isGoldDialogOpen} onOpenChange={setIsGoldDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white border-black border" disabled={selectedStudents.length === 0}>
                <Coins className="mr-2 h-4 w-4" /> Bestow Gold
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Bestow Gold to Selected Students</DialogTitle>
                <DialogDescription>
                    Enter a positive value to add Gold or a negative value to remove it. This will apply to all selected students.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="gold-amount" className="text-right">
                    Gold Amount
                    </Label>
                    <Input
                    id="gold-amount"
                    type="number"
                    value={goldAmount}
                    onChange={(e) => setGoldAmount(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., 50 or -10"
                    disabled={isAwarding}
                    />
                </div>
                </div>
                <DialogFooter>
                <Button onClick={handleAwardGold} disabled={isAwarding || selectedStudents.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
                    {isAwarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Award ({selectedStudents.length} selected)
                </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
            
            <AlertDialog open={isDeleteStep1Open} onOpenChange={setIsDeleteStep1Open}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={selectedStudents.length === 0} className="border-black border">
                        <UserX className="mr-2 h-4 w-4" /> Delete Selected
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure? (Step 1 of 2)</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete all character data (XP, Gold, Level, etc.) for the
                            <span className="font-bold"> {selectedStudents.length} selected student(s)</span>.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setIsDeleteStep1Open(false);
                            setIsDeleteStep2Open(true);
                        }}>
                            Continue to Final Confirmation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={isDeleteStep2Open} onOpenChange={setIsDeleteStep2Open}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Final Confirmation (Step 2 of 2)</AlertDialogTitle>
                        <AlertDialogDescription>
                            This is your final warning. Deleting this data is permanent. After this, you must also delete the user from Firebase Authentication to fully remove them.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStudents} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Yes, Delete All Character Data
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        <StudentList 
            students={sortedStudents} 
            selectedStudents={selectedStudents}
            onSelectStudent={handleToggleStudentSelection}
            setStudents={setStudents}
            teacherUid={teacher.uid}
        />
      </main>
    </div>
  );
}
