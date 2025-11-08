
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Student, Company, QuestHub, Chapter } from '@/lib/data';
import { Star, Coins, User, Sword, Trophy, Heart, Zap, Loader2, Edit, Settings, Briefcase, FileText, Eye, EyeOff, MessageSquare, BookOpen, ShieldCheck, Moon, UserCheck, LogOut, AlertCircle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Input } from '@/components/ui/input';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { TeacherNotesDialog } from './teacher-notes-dialog';
import { toggleStudentVisibility, updateStudentDetails, setMeditationStatus, forceStudentLogout, addShadowMark, removeShadowMark } from '@/ai/flows/manage-student';
import { SetQuestProgressDialog } from './set-quest-progress-dialog';
import { setStudentStat } from '@/ai/flows/manage-student-stats';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
            <div className="space-y-1">
                <Label htmlFor={`edit-${field}`} className="text-xs">{label}</Label>
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
            className="flex items-center gap-2 cursor-pointer group w-full"
            onClick={() => setIsEditing(true)}
        >
            {icon}
            <span className="font-bold text-lg truncate" title={value}>{value}</span>
            <Edit className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
        const amount = Number(value);
        if (isNaN(amount) || amount < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a non-negative number.' });
            setValue(student[stat] ?? 0);
            setIsEditing(false);
            setIsLoading(false);
            return;
        }

        try {
            const result = await setStudentStat({ teacherUid, studentUid: student.uid, stat, value: amount });
            if (result.success) {
                toast({ title: 'Stat Updated!', description: `${student.characterName}'s ${label} has been set to ${amount}.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error(`Error updating ${stat}:`, error);
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message || `Could not update ${label}.` });
            setValue(student[stat] ?? 0); // Revert on failure
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
                    className="h-8 w-24"
                    disabled={isLoading}
                />
            </div>
        )
    }

    return (
        <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => setIsEditing(true)}
        >
            {icon}
            <p className="font-semibold text-lg">{value.toLocaleString()}</p>
            {stat === 'xp' && <span className="font-semibold text-lg">Experience Points</span>}
            <Edit className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
        const currentAmount = Number(currentValue);
        const maxAmount = Number(maxValue);

        if (isNaN(currentAmount) || isNaN(maxAmount) || currentAmount < 0 || maxAmount < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter non-negative numbers.' });
            setIsLoading(false);
            return;
        }

        const cappedCurrentAmount = Math.min(currentAmount, maxAmount);
        
        try {
            const currentResult = await setStudentStat({ teacherUid, studentUid: student.uid, stat, value: cappedCurrentAmount });
            const maxResult = await setStudentStat({ teacherUid, studentUid: student.uid, stat: maxStat, value: maxAmount });

            if (currentResult.success && maxResult.success) {
                 toast({ title: 'Stat Updated!', description: `${student.characterName}'s ${label} has been updated.` });
            } else {
                throw new Error(currentResult.error || maxResult.error || "An unknown error occurred.");
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsEditing(false);
            setIsLoading(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        else if (e.key === 'Escape') {
            setCurrentValue(student[stat] ?? 0);
            setMaxValue(student[maxStat] ?? 0);
            setIsEditing(false);
        }
    };


    if (isEditing) {
        return (
            <div className="space-y-2 cursor-default" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                    <Input id={`${stat}-current`} type="number" value={currentValue} onChange={(e) => setCurrentValue(Number(e.target.value))} onKeyDown={handleKeyDown} className="h-8" />
                    <span>/</span>
                    <Input id={`${stat}-max`} type="number" value={maxValue} onChange={(e) => setMaxValue(Number(e.target.value))} onKeyDown={handleKeyDown} className="h-8" />
                </div>
                 <Button size="sm" onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
            </div>
        )
    }

    return (
        <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={(e) => { e.stopPropagation(); setIsEditing(true);}}
        >
            {icon}
            <p className="font-semibold text-lg">{currentValue} / {maxValue}</p>
            <Edit className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}

function MeditationDialog({ student, teacherUid, onOpenChange }: { student: Student; teacherUid: string; onOpenChange: (open: boolean) => void }) {
    const [message, setMessage] = useState('');
    const [duration, setDuration] = useState<number | string>('');
    const [showTimer, setShowTimer] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleConfirm = async () => {
        if (!message.trim()) {
            toast({ variant: 'destructive', title: 'Message Required', description: 'Please provide a reason for meditation.' });
            return;
        }
        setIsSaving(true);
        try {
            const result = await setMeditationStatus({
                teacherUid,
                studentUid: student.uid,
                isInMeditation: true,
                message,
                durationInMinutes: Number(duration) || undefined,
                showTimer,
            });
            if (result.success) {
                toast({ title: 'Student Sent to Meditate', description: `${student.characterName} is now in the Meditation Chamber.` });
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Send {student.characterName} to the Meditation Chamber</DialogTitle>
                <DialogDescription>
                    Enter a message for the student to reflect on. They will not be able to access their dashboard until you release them, or the optional timer expires.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g., Reflect on your focus during today's history lesson."
                    rows={4}
                />
                 <div className="space-y-2">
                    <Label htmlFor="meditation-duration">Release After (Minutes, Optional)</Label>
                    <Input 
                        id="meditation-duration" 
                        type="number" 
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        placeholder="e.g., 15"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="show-timer" checked={showTimer} onCheckedChange={setShowTimer} />
                    <Label htmlFor="show-timer">Show timer to student</Label>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleConfirm} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm
                </Button>
            </DialogFooter>
        </DialogContent>
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
  const [isMeditationDialogOpen, setIsMeditationDialogOpen] = useState(false);
  const [isMarking, setIsMarking] = useState<'add' | 'remove' | null>(null);
  
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
  
    const handleReleaseFromMeditation = async () => {
        try {
            const result = await setMeditationStatus({
                teacherUid,
                studentUid: student.uid,
                isInMeditation: false,
            });
            if (result.success) {
                toast({ title: 'Released', description: `${student.characterName} has been released from the Meditation Chamber.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };
    
    const handleForceLogout = async () => {
        try {
            const result = await forceStudentLogout({
                teacherUid,
                studentUid: student.uid,
            });
            if (result.success) {
                toast({ title: 'Logout Signal Sent', description: `${student.characterName} will be logged out on their next action.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleMark = async (type: 'add' | 'remove') => {
        setIsMarking(type);
        try {
            const result = type === 'add'
                ? await addShadowMark({ teacherUid, studentUid: student.uid })
                : await removeShadowMark({ teacherUid, studentUid: student.uid });
            if (!result.success) {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsMarking(null);
        }
    }


  const avatarBorderColor = {
    Mage: 'border-blue-600',
    Healer: 'border-green-500',
    Guardian: 'border-amber-500',
    '': 'border-transparent',
  }[student.class];

  const shadowMarks = student.shadowMarks || 0;

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
      <Dialog open={isMeditationDialogOpen} onOpenChange={setIsMeditationDialogOpen}>
          <MeditationDialog student={student} teacherUid={teacherUid} onOpenChange={setIsMeditationDialogOpen} />
      </Dialog>
      <Dialog>
      <TooltipProvider>
        <Card className={cn("shadow-lg rounded-xl flex flex-col overflow-hidden transition-all duration-300 relative", isSelected ? "ring-4 ring-primary scale-105" : "hover:scale-105", student.isHidden && "opacity-60 bg-gray-200")}>
           <div className="relative z-10 flex flex-col h-full bg-card/80 backdrop-blur-sm">
            <CardHeader className="p-4 relative flex flex-row items-center gap-4 bg-secondary/30">
                 <div className="absolute top-2 right-2 z-10">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onSelect}
                        aria-label={`Select ${student.characterName}`}
                        className="h-6 w-6 border-2 border-black bg-white"
                    />
                </div>
                <div className={cn("relative w-24 h-24 border-4 bg-black/20 p-1 shadow-inner shrink-0", avatarBorderColor)}>
                    {isOnline && (
                        <Tooltip>
                            <TooltipTrigger className="absolute -top-1 -left-1 z-10">
                            <div className="w-4 h-4 rounded-full bg-green-500 ring-2 ring-white animate-pulse" />
                            </TooltipTrigger>
                            <TooltipContent><p>Online</p></TooltipContent>
                        </Tooltip>
                    )}
                    {student.isInMeditationChamber && (
                         <Tooltip>
                            <TooltipTrigger className="absolute -top-2 -right-2 z-10">
                               <Image src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Sep%2030%2C%202025%2C%2005_47_41%20PM.png?alt=media&token=3c1c2e5c-03fe-4fae-a9f6-5024685166b5" alt="Meditation Icon" width={32} height={32} />
                            </TooltipTrigger>
                            <TooltipContent><p>In Meditation Chamber</p></TooltipContent>
                        </Tooltip>
                    )}
                    <Image
                        src={avatarUrl}
                        alt={`${student.characterName}'s avatar`}
                        fill
                        sizes="96px"
                        className="object-contain drop-shadow-lg"
                        data-ai-hint="character"
                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100.png')}
                    />
                </div>
                <div className="flex-grow space-y-1">
                    <EditableText student={student} field="characterName" label="Character Name" icon={<Sword className="w-5 h-5" />} teacherUid={teacherUid} />
                    <EditableText student={student} field="studentName" label="Student Name" icon={<User className="w-5 h-5" />} teacherUid={teacherUid} />
                    {shadowMarks > 0 && (
                        <div className="flex gap-1 pt-1">
                            {Array.from({ length: shadowMarks }).map((_, i) => (
                                <Image
                                    key={i}
                                    src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Button%20Images%2FShadow%20Mark.png?alt=media&token=adac1479-10f4-4ed4-afda-5498e5e27a33"
                                    alt="Shadow Mark"
                                    width={20}
                                    height={20}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow grid grid-cols-2 gap-x-4 gap-y-3 text-lg">
                <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-orange-400" />
                    <span>Lvl {student.level ?? 1}</span>
                </div>
                 <EditablePairedStat student={student} stat="hp" maxStat="maxHp" label="HP" icon={<Heart className="h-5 w-5 text-red-500" />} teacherUid={teacherUid} />
                <div className="flex items-center gap-2">
                    <Sword className="w-5 h-5" />
                    <span>{student.class}</span>
                </div>
                 <EditablePairedStat student={student} stat="mp" maxStat="maxMp" label="MP" icon={<Zap className="h-5 w-5 text-blue-500" />} teacherUid={teacherUid} />
                <div className="flex items-center gap-2">
                    {company?.logoUrl ? (
                        <Image src={company.logoUrl} alt={company.name} width={20} height={20} className="rounded-full" />
                    ) : (
                        <Briefcase className="w-5 h-5" />
                    )}
                    <span className="truncate">{company?.name || 'Freelancer'}</span>
                </div>
                 <EditableStat student={student} stat="gold" label="Gold" icon={<Coins className="h-5 w-5 text-amber-500" />} teacherUid={teacherUid} />
                <div className="col-span-2">
                 <EditableStat student={student} stat="xp" label="Experience" icon={<ShieldCheck className="h-5 w-5 text-yellow-400" />} teacherUid={teacherUid} />
                </div>
            </CardContent>
            <CardFooter className="p-2 bg-secondary/30 mt-auto grid grid-cols-3 gap-2">
                 <Button className={cn("w-full relative", student.hasUnreadMessages && "bg-red-500 hover:bg-red-600 text-white animate-pulse")} variant="outline" onClick={() => onSendMessage(student)}>
                    <MessageSquare className="h-4 w-4" />
                </Button>
                <DialogTrigger asChild>
                <Button className="w-full" variant="secondary">
                    View Details
                </Button>
                </DialogTrigger>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="w-full" variant="outline"><Settings className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setIsNotesOpen(true)}><FileText className="mr-2 h-4 w-4"/> View/Edit Notes</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsQuestProgressOpen(true)}><BookOpen className="mr-2 h-4 w-4" /> Set Quest Progress</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleMark('add')} disabled={isMarking === 'add' || (student.shadowMarks || 0) >= 3}>
                            {isMarking === 'add' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <AlertCircle className="mr-2 h-4 w-4"/>}
                            Add Shadow Mark
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleMark('remove')} disabled={isMarking === 'remove' || (student.shadowMarks || 0) <= 0} className="text-green-600 focus:text-green-700">
                           {isMarking === 'remove' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}
                           Remove Shadow Mark
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {student.isInMeditationChamber ? (
                             <DropdownMenuItem onSelect={handleReleaseFromMeditation} className="text-green-600 focus:text-green-700">
                                <UserCheck className="mr-2 h-4 w-4"/> Release from Meditation
                            </DropdownMenuItem>
                        ) : (
                             <DropdownMenuItem onSelect={() => setIsMeditationDialogOpen(true)}>
                                <Moon className="mr-2 h-4 w-4"/> Send to Meditation Chamber
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={handleToggleVisibility}>
                            {student.isHidden ? <Eye className="mr-2 h-4 w-4"/> : <EyeOff className="mr-2 h-4 w-4" />}
                            {student.isHidden ? 'Unhide Student' : 'Hide Student'}
                        </DropdownMenuItem>
                         <DropdownMenuItem onSelect={handleForceLogout} className="text-destructive focus:text-destructive">
                            <LogOut className="mr-2 h-4 w-4"/> Force Student Logout
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                </DropdownMenu>
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
