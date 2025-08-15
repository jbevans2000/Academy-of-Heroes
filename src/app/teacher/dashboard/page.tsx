
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
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
import { Loader2, Star } from 'lucide-react';

export default function TeacherDashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [xpAmount, setXpAmount] = useState<number | string>('');
  const [isAwarding, setIsAwarding] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
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

    fetchStudents();
  }, [toast]);
  
  const handleToggleStudentSelection = (uid: string) => {
    setSelectedStudents(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
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
      const batch = writeBatch(db);

      try {
          const studentPromises = selectedStudents.map(async (uid) => {
              const studentRef = doc(db, 'students', uid);
              const studentDoc = await getDoc(studentRef);
              if (studentDoc.exists()) {
                  const currentXp = studentDoc.data().xp || 0;
                  const newXp = currentXp + amount;
                  batch.update(studentRef, { xp: newXp });
              }
          });

          await Promise.all(studentPromises);
          await batch.commit();

          // Update local state to reflect changes
          setStudents(prevStudents =>
              prevStudents.map(s =>
                  selectedStudents.includes(s.uid)
                      ? { ...s, xp: (s.xp || 0) + amount }
                      : s
              )
          );

          toast({
              title: 'XP Awarded!',
              description: `${amount} XP has been awarded to ${selectedStudents.length} student(s).`,
          });
          setSelectedStudents([]);
          setXpAmount('');
          setIsDialogOpen(false);
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
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
