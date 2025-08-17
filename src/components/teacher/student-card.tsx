
'use client';

import { useState, useRef, useEffect } from 'react';
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
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { calculateLevel, calculateHpGain, calculateMpGain } from '@/lib/game-mechanics';
import { Label } from '../ui/label';

interface EditableStatProps {
    student: Student;
    stat: 'xp' | 'gold';
    icon: React.ReactNode;
    label: string;
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    teacherUid: string;
}

interface EditablePairedStatProps {
    student: Student;
    stat: 'hp' | 'mp';
    maxStat: 'maxHp' | 'maxMp';
    icon: React.ReactNode;
    label: string;
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    teacherUid: string;
}


function EditableStat({ student, stat, icon, label, setStudents, teacherUid }: EditableStatProps) {
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
        setValue(student[stat]);
    }, [student, stat]);

    const handleSave = async () => {
        setIsLoading(true);
        const amount = Number(value);
        if (isNaN(amount) || amount < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a non-negative number.' });
            setValue(student[stat]);
            setIsEditing(false);
            setIsLoading(false);
            return;
        }

        const studentRef = doc(db, 'teachers', teacherUid, 'students', student.uid);
        try {
            const studentDoc = await getDoc(studentRef);
            if (!studentDoc.exists()) throw new Error("Student not found");

            const studentData = studentDoc.data() as Student;
            const updates: Partial<Student> = {};
            
            if (stat === 'xp') {
                updates.xp = amount;
                const currentLevel = studentData.level || 1;
                const newLevel = calculateLevel(updates.xp);

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
            } else {
                updates[stat] = amount;
            }

            await updateDoc(studentRef, updates);
            setStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, ...updates } : s));
            toast({ title: 'Stat Updated!', description: `${student.characterName}'s ${label} has been set to ${amount}.` });

        } catch (error) {
            console.error(`Error updating ${stat}:`, error);
            toast({ variant: 'destructive', title: 'Update Failed', description: `Could not update ${label}.` });
            setValue(student[stat]);
        } finally {
            setIsEditing(false);
            setIsLoading(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        else if (e.key === 'Escape') {
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

function EditablePairedStat({ student, stat, maxStat, icon, label, setStudents, teacherUid }: EditablePairedStatProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(student[stat] ?? 0);
    const [maxValue, setMaxValue] = useState(student[maxStat] ?? 0);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

     useEffect(() => {
        setCurrentValue(student[stat] ?? 0);
        setMaxValue(student[maxStat] ?? 0);
    }, [student, stat, maxStat]);

    const handleSave = async () => {
        setIsLoading(true);
        const currentAmount = Number(currentValue);
        const maxAmount = Number(maxValue);

        if (isNaN(currentAmount) || isNaN(maxAmount) || currentAmount < 0 || maxAmount < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter non-negative numbers.' });
            setIsLoading(false);
            return;
        }

        const studentRef = doc(db, 'teachers', teacherUid, 'students', student.uid);
        try {
            const updates: Partial<Student> = {
                [stat]: currentAmount,
                [maxStat]: maxAmount,
            };

            await updateDoc(studentRef, updates);
            setStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, ...updates } : s));
            toast({ title: 'Stat Updated!', description: `${student.characterName}'s ${label} has been updated.` });

        } catch (error) {
            console.error(`Error updating ${label}:`, error);
            toast({ variant: 'destructive', title: 'Update Failed', description: `Could not update ${label}.` });
        } finally {
            setIsEditing(false);
            setIsLoading(false);
        }
    };

    if (isEditing) {
        return (
            <div className="col-span-2 space-y-2 p-2 border rounded-md">
                <div className="flex items-center gap-2">
                    <Label htmlFor={`${stat}-current`}>Current {label}:</Label>
                    <Input id={`${stat}-current`} type="number" value={currentValue} onChange={(e) => setCurrentValue(Number(e.target.value))} className="h-8" />
                </div>
                 <div className="flex items-center gap-2">
                    <Label htmlFor={`${stat}-max`}>Max {label}:</Label>
                    <Input id={`${stat}-max`} type="number" value={maxValue} onChange={(e) => setMaxValue(Number(e.target.value))} className="h-8" />
                </div>
                <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={isLoading}>
                         {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                     <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
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
                <p className="font-semibold">{currentValue} / {maxValue}</p>
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
  teacherUid: string;
}

export function StudentCard({ student, isSelected, onSelect, setStudents, teacherUid }: StudentCardProps) {
  const avatarUrl = student.avatarUrl || 'https://placehold.co/100x100.png';

  return (
    <Dialog>
      <Card className={cn("shadow-lg rounded-xl flex flex-col overflow-hidden transition-all duration-300", isSelected ? "ring-2 ring-primary scale-105" : "hover:scale-105")}>
        <CardHeader className="p-4 relative h-40 bg-secondary/30 flex items-center justify-center">
            <div className="absolute top-2 right-2 z-10 bg-background/50 rounded-full p-1">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onSelect}
                    aria-label={`Select ${student.characterName}`}
                    className="h-6 w-6"
                />
            </div>
            <div className="relative w-24 h-24">
                <Image
                    src={avatarUrl}
                    alt={`${student.characterName}'s avatar`}
                    fill
                    sizes="100px"
                    className="object-contain drop-shadow-lg"
                    data-ai-hint="character"
                    onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100.png')}
                />
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
                teacherUid={teacherUid}
            />
            <EditablePairedStat
                student={student}
                stat="hp"
                maxStat="maxHp"
                label="HP"
                icon={<Heart className="h-5 w-5 text-red-500" />}
                setStudents={setStudents}
                teacherUid={teacherUid}
            />
             <EditablePairedStat
                student={student}
                stat="mp"
                maxStat="maxMp"
                label="MP"
                icon={<Zap className="h-5 w-5 text-blue-500" />}
                setStudents={setStudents}
                teacherUid={teacherUid}
            />
             <EditableStat 
                student={student}
                stat="gold"
                label="Gold"
                icon={<Coins className="h-5 w-5 text-amber-500" />}
                setStudents={setStudents}
                teacherUid={teacherUid}
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
