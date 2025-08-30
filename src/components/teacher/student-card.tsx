
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Student, Company, QuestHub, Chapter } from '@/lib/data';
import { Star, Coins, User, Sword, Trophy, Heart, Zap, Loader2, Edit, Settings, Briefcase, FileText, Eye, EyeOff, MessageSquare, BookOpen } from 'lucide-react';
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
import { doc, getDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { calculateLevel, calculateHpGain, calculateMpGain, calculateBaseMaxHp, MAX_LEVEL, XP_FOR_MAX_LEVEL } from '@/lib/game-mechanics';
import { Label } from '../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { TeacherNotesDialog } from './teacher-notes-dialog';
import { toggleStudentVisibility, updateStudentDetails } from '@/ai/flows/manage-student';
import { SetQuestProgressDialog } from './set-quest-progress-dialog';

interface EditableStatProps {
    student: Student;
    stat: 'xp' | 'gold';
    icon: React.ReactNode;
    label: string;
    teacherUid: string;
}

interface EditablePairedStatProps {
    student: Student;
    stat: 'hp' | 'mp';
    maxStat: 'maxHp' | 'maxMp';
    icon: React.ReactNode;
    label: string;
    teacherUid: string;
}

interface EditableTextProps {
    student: Student;
    field: 'studentName' | 'characterName';
    icon: React.ReactNode;
    label: string;
    teacherUid: string;
}

function EditableText({ student, field, icon, label, teacherUid }: EditableTextProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(student[field]);
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
        setValue(student[field]);
    }, [student, field]);

    const handleSave = async () => {
        if (!value.trim()) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Name cannot be empty.' });
            setValue(student[field]); // Revert to original
            setIsEditing(false);
            return;
        }
        setIsLoading(true);

        const updates = {
            studentName: field === 'studentName' ? value : student.studentName,
            characterName: field === 'characterName' ? value : student.characterName,
        };

        try {
            const result = await updateStudentDetails({
                teacherUid,
                studentUid: student.uid,
                ...updates
            });
            if (!result.success) {
                 throw new Error(result.error || `Could not update ${label}`);
            }
             toast({ title: 'Stat Updated!', description: `${student.characterName}'s ${label} has been updated.` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
             setValue(student[field]);
        } finally {
            setIsEditing(false);
            setIsLoading(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        else if (e.key === 'Escape') {
            setValue(student[field]);
            setIsEditing(false);
        }
    }

    if (isEditing) {
        return (
            <div className="col-span-2 space-y-1">
                <Label htmlFor={`edit-${field}`}>{label}</Label>
                <Input
                    ref={inputRef}
                    id={`edit-${field}`}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
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
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setIsEditing(true)}
        >
            {icon}
            <span className="font-bold truncate" title={value}>{value}</span>
            <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}


function EditableStat({ student, stat, icon, label, teacherUid }: EditableStatProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(student[stat] ?? 0);
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
        setValue(student[stat] ?? 0);
    }, [student, stat]);

    const handleSave = async () => {
        setIsLoading(true);
        let amount = Number(value);
        if (isNaN(amount) || amount < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a non-negative number.' });
            setValue(student[stat] ?? 0);
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
                const currentLevel = studentData.level || 1;
                
                if (currentLevel >= MAX_LEVEL && amount > studentData.xp) {
                    toast({ title: 'Max Level Reached', description: `${student.characterName} is at the maximum level. XP cannot be increased.`});
                    amount = studentData.xp; // Revert to old value
                }
                
                // Cap the XP at the max level threshold
                if (amount > XP_FOR_MAX_LEVEL) {
                    amount = XP_FOR_MAX_LEVEL;
                    toast({ title: 'XP Capped', description: `XP has been capped at the amount for Level ${MAX_LEVEL}.` });
                }

                updates.xp = amount;
                const newLevel = calculateLevel(updates.xp);

                if (newLevel !== currentLevel) {
                    const levelChange = newLevel - currentLevel;
                    updates.level = newLevel;
                    
                    const newMaxHp = calculateBaseMaxHp(studentData.class, newLevel, 'hp');
                    const newMaxMp = calculateBaseMaxHp(studentData.class, newLevel, 'mp');

                    updates.maxHp = newMaxHp;
                    // On level down, clamp HP to new max. On level up, add gain.
                    updates.hp = levelChange > 0 
                        ? (studentData.hp || 0) + calculateHpGain(studentData.class, levelChange)
                        : Math.min(studentData.hp, newMaxHp);

                    updates.maxMp = newMaxMp;
                    // On level down, clamp MP to new max. On level up, add gain.
                    updates.mp = levelChange > 0
                        ? (studentData.mp || 0) + calculateMpGain(studentData.class, levelChange)
                        : Math.min(studentData.mp, newMaxMp);
                }
            } else {
                updates[stat] = amount;
            }

            await updateDoc(studentRef, updates);
            // Real-time listener will update the state, no need for setStudents
            toast({ title: 'Stat Updated!', description: `${student.characterName}'s ${label} has been set to ${amount}.` });

        } catch (error) {
            console.error(`Error updating ${stat}:`, error);
            toast({ variant: 'destructive', title: 'Update Failed', description: `Could not update ${label}.` });
            setValue(student[stat] ?? 0);
        } finally {
            setIsEditing(false);
            setIsLoading(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        else if (e.key === 'Escape') {
            setValue(student[stat] ?? 0);
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

function EditablePairedStat({ student, stat, maxStat, icon, label, teacherUid }: EditablePairedStatProps) {
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
        let wasAdjusted = false;
        let currentAmount = Number(currentValue);
        const maxAmount = Number(maxValue);

        if (isNaN(currentAmount) || isNaN(maxAmount) || currentAmount < 0 || maxAmount < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter non-negative numbers.' });
            setIsLoading(false);
            return;
        }

        if (currentAmount > maxAmount) {
            toast({
                title: 'Value Adjusted',
                description: `Current ${label} cannot exceed the maximum. It has been set to ${maxAmount}.`,
            });
            currentAmount = maxAmount;
            setCurrentValue(maxAmount);
            wasAdjusted = true;
        }

        const studentRef = doc(db, 'teachers', teacherUid, 'students', student.uid);
        try {
            const updates: Partial<Student> = {
                [stat]: currentAmount,
                [maxStat]: maxAmount,
            };

            await updateDoc(studentRef, updates);
            
            // Only show the "Updated" toast if the value wasn't auto-adjusted.
            if (!wasAdjusted) {
                toast({ title: 'Stat Updated!', description: `${student.characterName}'s ${label} has been updated.` });
            }

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
  teacherUid: string;
  onSendMessage: (student: Student) => void;
  hubs: QuestHub[];
  chapters: Chapter[];
  isOnline: boolean;
}

export function StudentCard({ student, isSelected, onSelect, teacherUid, onSendMessage, hubs, chapters, isOnline }: StudentCardProps) {
  const avatarUrl = student.avatarUrl || 'https://placehold.co/100x100.png';
  const [company, setCompany] = useState<Company | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isQuestProgressOpen, setIsQuestProgressOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribe: () => void;
    if (student.companyId) {
        const companyRef = doc(db, 'teachers', teacherUid, 'companies', student.companyId);
        unsubscribe = onSnapshot(companyRef, (docSnap) => {
            if (docSnap.exists()) {
                setCompany({ id: docSnap.id, ...docSnap.data()} as Company);
            } else {
                setCompany(null);
            }
        });
    } else {
        setCompany(null);
    }
    return () => {
        if(unsubscribe) unsubscribe();
    };
  }, [student.companyId, teacherUid]);
  
  const handleToggleVisibility = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card from being selected
    try {
      const result = await toggleStudentVisibility({
        teacherUid,
        studentUid: student.uid,
        isHidden: !student.isHidden,
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to update visibility');
      }
      toast({
        title: `Hero ${student.isHidden ? 'Revealed' : 'Hidden'}`,
        description: `${student.characterName} is now ${student.isHidden ? 'visible' : 'hidden'}.`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };


  const avatarBorderColor = {
    Mage: 'border-blue-600',
    Healer: 'border-green-500',
    Guardian: 'border-amber-500',
    '': 'border-transparent',
  }[student.class];

  return (
    <>
      <TeacherNotesDialog
        isOpen={isNotesOpen}
        onOpenChange={setIsNotesOpen}
        student={student}
        teacherUid={teacherUid}
      />
       <SetQuestProgressDialog
        isOpen={isQuestProgressOpen}
        onOpenChange={setIsQuestProgressOpen}
        studentsToUpdate={[student]}
        teacherUid={teacherUid}
        hubs={hubs}
        chapters={chapters}
      />
      <Dialog>
      <TooltipProvider>
        <Card className={cn("shadow-lg rounded-xl flex flex-col overflow-hidden transition-all duration-300 relative", isSelected ? "ring-2 ring-primary scale-105" : "hover:scale-105", student.isHidden && "opacity-60 bg-gray-200")}>
            {company?.logoUrl && (
                <div className="absolute inset-0 z-0">
                    <Image src={company.logoUrl} alt="Company Logo" fill className="object-cover opacity-50" />
                </div>
            )}
           <div className="relative z-10 flex flex-col h-full bg-card/80">
            <CardHeader className="p-4 relative h-40 bg-secondary/30 flex items-center justify-center">
                <div className="absolute top-2 right-2 z-10">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onSelect}
                        aria-label={`Select ${student.characterName}`}
                        className="h-6 w-6 border-2 border-black bg-white"
                    />
                </div>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 left-2 z-10 h-7 w-7"
                            onClick={handleToggleVisibility}
                        >
                            {student.isHidden ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{student.isHidden ? 'Click to Unhide' : 'Click to Hide'}</p>
                    </TooltipContent>
                 </Tooltip>
                 {student.hasUnreadMessages && (
                    <Tooltip>
                        <TooltipTrigger className="absolute bottom-2 right-2 z-10">
                            <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Unread Message</p>
                        </TooltipContent>
                    </Tooltip>
                 )}
                {isOnline && (
                    <Tooltip>
                        <TooltipTrigger className="absolute top-3 left-10 z-10">
                        <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-white animate-pulse" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Online</p>
                        </TooltipContent>
                    </Tooltip>
                )}
                <div className={cn("relative w-28 h-28 border-4 bg-black/20 p-1 shadow-inner", avatarBorderColor)}>
                    <Image
                        src={avatarUrl}
                        alt={`${student.characterName}'s avatar`}
                        fill
                        sizes="112px"
                        className="object-contain drop-shadow-lg"
                        data-ai-hint="character"
                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100.png')}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow space-y-3">
                <EditableText
                    student={student}
                    field="characterName"
                    label="Character Name"
                    icon={<Sword className="w-4 h-4" />}
                    teacherUid={teacherUid}
                />
                <EditableText
                    student={student}
                    field="studentName"
                    label="Student Name"
                    icon={<User className="w-4 h-4" />}
                    teacherUid={teacherUid}
                />
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sword className="w-4 h-4" />
                    <span>{student.class}</span>
                </div>
                 <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span>{company?.name || 'Freelancer'}</span>
                </div>
                <div className="space-y-3 text-sm pt-2">
                    <div className="flex justify-between items-center gap-2">
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
                            teacherUid={teacherUid}
                        />
                        <EditableStat 
                            student={student}
                            stat="gold"
                            label="Gold"
                            icon={<Coins className="h-5 w-5 text-amber-500" />}
                            teacherUid={teacherUid}
                        />
                    </div>
                     <div className="flex justify-between items-center gap-2">
                        <EditablePairedStat
                            student={student}
                            stat="hp"
                            maxStat="maxHp"
                            label="HP"
                            icon={<Heart className="h-5 w-5 text-red-500" />}
                            teacherUid={teacherUid}
                        />
                        <EditablePairedStat
                            student={student}
                            stat="mp"
                            maxStat="maxMp"
                            label="MP"
                            icon={<Zap className="h-5 w-5 text-blue-500" />}
                            teacherUid={teacherUid}
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-2 bg-secondary/30 mt-auto grid grid-cols-3 gap-2">
                 <Button className="w-full" variant="outline" onClick={() => onSendMessage(student)}>
                    <MessageSquare className="h-4 w-4" />
                </Button>
                <DialogTrigger asChild>
                <Button className="w-full" variant="secondary">
                    View Details
                </Button>
                </DialogTrigger>
                <div className="flex gap-1">
                   <Button className="flex-1" variant="outline" onClick={() => setIsNotesOpen(true)}>
                        <FileText className="h-4 w-4" />
                    </Button>
                    <Button className="flex-1" variant="outline" onClick={() => setIsQuestProgressOpen(true)}>
                        <BookOpen className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
           </div>
        </Card>
      </TooltipProvider>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{student.characterName}'s Dashboard</DialogTitle>
            <DialogDescription>
              This is a live view of {student.studentName}'s character sheet.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
              <DashboardClient student={student} isTeacherPreview={true} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
