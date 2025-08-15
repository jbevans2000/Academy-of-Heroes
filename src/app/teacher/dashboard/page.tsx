
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, writeBatch, doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { TeacherHeader } from "@/components/teacher/teacher-header";
import { StudentList } from "@/components/teacher/student-list";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Coins, Sparkles } from 'lucide-react';
import { calculateLevelUp } from '@/lib/game-mechanics';

export default function TeacherDashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [xpAmount, setXpAmount] = useState<number | string>('');
  const [goldAmount, setGoldAmount] = useState<number | string>('');
  const [isAwarding, setIsAwarding] = useState(false);
  const [isXpDialogOpen, setIsXpDialogOpen] = useState(false);
  const [isGoldDialogOpen, setIsGoldDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "students"));
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

  useEffect(() => {
    fetchStudents();
  }, [toast]);
  
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
      
      const updatedStudents: Student[] = [];

      try {
          const batch = writeBatch(db);

          for (const uid of selectedStudents) {
              const studentRef = doc(db, 'students', uid);
              const studentDoc = await getDoc(studentRef);

              if (studentDoc.exists()) {
                  const studentData = studentDoc.data() as Student;
                  const newXp = (studentData.xp || 0) + amount;
                  const { newLevel, newHp } = calculateLevelUp(studentData, newXp);

                  const updates: Partial<Student> = { xp: newXp, level: newLevel, hp: newHp };
                  
                  if (newLevel > studentData.level) {
                      toast({
                        title: 'Level Up!',
                        description: `${studentData.characterName} is now level ${newLevel}!`,
                      })
                  }
                  batch.update(studentRef, updates);
                  updatedStudents.push({ ...studentData, ...updates });
              }
          }
          
          await batch.commit();

          // Update local state to reflect changes
          setStudents(prevStudents =>
              prevStudents.map(s => {
                const updated = updatedStudents.find(u => u.uid === s.uid);
                return updated || s;
              })
          );

          toast({
              title: 'XP Awarded!',
              description: `${amount} XP has been awarded to ${selectedStudents.length} student(s).`,
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
      const batch = writeBatch(db);

      try {
          const studentPromises = selectedStudents.map(async (uid) => {
              const studentRef = doc(db, 'students', uid);
              const studentDoc = await getDoc(studentRef);
              if (studentDoc.exists()) {
                  const currentGold = studentDoc.data().gold || 0;
                  const newGold = currentGold + amount;
                  batch.update(studentRef, { gold: newGold });
              }
          });

          await Promise.all(studentPromises);
          await batch.commit();

          // Update local state to reflect changes
          setStudents(prevStudents =>
              prevStudents.map(s =>
                  selectedStudents.includes(s.uid)
                      ? { ...s, gold: (s.gold || 0) + amount }
                      : s
              )
          );

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
  
    const handleRecalculateHp = async () => {
        setIsRecalculating(true);
        try {
            await runTransaction(db, async (transaction) => {
              const allStudentsQuery = await getDocs(collection(db, 'students'));
              const updatedStudents: Student[] = [];

              for (const studentDoc of allStudentsQuery.docs) {
                  const studentRef = doc(db, 'students', studentDoc.id);
                  // Get the most up-to-date document within the transaction
                  const freshStudentDoc = await transaction.get(studentRef);
                  if (!freshStudentDoc.exists()) continue;

                  const studentData = freshStudentDoc.data() as Student;
                  const { newLevel, newHp } = calculateLevelUp(studentData, studentData.xp);

                  transaction.update(studentRef, { hp: newHp, level: newLevel });
                  updatedStudents.push({ ...studentData, hp: newHp, level: newLevel });
              }
              // This state update needs to happen AFTER the transaction is successful.
              // We'll update the state outside the transaction callback.
            });
            
            // Re-fetch all students from the database to update the local state correctly
            await fetchStudents();

            toast({
                title: 'HP Recalculated',
                description: `All student HP and Level values have been updated based on their current XP.`,
            });
        } catch (error) {
            console.error('Error recalculating HP:', error);
            toast({
                variant: 'destructive',
                title: 'Recalculation Failed',
                description: 'Could not update student HP values. Please try again.',
            });
        } finally {
            setIsRecalculating(false);
        }
    };


  if (isLoading) {
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
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">All Students</h1>
            <div className="flex items-center gap-2">
               <Button
                  variant="outline"
                  onClick={handleRecalculateHp}
                  disabled={isRecalculating}
                >
                  {isRecalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Recalculate All HP
                </Button>
               <Button 
                onClick={handleSelectAllToggle}
                disabled={students.length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-white"
               >
                {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
               </Button>
               <Dialog open={isXpDialogOpen} onOpenChange={setIsXpDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
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
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
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
            </div>
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

    