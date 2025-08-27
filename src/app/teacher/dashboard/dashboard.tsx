

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, getDoc, onSnapshot, writeBatch, deleteDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, PendingStudent, ClassType, Company } from '@/lib/data';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Coins, UserX, Swords, BookOpen, Wrench, ChevronDown, Copy, Check, X, Bell, SortAsc, Trash2, DatabaseZap, BookHeart, Users, ShieldAlert, Gift, Gamepad2, School, Archive, Briefcase, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { calculateLevel, calculateHpGain, calculateMpGain, MAX_LEVEL } from '@/lib/game-mechanics';
import { logGameEvent } from '@/lib/gamelog';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { archiveStudents } from '@/ai/flows/manage-student';
import { TeacherMessageCenter } from '@/components/teacher/teacher-message-center';

interface TeacherData {
    name: string;
    className: string;
    classCode: string;
    pendingCleanupBattleId?: string;
}

type SortOrder = 'studentName' | 'characterName' | 'xp' | 'class' | 'company';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [xpAmount, setXpAmount] = useState<number | string>('');
  const [goldAmount, setGoldAmount] = useState<number | string>('');
  const [isAwarding, setIsAwarding] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isXpDialogOpen, setIsXpDialogOpen] = useState(false);
  const [isGoldDialogOpen, setIsGoldDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  
  const [sortOrder, setSortOrder] = useState<SortOrder>('studentName');

  const { toast } = useToast();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
        if (!user) {
            router.push('/teacher/login');
            return;
        }

        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);
        const isAdmin = adminSnap.exists();
        const viewingTeacherId = searchParams.get('teacherId');

        if (isAdmin && viewingTeacherId) {
            // Admin is viewing a specific teacher's dashboard
            setTeacher({ uid: viewingTeacherId } as User);
        } else {
            // Regular teacher viewing their own dashboard
            setTeacher(user);
        }
    });

    if (searchParams.get('new') === 'true') {
        setShowWelcomeDialog(true);
    }

    return () => unsubscribe();
  }, [searchParams, router]);

  useEffect(() => {
    if (!teacher?.uid) return;

    const teacherUid = teacher.uid;
    
    // Fetch static teacher data once, but listen for changes to the cleanup flag
    const teacherRef = doc(db, 'teachers', teacherUid);
    const unsubTeacher = onSnapshot(teacherRef, (teacherSnap) => {
        if (teacherSnap.exists()) {
            const data = teacherSnap.data() as TeacherData;
            setTeacherData(data);
            if (data.pendingCleanupBattleId) {
                // Wait 20 seconds then trigger cleanup
                setTimeout(() => {
                    handleClearAllBattleStatus(true); // Pass flag to indicate auto-cleanup
                }, 20000);
            }
        }
    });

    // Set up real-time listener for students
    const studentsQuery = collection(db, "teachers", teacherUid, "students");
    const studentsUnsubscribe = onSnapshot(studentsQuery, (snapshot) => {
        const studentData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
        setStudents(studentData);
        setIsLoading(false);
    });
    
    // Set up real-time listener for pending students
    const pendingStudentsQuery = collection(db, "teachers", teacherUid, "pendingStudents");
    const pendingUnsubscribe = onSnapshot(pendingStudentsQuery, (snapshot) => {
        setPendingStudents(snapshot.docs.map(doc => ({ ...doc.data() } as PendingStudent)));
    });
    
    // Set up real-time listener for companies
    const companiesQuery = collection(db, 'teachers', teacherUid, 'companies');
    const companiesUnsubscribe = onSnapshot(companiesQuery, (snapshot) => {
        const companiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
        setCompanies(companiesData.sort((a,b) => a.name.localeCompare(b.name)));
    });


    // Cleanup listeners on unmount
    return () => {
        unsubTeacher();
        studentsUnsubscribe();
        pendingUnsubscribe();
        companiesUnsubscribe();
    };
  }, [teacher]);


  const sortedStudents = useMemo(() => {
    const relevantStudents = students.filter(s => !s.isArchived && (showHidden ? s.isHidden : !s.isHidden));
    switch(sortOrder) {
      case 'studentName':
        return { type: 'flat', data: [...relevantStudents].sort((a, b) => a.studentName.localeCompare(b.studentName)) };
      case 'characterName':
        return { type: 'flat', data: [...relevantStudents].sort((a, b) => a.characterName.localeCompare(b.characterName)) };
      case 'xp':
        return { type: 'flat', data: [...relevantStudents].sort((a, b) => (b.xp || 0) - (a.xp || 0)) };
      case 'class':
        const classOrder: ClassType[] = ['Guardian', 'Healer', 'Mage'];
        return { type: 'flat', data: [...relevantStudents].sort((a, b) => classOrder.indexOf(a.class) - classOrder.indexOf(b.class)) };
      case 'company':
        const grouped: { [companyId: string]: Student[] } = {};
        const freelancers: Student[] = [];

        relevantStudents.forEach(student => {
            if (student.companyId && companies.find(c => c.id === student.companyId)) {
                if (!grouped[student.companyId]) {
                    grouped[student.companyId] = [];
                }
                grouped[student.companyId].push(student);
            } else {
                freelancers.push(student);
            }
        });
        
        // Sort students within each company
        for (const companyId in grouped) {
            grouped[companyId].sort((a, b) => a.characterName.localeCompare(b.characterName));
        }
        
        // Sort freelancers
        freelancers.sort((a, b) => a.characterName.localeCompare(b.characterName));

        // Create a sorted list of company IDs based on company names
        const sortedCompanyIds = companies
            .filter(c => grouped[c.id]) // Only include companies that have members
            .map(c => c.id);

        return { type: 'grouped', data: grouped, freelancers, companyOrder: sortedCompanyIds };
      default:
        return { type: 'flat', data: relevantStudents };
    }
  }, [students, sortOrder, companies, showHidden]);

  const handleToggleStudentSelection = (uid: string) => {
    setSelectedStudents(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAllToggle = () => {
     const allSortedUids = students.filter(s => !s.isArchived).map(s => s.uid);
    if (selectedStudents.length === allSortedUids.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(allSortedUids);
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
          let studentsAtMaxLevel = 0;

          for (const studentData of studentsToUpdate) {
              const currentLevel = studentData.level || 1;

              if (currentLevel >= MAX_LEVEL && amount > 0) {
                  studentsAtMaxLevel++;
                  continue; // Skip awarding positive XP to max-level students
              }

              const studentRef = doc(db, 'teachers', teacher!.uid, 'students', studentData.uid);
              const currentXp = studentData.xp || 0;
              const newXp = Math.max(0, currentXp + amount);
              
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
          
          await logGameEvent(teacher!.uid, 'GAMEMASTER', `Bestowed ${amount} XP to ${selectedStudents.length} student(s).`);

          toast({
              title: 'Experience Bestowed!',
              description: `${amount} XP has been bestowed upon ${selectedStudents.length - studentsAtMaxLevel} student(s). Levels, HP, and MP have been updated where appropriate.`,
          });

          if (studentsAtMaxLevel > 0) {
            toast({
                variant: 'default',
                title: 'Note',
                description: `${studentsAtMaxLevel} student(s) are at the max level and did not receive XP.`,
            });
          }

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

  const handleArchiveStudents = async () => {
    if (!teacher || selectedStudents.length === 0) return;
    setIsArchiving(true);
    try {
      const result = await archiveStudents({
        teacherUid: teacher.uid,
        studentUids: selectedStudents
      });

      if (result.success) {
        toast({ title: 'Students Archived', description: `${selectedStudents.length} student(s) have been archived.` });
        setSelectedStudents([]);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Archive Failed', description: error.message });
    } finally {
      setIsArchiving(false);
      setIsArchiveConfirmOpen(false);
    }
  }
  
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
        inBattle: false,
      };
      
      const newStudentRef = doc(db, 'teachers', teacher.uid, 'students', uid);
      
      const batch = writeBatch(db);
      batch.set(newStudentRef, newStudent);
      batch.delete(pendingStudentRef);
      
      await batch.commit();
      
      await updateDoc(doc(db, 'students', uid), { approved: true });

      // Real-time listeners will handle UI updates.
      
      await logGameEvent(teacher.uid, 'ACCOUNT', `${newStudent.studentName} (${newStudent.characterName}) was approved and joined the guild.`);
      toast({ title: "Hero Approved!", description: `${newStudent.characterName} has joined your guild.` });
    } else {
      // If rejected, just delete the pending doc. Admin must manually delete from Auth.
      await deleteDoc(pendingStudentRef);
      // Also delete the global student doc
      await deleteDoc(doc(db, 'students', uid));

      await logGameEvent(teacher.uid, 'ACCOUNT', `The application for ${pendingStudent.studentName} (${pendingStudent.characterName}) was rejected.`);
      toast({ title: "Request Rejected", description: `The request for ${pendingStudent.characterName} has been deleted. You may need to delete the user from Firebase Authentication manually if they should be prevented from re-registering.` });
    }
  
    // UI will update from the listener
    if (pendingStudents.length === 1) {
      setIsApprovalDialogOpen(false); // Close dialog if it was the last one
    }
  };

  const handleClearAllBattleStatus = async (isAutoCleanup = false) => {
    if (!teacher) return;
    
    if (!isAutoCleanup) {
        setIsAwarding(true); // Reuse the awarding loader state for the spinner
    }

    const batch = writeBatch(db);
    try {
        // 1. Clear student `inBattle` flags
        const studentsInBattleQuery = query(collection(db, 'teachers', teacher.uid, 'students'), where('inBattle', '==', true));
        const studentsInBattleSnapshot = await getDocs(studentsInBattleQuery);
        let studentCount = 0;
        if (!studentsInBattleSnapshot.empty) {
            studentsInBattleSnapshot.forEach(doc => {
                batch.update(doc.ref, { inBattle: false });
                studentCount++;
            });
        }

        // 2. Delete the `active-battle` document and its subcollections
        const liveBattleRef = doc(db, 'teachers', teacher.uid, 'liveBattles', 'active-battle');
        const subcollectionsToDelete = ['responses', 'powerActivations', 'battleLog', 'messages'];
        
        for (const subcollection of subcollectionsToDelete) {
            const subcollectionRef = collection(liveBattleRef, subcollection);
            const snapshot = await getDocs(subcollectionRef);
            if (!snapshot.empty) {
                snapshot.forEach(doc => batch.delete(doc.ref));
            }
        }
        batch.delete(liveBattleRef);

        // 3. Clear the cleanup flag from the teacher doc
        const teacherRef = doc(db, 'teachers', teacher.uid);
        batch.update(teacherRef, { pendingCleanupBattleId: null });

        await batch.commit();

        if (!isAutoCleanup) {
            toast({ title: 'Battle Status Reset!', description: `Cleared active battle and reset ${studentCount} student(s).` });
        }

    } catch (error) {
        console.error("Error during nuclear battle reset:", error);
        if (!isAutoCleanup) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not perform the battle reset.' });
        }
    } finally {
        if (!isAutoCleanup) {
            setIsAwarding(false);
        }
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
            {selectedStudents.length === students.filter(s => !s.isArchived).length ? 'Deselect All' : 'Select All'}
            </Button>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-black border-black">
                        <Gamepad2 className="mr-2 h-4 w-4" />
                        Game Management
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                     <DropdownMenuItem onClick={() => router.push('/teacher/quests')}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>The Quest Archives</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/boons')}>
                        <Star className="mr-2 h-4 w-4" />
                        <span>Guild Rewards</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => router.push('/teacher/battles')}>
                        <Swords className="mr-2 h-4 w-4" />
                        <span>The Field of Battle</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/battles/summary')}>
                        <BookHeart className="mr-2 h-4 w-4" />
                        <span>Battle Archives</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => router.push('/teacher/tools')}>
                        <Wrench className="mr-2 h-4 w-4" />
                        <span>The Guild Leader's Toolkit</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-black border-black">
                        <School className="mr-2 h-4 w-4" />
                        Classroom
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => router.push('/teacher/rewards')}>
                        <Gift className="mr-2 h-4 w-4" />
                        <span>Manage Rewards</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => router.push('/teacher/companies')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Manage Companies</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/quests/completion')}>
                        <Check className="mr-2 h-4 w-4" />
                        <span>Manage Quest Completion</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/gamelog')}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>The Chronicler's Scroll</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => router.push('/teacher/tools/data-migration')}>
                        <DatabaseZap className="mr-2 h-4 w-4" />
                        <span>Data Migration Tool</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => router.push('/teacher/tools/archived-heroes')}>
                        <Archive className="mr-2 h-4 w-4" />
                        <span>Archived Heroes</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleClearAllBattleStatus(false)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        <span>Clear All Battle Statuses</span>
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
                            <DropdownMenuRadioItem value="company">Company</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
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

             <AlertDialog open={isArchiveConfirmOpen} onOpenChange={setIsArchiveConfirmOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={selectedStudents.length === 0}>
                        <Archive className="mr-2 h-4 w-4" /> Archive Selected
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive Selected Students?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will hide {selectedStudents.length} student(s) from the main dashboard. They will not be deleted and can be restored later from the "Archived Heroes" page. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchiveStudents} disabled={isArchiving} className="bg-destructive hover:bg-destructive/90">
                             {isArchiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Yes, Archive
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <TeacherMessageCenter teacher={teacher} students={students} selectedStudentUids={selectedStudents} />
            <div className="flex items-center space-x-2">
                <Switch id="show-hidden" checked={showHidden} onCheckedChange={setShowHidden} />
                <Label htmlFor="show-hidden" className="flex items-center gap-1 cursor-pointer font-semibold text-black text-lg">
                    {showHidden ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                    {showHidden ? 'Showing Hidden Heroes' : 'Show Hidden Heroes'}
                </Label>
            </div>
        </div>
        {sortOrder === 'company' && sortedStudents.type === 'grouped' ? (
             <div className="space-y-6">
                {sortedStudents.companyOrder.map(companyId => {
                    const company = companies.find(c => c.id === companyId);
                    const members = sortedStudents.data[companyId] || [];
                    return (
                        <div key={companyId}>
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                <Briefcase /> {company?.name}
                            </h2>
                            <StudentList
                                students={members}
                                selectedStudents={selectedStudents}
                                onSelectStudent={handleToggleStudentSelection}
                                setStudents={setStudents}
                                teacherUid={teacher.uid}
                                onSendMessage={() => {}}
                            />
                        </div>
                    )
                })}
                {sortedStudents.freelancers.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Freelancers</h2>
                        <StudentList
                            students={sortedStudents.freelancers}
                            selectedStudents={selectedStudents}
                            onSelectStudent={handleToggleStudentSelection}
                            setStudents={setStudents}
                            teacherUid={teacher.uid}
                            onSendMessage={() => {}}
                        />
                    </div>
                )}
            </div>
        ) : sortedStudents.type === 'flat' ? (
            <StudentList 
                students={sortedStudents.data} 
                selectedStudents={selectedStudents}
                onSelectStudent={handleToggleStudentSelection}
                setStudents={setStudents}
                teacherUid={teacher.uid}
                onSendMessage={() => {}}
            />
        ) : null}
      </main>
    </div>
  );
}