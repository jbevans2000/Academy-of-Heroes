
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Student } from '@/lib/data';
import { Star, Coins, User, Sword, Trophy, Heart, Zap, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Input } from '@/components/ui/input';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


interface StudentCardProps {
  student: Student;
  isSelected: boolean;
  onSelect: () => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

export function StudentCard({ student: initialStudent, isSelected, onSelect, setStudents }: StudentCardProps) {
  const [student, setStudent] = useState(initialStudent);
  const [newXp, setNewXp] = useState<number | string>(student.xp);
  const [newGold, setNewGold] = useState<number | string>(student.gold);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleXpUpdate = async () => {
    if (newXp === '' || isNaN(Number(newXp))) {
        toast({
            variant: 'destructive',
            title: 'Invalid Input',
            description: 'Please enter a valid number for XP.',
        });
        return;
    }

    setIsUpdating(true);
    const studentRef = doc(db, 'students', student.uid);
    try {
        const updatedXp = Number(newXp);
        await updateDoc(studentRef, {
            xp: updatedXp
        });
        
        // Update the single student in the parent state
        setStudents(prevStudents => 
            prevStudents.map(s => s.uid === student.uid ? { ...s, xp: updatedXp } : s)
        );
        // Also update local card state
        setStudent(prev => ({...prev, xp: updatedXp}));

        toast({
            title: 'XP Updated!',
            description: `${student.characterName}'s XP has been set to ${newXp}.`,
        });
    } catch (error) {
        console.error("Error updating XP: ", error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not update student XP. Please try again.',
        });
    } finally {
        setIsUpdating(false);
    }
  };

  const handleGoldUpdate = async () => {
    if (newGold === '' || isNaN(Number(newGold))) {
        toast({
            variant: 'destructive',
            title: 'Invalid Input',
            description: 'Please enter a valid number for Gold.',
        });
        return;
    }

    setIsUpdating(true);
    const studentRef = doc(db, 'students', student.uid);
    try {
        const updatedGold = Number(newGold);
        await updateDoc(studentRef, {
            gold: updatedGold
        });
        
        // Update the single student in the parent state
        setStudents(prevStudents => 
            prevStudents.map(s => s.uid === student.uid ? { ...s, gold: updatedGold } : s)
        );
        // Also update local card state
        setStudent(prev => ({...prev, gold: updatedGold}));

        toast({
            title: 'Gold Updated!',
            description: `${student.characterName}'s Gold has been set to ${newGold}.`,
        });
    } catch (error) {
        console.error("Error updating Gold: ", error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not update student Gold. Please try again.',
        });
    } finally {
        setIsUpdating(false);
    }
  };


  const backgroundUrl = student.backgroundUrl || 'https://placehold.co/600x400.png';
  const avatarUrl = student.avatarUrl || 'https://placehold.co/100x100.png';

  return (
    <Dialog>
      <Card className={cn("shadow-lg rounded-xl flex flex-col overflow-hidden transition-all duration-300", isSelected ? "ring-2 ring-primary scale-105" : "hover:scale-105")}>
        <CardHeader className="p-0 relative h-32">
          <div className="absolute top-2 right-2 z-10 bg-background/50 rounded-full p-1">
             <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                aria-label={`Select ${student.characterName}`}
                className="h-6 w-6"
            />
          </div>
          <Image
            src={backgroundUrl}
            alt={`${student.characterName}'s background`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            data-ai-hint="scene"
            onError={(e) => (e.currentTarget.src = 'https://placehold.co/600x400.png')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-4 flex items-end space-x-3">
            <div className="relative w-16 h-16 border-2 border-primary rounded-full overflow-hidden bg-secondary">
              <Image
                src={avatarUrl}
                alt={`${student.characterName}'s avatar`}
                fill
                sizes="(max-width: 768px) 25vw, 10vw"
                className="object-contain"
                data-ai-hint="character"
                onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100.png')}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow space-y-3">
          <CardTitle className="text-xl font-bold truncate">{student.characterName}</CardTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{student.studentName}</span>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Sword className="w-4 h-4" />
              <span>{student.class}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pt-2">
              <div className="flex items-center space-x-1">
                  <Trophy className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="font-semibold">{student.level || 1}</p>
                    <p className="text-xs text-muted-foreground">Level</p>
                  </div>
              </div>
               <div className="flex items-center space-x-1">
                  <Heart className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-semibold">{student.hp || 100}</p>
                    <p className="text-xs text-muted-foreground">HP</p>
                  </div>
              </div>
               <div className="flex items-center space-x-1">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-semibold">{student.mp || 100}</p>
                    <p className="text-xs text-muted-foreground">MP</p>
                  </div>
              </div>
              <div className="flex items-center space-x-1">
                  <p className="font-semibold">{student.gold.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Gold</p>
              </div>
          </div>
           <div className="space-y-2 pt-2">
                <label htmlFor={`xp-${student.uid}`} className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Star className="w-4 h-4 text-yellow-400" /> Experience</label>
                <div className="flex items-center gap-2">
                    <Input 
                        id={`xp-${student.uid}`}
                        type="number"
                        value={newXp}
                        onChange={(e) => setNewXp(e.target.value)}
                        className="h-8"
                        disabled={isUpdating}
                    />
                    <Button
                        size="sm"
                        className="h-8"
                        onClick={handleXpUpdate}
                        disabled={isUpdating}
                    >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set'}
                    </Button>
                </div>
            </div>
             <div className="space-y-2 pt-2">
                <label htmlFor={`gold-${student.uid}`} className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Coins className="w-4 h-4 text-amber-500" /> Gold</label>
                <div className="flex items-center gap-2">
                    <Input 
                        id={`gold-${student.uid}`}
                        type="number"
                        value={newGold}
                        onChange={(e) => setNewGold(e.target.value)}
                        className="h-8"
                        disabled={isUpdating}
                    />
                    <Button
                        size="sm"
                        className="h-8"
                        onClick={handleGoldUpdate}
                        disabled={isUpdating}
                    >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set'}
                    </Button>
                </div>
            </div>
        </CardContent>
        <CardFooter className="p-2 bg-secondary/30 mt-auto">
          <DialogTrigger asChild>
            <Button className="w-full" variant="secondary">
                View Details
            </Button>
          </DialogTrigger>
        </CardFooter>
      </Card>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{student.characterName}'s Dashboard</DialogTitle>
          <DialogDescription>
            This is a live view of {student.studentName}'s character sheet.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
            <DashboardClient student={student} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
