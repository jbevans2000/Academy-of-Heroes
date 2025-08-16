
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, writeBatch, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { TeacherHeader } from "@/components/teacher/teacher-header";
import { StudentList } from "@/components/teacher/student-list";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Coins, UserX, Swords, PlusCircle, BookOpen, Wrench, ChevronDown, Copy } from 'lucide-react';
import { calculateLevel, calculateHpGain, calculateMpGain } from '@/lib/game-mechanics';
import { logGameEvent } from '@/lib/gamelog';
import { onAuthStateChanged, type User } from 'firebase/auth';

interface TeacherData {
    name: string;
    className: string;
    classCode: string;
}

export default function TeacherDashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [xpAmount, setXpAmount] = useState<number | string>('');
  const [goldAmount, setGoldAmount] = useState<number | string>('');
  const [isAwarding, setIsAwarding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isXpDialogOpen, setIsXpDialogOpen] = useState(false);
  const [isGoldDialogOpen, setIsGoldDialogOpen] = useState(false);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const router = useRouter();

  // State for controlling the delete dialogs
  const [isDeleteStep1Open, setIsDeleteStep1Open] = useState(false);
  const [isDeleteStep2Open, setIsDeleteStep2Open] = useState(false);

  const { toast } = useToast();
  
  const fetchTeacherAndStudentData = async (user: User) => {
    setIsLoading(true);
    try {
      // Fetch teacher data
      const teacherRef = doc(db, 'teachers', user.uid);
      const teacherSnap = await getDoc(teacherRef);
      if (teacherSnap.exists()) {
        setTeacherData(teacherSnap.data() as TeacherData);
      }

      // Fetch students for that teacher
      const studentsQuerySnapshot = await getDocs(collection(db, "teachers", user.uid, "students"));
      const studentsData = studentsQuerySnapshot.docs.map(doc => ({ ...doc.data() } as Student));
      setStudents(studentsData);

    } catch (error) {
       console.error("Error fetching data: ", error);
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch your class data.',
      });
    } finally {
        setIsLoading(false);
    }
  }
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        if (user) {
            setTeacher(user);
            fetchTeacherAndStudentData(user);
        } else {
            router.push('/teacher/login');
        }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchStudents = async () => {
    if (!teacher) return;
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "teachers", teacher.uid, "students"));
      const studentsData = querySnapshot.docs.map(doc => ({ ...doc.data() } as Student));
      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching students: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch student data.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
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
          const studentDocs = await Promise.all(selectedStudents.map(uid => getDoc(doc(db, 'teachers', teacher!.uid, 'students', uid))));

          const updatedStudentsData: Student[] = [];

          for (const studentDoc of studentDocs) {
              if (studentDoc.exists()) {
                  const studentData = studentDoc.data() as Student;
                  const currentXp = studentData.xp || 0;
                  const newXp = Math.max(0, currentXp + amount);
                  
                  const currentLevel = studentData.level || 1;
                  const newLevel = calculateLevel(newXp);
                  
                  let newHp = studentData.hp;
                  let newMp = studentData.mp;

                  if (newLevel > currentLevel) {
                      const levelsGained = newLevel - currentLevel;
                      const hpGained = calculateHpGain(studentData.class, levelsGained);
                      newHp += hpGained;
                      const mpGained = calculateMpGain(studentData.class, levelsGained);
                      newMp += mpGained;
                  }
                  
                  const updates: any = { xp: newXp, level: newLevel, hp: newHp, mp: newMp };
                  batch.update(studentDoc.ref, updates);
                  updatedStudentsData.push({ ...studentData, ...updates });
              }
          }
          
          await batch.commit();

          // Update local state instead of re-fetching
          setStudents(currentStudents => 
            currentStudents.map(student => {
              const updatedStudent = updatedStudentsData.find(u => u.uid === student.uid);
              return updatedStudent || student;
            })
          );
          
          await logGameEvent('GAMEMASTER', `Awarded ${amount} XP to ${selectedStudents.length} student(s).`);

          toast({
              title: 'XP Awarded!',
              description: `${amount} XP has been awarded to ${selectedStudents.length} student(s). Levels, HP, and MP have been updated where appropriate.`,
          });
          setSelectedStudents([]);
          setXpAmount('');
          setIsXpDialogOpen(false);
      } catch (error) {
          console.error("Error awarding XP: ", error);
          toast({
              variant: 'destructive',
              title: 'Update Failed',
              description: 'Could not award XP. Please try again.',
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
          const studentDocs = await Promise.all(selectedStudents.map(uid => getDoc(doc(db, 'teachers', teacher!.uid, 'students', uid))));

          for (const studentDoc of studentDocs) {
              if (studentDoc.exists()) {
                  const currentGold = studentDoc.data().gold || 0;
                  const newGold = Math.max(0, currentGold + amount);
                  batch.update(studentDoc.ref, { gold: newGold });
              }
          }

          await batch.commit();

          // Update local state instead of re-fetching
          setStudents(currentStudents => 
            currentStudents.map(student => 
              selectedStudents.includes(student.uid)
                ? { ...student, gold: Math.max(0, (student.gold || 0) + amount) }
                : student
            )
          );
          
          await logGameEvent('GAMEMASTER', `Awarded ${amount} Gold to ${selectedStudents.length} student(s).`);

          toast({
              title: 'Gold Awarded!',
              description: `${amount} Gold has been awarded to ${selectedStudents.length} student(s).`,
          });
          setSelectedStudents([]);
          setGoldAmount('');
          setIsGoldDialogOpen(false);
      } catch (error) {
          console.error("Error awarding Gold: ", error);
          toast({
              variant: 'destructive',
              title: 'Update Failed',
              description: 'Could not award Gold. Please try again.',
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

          // Update local state
          setStudents(prev => prev.filter(s => !selectedStudents.includes(s.uid)));
          
          await logGameEvent('GAMEMASTER', `Deleted ${selectedStudents.length} student(s) from the database.`);
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
          setIsDeleteStep2Open(false); // Close the final dialog
      }
  };
  
  const copyClassCode = () => {
    if (teacherData?.classCode) {
        navigator.clipboard.writeText(teacherData.classCode);
        toast({ title: "Class Code Copied!", description: "You can now share it with your students." });
    }
  }


  if (isLoading || !teacher) {
    return (
       <div className="flex min-h-screen w-full flex-col">
        <TeacherHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-4">All Students</h1>
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
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mb-4">
            <h1 className="text-3xl font-bold">{teacherData?.className || 'Dashboard'}</h1>
             {teacherData?.classCode && (
                <div className="flex items-center gap-2 mt-2">
                    <p className="text-muted-foreground">Your Class Code:</p>
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
            >
            {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
            </Button>
            
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                    <Wrench className="mr-2 h-4 w-4" />
                    Manage
                    <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => router.push('/teacher/quests')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>Manage Quests</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/battles')}>
                        <Swords className="mr-2 h-4 w-4" />
                        <span>Manage Boss Battles</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/tools')}>
                        <Wrench className="mr-2 h-4 w-4" />
                        <span>Classroom Tools</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/gamelog')}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>Game Log</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isXpDialogOpen} onOpenChange={setIsXpDialogOpen}>
            <DialogTrigger asChild>
                <Button disabled={selectedStudents.length === 0}>
                <Star className="mr-2 h-4 w-4" /> Award Experience
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Award Experience to Selected Students</DialogTitle>
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
                <Button className="bg-green-600 hover:bg-green-700 text-white" disabled={selectedStudents.length === 0}>
                <Coins className="mr-2 h-4 w-4" /> Award Gold
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Award Gold to Selected Students</DialogTitle>
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
            
            {/* Delete Button and Dialogs */}
            <AlertDialog open={isDeleteStep1Open} onOpenChange={setIsDeleteStep1Open}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={selectedStudents.length === 0}>
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
            students={students} 
            selectedStudents={selectedStudents}
            onSelectStudent={handleToggleStudentSelection}
            setStudents={setStudents}
        />
      </main>
    </div>
  );
}

    