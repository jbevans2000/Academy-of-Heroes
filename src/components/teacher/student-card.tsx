
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
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { calculateLevel, calculateHpGain, calculateMpGain } from '@/lib/game-mechanics';


interface StudentCardProps {
  student: Student;
  isSelected: boolean;
  onSelect: () => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

export function StudentCard({ student, isSelected, onSelect, setStudents }: StudentCardProps) {
  const [xpValue, setXpValue] = useState<number | string>('');
  const [goldValue, setGoldValue] = useState<number | string>('');
  const [hpValue, setHpValue] = useState<number | string>('');
  const [mpValue, setMpValue] = useState<number | string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatUpdate = async (
    stat: 'xp' | 'gold' | 'hp' | 'mp',
    operation: 'add' | 'set',
    value: number | string
  ) => {
    const amount = Number(value);
    if (value === '' || isNaN(amount)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: `Please enter a valid number for ${stat.toUpperCase()}.`,
      });
      return;
    }
    // Allow setting to 0, but not adding 0
    if (amount === 0 && operation === 'add') {
         toast({
            variant: 'destructive',
            title: 'Invalid Input',
            description: 'Cannot add zero.',
        });
        return;
    }

    setIsUpdating(true);
    const studentRef = doc(db, 'students', student.uid);

    try {
      const studentDoc = await getDoc(studentRef);
      if (!studentDoc.exists()) throw new Error("Student not found");

      const studentData = studentDoc.data() as Student;
      let updates: Partial<Student> = {};

      // Calculate new values
      if (stat === 'xp') {
        const currentXp = studentData.xp || 0;
        const newXp = operation === 'add' ? currentXp + amount : amount;
        updates.xp = Math.max(0, newXp);

        const currentLevel = studentData.level || 1;
        const newLevel = calculateLevel(updates.xp);

        if (newLevel > currentLevel) {
          updates.level = newLevel;
          const levelsGained = newLevel - currentLevel;
          updates.hp = studentData.hp + calculateHpGain(studentData.class, levelsGained);
          updates.mp = studentData.mp + calculateMpGain(studentData.class, levelsGained);
        }
      } else if (stat === 'gold') {
        const currentGold = studentData.gold || 0;
        const newGold = operation === 'add' ? currentGold + amount : amount;
        updates.gold = Math.max(0, newGold);
      } else if (stat === 'hp') {
        const currentHp = studentData.hp || 0;
        const newHp = operation === 'add' ? currentHp + amount : amount;
        updates.hp = Math.max(0, newHp);
      } else if (stat === 'mp') {
        const currentMp = studentData.mp || 0;
        const newMp = operation === 'add' ? currentMp + amount : amount;
        updates.mp = Math.max(0, newMp);
      }

      await updateDoc(studentRef, updates);

      const updatedStudent = { ...studentData, ...updates };
      setStudents(prevStudents =>
        prevStudents.map(s => s.uid === student.uid ? updatedStudent : s)
      );

      toast({
        title: `${stat.toUpperCase()} Updated!`,
        description: `${student.characterName}'s ${stat} has been updated.`,
      });

      // Clear input fields
      setXpValue('');
      setGoldValue('');
      setHpValue('');
      setMpValue('');

    } catch (error) {
      console.error(`Error updating ${stat}: `, error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: `Could not update student ${stat}. Please try again.`,
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
                    <p className="font-semibold">{student.level ?? 1}</p>
                    <p className="text-xs text-muted-foreground">Level</p>
                  </div>
              </div>
               <div className="flex items-center space-x-1">
                  <Heart className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-semibold">{student.hp ?? 0}</p>
                    <p className="text-xs text-muted-foreground">HP</p>
                  </div>
              </div>
               <div className="flex items-center space-x-1">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-semibold">{student.mp ?? 0}</p>
                    <p className="text-xs text-muted-foreground">MP</p>
                  </div>
              </div>
              <div className="flex items-center space-x-1">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-semibold">{student.gold.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Gold</p>
                  </div>
              </div>
          </div>
           <div className="space-y-2 pt-2">
                <label htmlFor={`xp-${student.uid}`} className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Star className="w-4 h-4 text-yellow-400" /> Experience ({student.xp.toLocaleString()})</label>
                <div className="flex items-center gap-1">
                    <Input 
                        id={`xp-${student.uid}`}
                        type="number"
                        value={xpValue}
                        onChange={(e) => setXpValue(e.target.value)}
                        className="h-8"
                        disabled={isUpdating}
                        placeholder="Value"
                    />
                    <Button size="sm" className="h-8 px-2" onClick={() => handleStatUpdate('xp', 'add', xpValue)} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                     <Button size="sm" className="h-8 px-2" onClick={() => handleStatUpdate('xp', 'set', xpValue)} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set'}
                    </Button>
                </div>
            </div>
             <div className="space-y-2 pt-2">
                <label htmlFor={`gold-${student.uid}`} className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Coins className="w-4 h-4 text-amber-500" /> Gold ({student.gold.toLocaleString()})</label>
                <div className="flex items-center gap-1">
                    <Input 
                        id={`gold-${student.uid}`}
                        type="number"
                        value={goldValue}
                        onChange={(e) => setGoldValue(e.target.value)}
                        className="h-8"
                        disabled={isUpdating}
                        placeholder="Value"
                    />
                    <Button size="sm" className="h-8 px-2" onClick={() => handleStatUpdate('gold', 'add', goldValue)} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                    <Button size="sm" className="h-8 px-2" onClick={() => handleStatUpdate('gold', 'set', goldValue)} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set'}
                    </Button>
                </div>
            </div>
            <div className="space-y-2 pt-2">
                <label htmlFor={`hp-${student.uid}`} className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Heart className="w-4 h-4 text-red-500" /> Health Points</label>
                 <div className="flex items-center gap-1">
                    <Input 
                        id={`hp-${student.uid}`}
                        type="number"
                        value={hpValue}
                        onChange={(e) => setHpValue(e.target.value)}
                        className="h-8"
                        disabled={isUpdating}
                        placeholder={`Current: ${student.hp}`}
                    />
                     <Button size="sm" className="h-8 px-2" onClick={() => handleStatUpdate('hp', 'add', hpValue)} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                    <Button size="sm" className="h-8 px-2" onClick={() => handleStatUpdate('hp', 'set', hpValue)} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set'}
                    </Button>
                </div>
            </div>
             <div className="space-y-2 pt-2">
                <label htmlFor={`mp-${student.uid}`} className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Zap className="w-4 h-4 text-blue-500" /> Magic Points</label>
                 <div className="flex items-center gap-1">
                    <Input 
                        id={`mp-${student.uid}`}
                        type="number"
                        value={mpValue}
                        onChange={(e) => setMpValue(e.target.value)}
                        className="h-8"
                        disabled={isUpdating}
                        placeholder={`Current: ${student.mp}`}
                    />
                    <Button size="sm" className="h-8 px-2" onClick={() => handleStatUpdate('mp', 'add', mpValue)} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                    <Button size="sm" className="h-8 px-2" onClick={() => handleStatUpdate('mp', 'set', mpValue)} disabled={isUpdating}>
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
