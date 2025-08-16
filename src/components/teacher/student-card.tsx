
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Student } from '@/lib/data';
import { Star, Coins, User, Sword, Trophy, Heart, Zap, Loader2, Edit } from 'lucide-react';
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
import { classData } from '@/lib/data';

// HARDCODED TEACHER UID
const TEACHER_UID = 'ICKWJ5MQl0SHFzzaSXqPuGS3NHr2';

interface EditableStatProps {
    student: Student;
    stat: 'xp' | 'gold' | 'hp' | 'mp';
    icon: React.ReactNode;
    label: string;
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

function EditableStat({ student, stat, icon, label, setStudents }: EditableStatProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(student[stat]);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);
    
     useEffect(() => {
        // Update local value if student prop changes from parent
        setValue(student[stat]);
    }, [student, stat]);

    const handleSave = async () => {
        setIsLoading(true);
        const amount = Number(value);
        if (isNaN(amount) || amount < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a non-negative number.' });
            setValue(student[stat]); // Reset to original value
            setIsEditing(false);
            setIsLoading(false);
            return;
        }

        const studentRef = doc(db, 'teachers', TEACHER_UID, 'students', student.uid);
        try {
            const studentDoc = await getDoc(studentRef);
            if (!studentDoc.exists()) throw new Error("Student not found");

            const studentData = studentDoc.data() as Student;
            let updates: Partial<Student> = {};
            
            if (stat === 'xp') {
                updates.xp = amount;
                const currentLevel = studentData.level || 1;
                const newLevel = calculateLevel(updates.xp);

                if (newLevel > currentLevel) {
                    updates.level = newLevel;
                    const levelsGained = newLevel - currentLevel;
                    updates.hp = studentData.hp + calculateHpGain(studentData.class, levelsGained);
                    updates.mp = studentData.mp + calculateMpGain(studentData.class, levelsGained);
                }
            } else {
                updates[stat] = amount;
            }

            await updateDoc(studentRef, updates);

            // Update parent state to reflect changes across the app
            setStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, ...updates } : s));

            toast({ title: 'Stat Updated!', description: `${student.characterName}'s ${label} has been set to ${amount}.` });

        } catch (error) {
            console.error(`Error updating ${stat}:`, error);
            toast({ variant: 'destructive', title: 'Update Failed', description: `Could not update ${label}.` });
            setValue(student[stat]); // Revert on failure
        } finally {
            setIsEditing(false);
            setIsLoading(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setValue(student[stat]);
            setIsEditing(false);
        }
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
                <Input
                    ref={inputRef}
                    type="number"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-8"
                    disabled={isLoading}
                />
            </div>
        )
    }

    return (
        <div 
            className="flex items-center space-x-1 cursor-pointer group"
            onClick={() => setIsEditing(true)}
        >
            {icon}
            <div className="flex-grow">
                <p className="font-semibold">{value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}

interface StudentCardProps {
  student: Student;
  isSelected: boolean;
  onSelect: () => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

export function StudentCard({ student, isSelected, onSelect, setStudents }: StudentCardProps) {
  const backgroundUrl = useMemo(() => {
    if (student.backgroundUrl) {
      return student.backgroundUrl;
    }
    const backgrounds = classData[student.class]?.backgrounds;
    if (backgrounds && backgrounds.length > 0) {
      // Use a simple hashing function on the UID to get a consistent index
      const hash = student.uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const index = hash % backgrounds.length;
      return backgrounds[index];
    }
    return 'https://placehold.co/600x400.png';
  }, [student.backgroundUrl, student.class, student.uid]);

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
          <div className="grid grid-cols-2 gap-4 text-sm pt-2">
            <div className="flex items-center space-x-1">
                  <Trophy className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="font-semibold">{student.level ?? 1}</p>
                    <p className="text-xs text-muted-foreground">Level</p>
                  </div>
              </div>
            <EditableStat 
                student={student}
                stat="xp"
                label="Experience"
                icon={<Star className="h-5 w-5 text-yellow-400" />}
                setStudents={setStudents}
            />
            <EditableStat 
                student={student}
                stat="hp"
                label="HP"
                icon={<Heart className="h-5 w-5 text-red-500" />}
                setStudents={setStudents}
            />
            <EditableStat 
                student={student}
                stat="mp"
                label="MP"
                icon={<Zap className="h-5 w-5 text-blue-500" />}
                setStudents={setStudents}
            />
             <EditableStat 
                student={student}
                stat="gold"
                label="Gold"
                icon={<Coins className="h-5 w-5 text-amber-500" />}
                setStudents={setStudents}
            />
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
