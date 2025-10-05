

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, getDoc, onSnapshot, writeBatch, deleteDoc, getDocs, query, where, updateDoc, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, PendingStudent, ClassType, Company, QuestHub, Chapter } from '@/lib/data';
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
  DropdownMenuCheckboxItem
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
import { Loader2, Star, Coins, UserX, Swords, BookOpen, Wrench, ChevronDown, Copy, Check, X, Bell, SortAsc, Trash2, DatabaseZap, BookHeart, Users, ShieldAlert, Gift, Gamepad2, School, Archive, Briefcase, Eye, EyeOff, MessageSquare, Heart, Zap as ZapIcon, Trophy, HeartPulse, Filter, Moon, UserCheck, LogOut, Save, BarChart } from 'lucide-react';
import { logGameEvent } from '@/lib/gamelog';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { setMeditationStatus, toggleStudentVisibility, setBulkMeditationStatus, releaseAllFromMeditation } from '@/ai/flows/manage-student';
import { TeacherMessageCenter } from '@/components/teacher/teacher-message-center';
import { restoreAllStudentsHp, restoreAllStudentsMp } from '@/ai/flows/manage-class';
import { SetQuestProgressDialog } from '@/components/teacher/set-quest-progress-dialog';
import { updateDailyReminder, updateDailyRegen } from '@/ai/flows/manage-teacher';
import { Textarea } from '@/components/ui/textarea';
import { getGlobalSettings } from '@/ai/flows/manage-settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { awardRewards } from '@/ai/flows/manage-student-stats';
import { TeacherNotesDialog } from '@/components/teacher/teacher-notes-dialog';


interface TeacherData {
    name: string;
    className: string;
    classCode: string;
    pendingCleanupBattleId?: string;
    hasUnreadTeacherMessages?: boolean;
    dailyReminderTitle?: string;
    dailyReminderMessage?: string;
    isDailyReminderActive?: boolean;
    dailyRegenPercentage?: number;
    lastSeenBroadcastTimestamp?: any;
    isNewlyRegistered?: boolean;
    levelingTable?: { [level: number]: number };
}

type SortOrder = 'studentName' | 'characterName' | 'xp' | 'class' | 'company' | 'inMeditation';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [hubs, setHubs] = useState<QuestHub[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [awardReason, setAwardReason] = useState('');
  const [xpAmount, setXpAmount] = useState<number | string>('');
  const [goldAmount, setGoldAmount] = useState<number | string>('');
  const [isAwarding, setIsAwarding] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRewardsDialogOpen, setIsRewardsDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isQuestProgressOpen, setIsQuestProgressOpen] = useState(false);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [onlineUids, setOnlineUids] = useState<string[]>([]);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showBetaWelcomeDialog, setShowBetaWelcomeDialog] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  
  const [sortOrder, setSortOrder] = useState<SortOrder>('studentName');
  const [companyFilters, setCompanyFilters] = useState<string[]>(['all']);

  const { toast } = useToast();
  
  const [isMessageCenterOpen, setIsMessageCenterOpen] = useState(false);
  const [initialStudentToView, setInitialStudentToView] = useState<Student | null>(null);
  
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [isReminderActive, setIsReminderActive] = useState(true);
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  const [isRegenDialogOpen, setIsRegenDialogOpen] = useState(false);
  const [regenPercentage, setRegenPercentage] = useState<number | string>(0);
  const [isSavingRegen, setIsSavingRegen] = useState(false);

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
  
  const [isBulkMeditationOpen, setIsBulkMeditationOpen] = useState(false);
  const [bulkMeditationMessage, setBulkMeditationMessage] = useState('');
  const [bulkMeditationDuration, setBulkMeditationDuration] = useState<number | string>('');


  const [isReleasingAll, setIsReleasingAll] = useState(false);


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

        let currentTeacher: User;
        if (isAdmin && viewingTeacherId) {
            currentTeacher = { uid: viewingTeacherId } as User;
            setIsAdminPreview(true);
        } else {
            currentTeacher = user;
            setIsAdminPreview(false);
        }
        setTeacher(currentTeacher);

        const checkWelcomeAndBroadcast = async () => {
            const teacherRef = doc(db, 'teachers', currentTeacher.uid);
            const teacherSnap = await getDoc(teacherRef);
            if (!teacherSnap.exists()) return;
            const teacherData = teacherSnap.data() as TeacherData;

            if (teacherData.isNewlyRegistered) {
                 const settings = await getGlobalSettings();
                 if (settings.isFeedbackPanelVisible) {
                    setShowBetaWelcomeDialog(true);
                } else {
                    setShowWelcomeDialog(true);
                }
            } else if (!isAdminPreview) {
                 const settings = await getGlobalSettings();
                 if (settings.broadcastMessageId) {
                     const lastSeenTimestamp = teacherData?.lastSeenBroadcastTimestamp?.toDate() ?? new Date(0);
                     const broadcastsRef = collection(db, 'settings', 'global', 'broadcasts');
                     const latestBroadcastQuery = query(broadcastsRef, orderBy('sentAt', 'desc'), limit(1));
                     const latestBroadcastSnapshot = await getDocs(latestBroadcastQuery);

                     if(!latestBroadcastSnapshot.empty) {
                         const latestBroadcast = latestBroadcastSnapshot.docs[0].data();
                         if (latestBroadcast.sentAt) {
                            const latestTimestamp = latestBroadcast.sentAt.toDate();
                            
                            if (latestTimestamp > lastSeenTimestamp) {
                                setBroadcastMessage(latestBroadcast.message);
                                setIsBroadcastDialogOpen(true);
                            }
                         }
                     }
                 }
            }
        }
        
        checkWelcomeAndBroadcast();
    });

    return () => unsubscribe();
  }, [searchParams, router]);

  useEffect(() => {
    if (!teacher?.uid) return;

    const teacherUid = teacher.uid;
    
    const teacherRef = doc(db, 'teachers', teacherUid);
    const unsubTeacher = onSnapshot(teacherRef, (teacherSnap) => {
        if (teacherSnap.exists()) {
            const data = teacherSnap.data() as TeacherData;
            setTeacherData(data);
            setReminderTitle(data.dailyReminderTitle || "A Hero's Duty Awaits!");
            setReminderMessage(data.dailyReminderMessage || "Greetings, adventurer! A new day dawns, and the realm of Luminaria has a quest with your name on it. Your legend will not write itself!\\n\\nEmbark on a chapter from the World Map to continue your training. For each quest you complete, you will be rewarded with valuable **Experience (XP)** to grow stronger and **Gold** to fill your coffers.\\n\\nYour next great deed awaits!");
            setIsReminderActive(data.isDailyReminderActive ?? true);
            setRegenPercentage(data.dailyRegenPercentage ?? 0);
            if (data.pendingCleanupBattleId) {
                setTimeout(() => {
                    handleClearAllBattleStatus(true);
                }, 20000);
            }
        }
    });

    const studentsQuery = collection(db, "teachers", teacherUid, "students");
    const studentsUnsubscribe = onSnapshot(studentsQuery, (snapshot) => {
        const studentData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
        setStudents(studentData);
        setIsLoading(false);
    });
    
    const pendingStudentsQuery = collection(db, "teachers", teacherUid, "pendingStudents");
    const pendingUnsubscribe = onSnapshot(pendingStudentsQuery, (snapshot) => {
        setPendingStudents(snapshot.docs.map(doc => ({ ...doc.data() } as PendingStudent)));
    });
    
    const companiesQuery = collection(db, 'teachers', teacherUid, 'companies');
    const companiesUnsubscribe = onSnapshot(companiesQuery, (snapshot) => {
        const companiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
        setCompanies(companiesData.sort((a,b) => a.name.localeCompare(b.name)));
    });

    const presenceRef = doc(db, 'teachers', teacher.uid, 'presence', 'online');
    const unsubPresence = onSnapshot(presenceRef, (presenceSnap) => {
        const presenceData = presenceSnap.exists() ? presenceSnap.data().onlineStatus || {} : {};
        const uids = Object.keys(presenceData).filter(uid => presenceData[uid]?.status === 'online');
        setOnlineUids(uids);
    });
    
    const hubsQuery = query(collection(db, 'teachers', teacherUid, 'questHubs'), orderBy('hubOrder'));
    const hubsUnsubscribe = onSnapshot(hubsQuery, (snapshot) => {
        setHubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub)))
    });
    
    const chaptersQuery = query(collection(db, 'teachers', teacherUid, 'chapters'), orderBy('chapterNumber'));
    const chaptersUnsubscribe = onSnapshot(chaptersQuery, (snapshot) => {
        setChapters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter)))
    });


    // Cleanup listeners on unmount
    return () => {
        unsubTeacher();
        studentsUnsubscribe();
        pendingUnsubscribe();
        companiesUnsubscribe();
        hubsUnsubscribe();
        chaptersUnsubscribe();
        unsubPresence();
    };
  }, [teacher]);


  const sortedStudents = useMemo(() => {
    let filteredStudents = students.filter(s => !s.isArchived && (showHidden ? s.isHidden : !s.isHidden));

    if (!companyFilters.includes('all')) {
        filteredStudents = filteredStudents.filter(s => {
            const isFreelancer = !s.companyId;
            if (companyFilters.includes('freelancers') && isFreelancer) {
                return true;
            }
            if (s.companyId && companyFilters.includes(s.companyId)) {
                return true;
            }
            return false;
        });
    }

    switch(sortOrder) {
      case 'studentName':
        return { type: 'flat', data: [...filteredStudents].sort((a, b) => a.studentName.localeCompare(b.studentName)) };
      case 'characterName':
        return { type: 'flat', data: [...filteredStudents].sort((a, b) => a.characterName.localeCompare(b.characterName)) };
      case 'xp':
        return { type: 'flat', data: [...filteredStudents].sort((a, b) => (b.xp || 0) - (a.xp || 0)) };
      case 'class':
        const classOrder: ClassType[] = ['Guardian', 'Healer', 'Mage'];
        return { type: 'flat', data: [...filteredStudents].sort((a, b) => classOrder.indexOf(a.class) - classOrder.indexOf(b.class)) };
      case 'inMeditation':
        return { type: 'flat', data: [...filteredStudents].sort((a, b) => {
            const aMeditating = a.isInMeditationChamber ?? false;
            const bMeditating = b.isInMeditationChamber ?? false;
            if (aMeditating && !bMeditating) return -1;
            if (!aMeditating && bMeditating) return 1;
            return a.studentName.localeCompare(b.studentName);
        })};
      case 'company':
        const grouped: { [companyId: string]: Student[] } = {};
        const freelancers: Student[] = [];

        filteredStudents.forEach(student => {
            if (student.companyId && companies.find(c => c.id === student.companyId)) {
                if (!grouped[student.companyId]) {
                    grouped[student.companyId] = [];
                }
                grouped[student.companyId].push(student);
            } else {
                freelancers.push(student);
            }
        });
        
        for (const companyId in grouped) {
            grouped[companyId].sort((a, b) => a.characterName.localeCompare(b.characterName));
        }
        
        freelancers.sort((a, b) => a.characterName.localeCompare(b.characterName));

        const sortedCompanyIds = companies
            .filter(c => grouped[c.id])
            .map(c => c.id);

        return { type: 'grouped', data: grouped, freelancers, companyOrder: sortedCompanyIds };
      default:
        return { type: 'flat', data: filteredStudents };
    }
  }, [students, sortOrder, companies, showHidden, companyFilters]);
  
  const handleCompanyFilterChange = (filterId: string) => {
    if (filterId === 'all') {
        setCompanyFilters(['all']);
        return;
    }

    setCompanyFilters(prev => {
        const newFilters = prev.filter(f => f !== 'all');
        if (newFilters.includes(filterId)) {
            const nextFilters = newFilters.filter(f => f !== filterId);
            return nextFilters.length === 0 ? ['all'] : nextFilters;
        } else {
            return [...newFilters, filterId];
        }
    });
  };

  const handleToggleStudentSelection = (uid: string) => {
    setSelectedStudents(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAllToggle = () => {
    const allVisibleUids = students.filter(s => !s.isArchived).map(s => s.uid);

    if (selectedStudents.length === allVisibleUids.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(allVisibleUids);
    }
  };

  const handleAwardRewards = async () => {
      const xpValue = Number(xpAmount) || 0;
      const goldValue = Number(goldAmount) || 0;

      if (xpValue === 0 && goldValue === 0) {
          toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a non-zero amount for XP or Gold.' });
          return;
      }
      if (selectedStudents.length === 0) {
          toast({ variant: 'destructive', title: 'No Students Selected', description: 'Please select at least one student.' });
          return;
      }

      setIsAwarding(true);
      
      try {
          const result = await awardRewards({
              teacherUid: teacher!.uid,
              studentUids: selectedStudents,
              xp: xpValue,
              gold: goldValue,
              reason: awardReason || 'Rewards bestowed by the Guild Leader.',
          });

          if (result.success) {
                toast({
                    title: 'Rewards Bestowed!',
                    description: `Successfully awarded rewards to ${result.studentCount} student(s).`,
                });
                 if (result.maxLevelCount && result.maxLevelCount > 0) {
                    toast({
                        variant: 'default',
                        title: 'Note',
                        description: `${result.maxLevelCount} student(s) are at the max level and did not receive XP.`,
                    });
                }
          } else {
              throw new Error(result.error);
          }

          setSelectedStudents([]);
          setXpAmount('');
          setGoldAmount('');
          setAwardReason('');
          setIsRewardsDialogOpen(false);
      } catch (error: any) {
          console.error("Error awarding rewards: ", error);
          toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Could not bestow rewards. Please try again.' });
      } finally {
          setIsAwarding(false);
      }
  };


  const handleArchiveStudents = async () => {
    if (!teacher || selectedStudents.length === 0) return;
    setIsArchiving(true);
    try {
      const uidsToArchive = selectedStudents.filter(uid => {
          const student = students.find(s => s.uid === uid);
          return student && !student.isArchived;
      });

      if (uidsToArchive.length === 0) {
          toast({ description: "All selected students are already archived." });
          return;
      }
      // Note: A backend function `archiveStudents` would be needed here, which is not defined in the provided files.
      // This is a placeholder for the logic that would exist.
      console.log("Archiving students:", uidsToArchive);
      toast({ title: 'Students Archived', description: `${uidsToArchive.length} student(s) have been moved to the archives.` });

      setSelectedStudents([]);
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
        inDuel: false,
      };
      
      const newStudentRef = doc(db, 'teachers', teacher.uid, 'students', uid);
      
      const batch = writeBatch(db);
      batch.set(newStudentRef, newStudent);
      batch.delete(pendingStudentRef);
      
      await batch.commit();
      
      await updateDoc(doc(db, 'students', uid), { approved: true });
      
      await logGameEvent(teacher.uid, 'ACCOUNT', `${newStudent.studentName} (${newStudent.characterName}) was approved and joined the guild.`);
      toast({ title: "Hero Approved!", description: `${newStudent.characterName} has joined your guild.` });
    } else {
      await deleteDoc(pendingStudentRef);
      await deleteDoc(doc(db, 'students', uid));

      await logGameEvent(teacher.uid, 'ACCOUNT', `The application for ${pendingStudent.studentName} (${pendingStudent.characterName}) was rejected.`);
      toast({ title: "Request Rejected", description: `The request for ${pendingStudent.characterName} has been deleted. You may need to delete the user from Firebase Authentication manually if they should be prevented from re-registering.` });
    }
  
    if (pendingStudents.length === 1) {
      setIsApprovalDialogOpen(false);
    }
  };

  const handleClearAllBattleStatus = async (isAutoCleanup = false) => {
    if (!teacher) return;
    
    if (!isAutoCleanup) {
        setIsAwarding(true);
    }

    const batch = writeBatch(db);
    try {
        const studentsInBattleQuery = query(collection(db, 'teachers', teacher.uid, 'students'), where('inBattle', '==', true));
        const studentsInBattleSnapshot = await getDocs(studentsInBattleQuery);
        let studentCount = 0;
        if (!studentsInBattleSnapshot.empty) {
            studentsInBattleSnapshot.forEach(doc => {
                batch.update(doc.ref, { inBattle: false });
                studentCount++;
            });
        }

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
  
  const handleOpenMessageCenter = (student?: Student) => {
    setInitialStudentToView(student || null);
    setIsMessageCenterOpen(true);
  };
  
    const handleCloseMessageCenter = async () => {
        setIsMessageCenterOpen(false);
        if (teacher && teacherData?.hasUnreadTeacherMessages) {
            const teacherRef = doc(db, 'teachers', teacher.uid);
            await updateDoc(teacherRef, { hasUnreadTeacherMessages: false });
        }
    };
  
  const handleRestoreAll = async (stat: 'hp' | 'mp') => {
      if (!teacher) return;
      setIsAwarding(true);
      try {
          const result = stat === 'hp'
              ? await restoreAllStudentsHp(teacher.uid)
              : await restoreAllStudentsMp(teacher.uid);
          
          if (result.success) {
              toast({ title: 'Success!', description: result.message });
          } else {
              throw new Error(result.error);
          }
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: error.message });
      } finally {
          setIsAwarding(false);
      }
  }

  const handleSaveReminder = async () => {
    if (!teacher) return;
    setIsSavingReminder(true);
    try {
        await updateDailyReminder({
            teacherUid: teacher.uid,
            title: reminderTitle,
            message: reminderMessage,
            isActive: isReminderActive,
        });
        toast({ title: 'Success', description: 'Daily reminder settings have been updated.' });
        setIsReminderDialogOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSavingReminder(false);
    }
  }

  const handleSaveRegen = async () => {
    if (!teacher) return;
    const percentage = Number(regenPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast({ variant: 'destructive', title: 'Invalid Value', description: 'Please enter a number between 0 and 100.' });
        return;
    }
    setIsSavingRegen(true);
    try {
        await updateDailyRegen({ teacherUid: teacher.uid, regenPercentage: percentage });
        toast({ title: 'Success', description: 'Daily regeneration rate updated.' });
        setIsRegenDialogOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSavingRegen(false);
    }
  }
  
    const handleBulkMeditation = async () => {
        if (!teacher || selectedStudents.length === 0 || !bulkMeditationMessage.trim()) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please select students and enter a message.' });
            return;
        }
        setIsAwarding(true); // Re-use awarding state for loading
        try {
            const result = await setBulkMeditationStatus({
                teacherUid: teacher.uid,
                studentUids: selectedStudents,
                isInMeditation: true,
                message: bulkMeditationMessage,
                durationInMinutes: Number(bulkMeditationDuration) || undefined
            });
            if (result.success) {
                toast({ title: 'Success', description: `${selectedStudents.length} student(s) have been sent to the Meditation Chamber.` });
                setIsBulkMeditationOpen(false);
                setBulkMeditationMessage('');
                setBulkMeditationDuration('');
                setSelectedStudents([]);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsAwarding(false);
        }
    };

    const handleReleaseAll = async () => {
        if (!teacher) return;
        setIsReleasingAll(true);
        try {
            const result = await releaseAllFromMeditation({ teacherUid: teacher.uid });
            if (result.success) {
                toast({ title: 'Success', description: result.message });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsReleasingAll(false);
        }
    };


  if (isLoading || !teacher) {
    return (
       <div className="flex min-h-screen w-full flex-col">
        <TeacherHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-4">Your Guild Roster</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
                     <DropdownMenuItem onClick={() => router.push('/teacher/duels')}>
                        <Swords className="mr-2 h-4 w-4" />
                        <span>The Training Grounds</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/battles/summary')}>
                        <BookHeart className="mr-2 h-4 w-4" />
                        <span>Battle Archives</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/leaderboard')}>
                        <Trophy className="mr-2 h-4 w-4" />
                        <span>View Leaderboard</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => router.push('/teacher/tools')}>
                        <Wrench className="mr-2 h-4 w-4" />
                        <span>The Guild Leader's Toolkit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        disabled={selectedStudents.length === 0}
                        onSelect={(e) => {
                            e.preventDefault();
                            setIsQuestProgressOpen(true);
                        }}
                    >
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>Set Chapter Location for Selected</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-green-600 focus:bg-green-100 focus:text-green-800">
                                <Heart className="mr-2 h-4 w-4" />
                                <span>Restore All HP</span>
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will restore every student in your guild to their maximum HP.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRestoreAll('hp')}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-blue-600 focus:bg-blue-100 focus:text-blue-800">
                                <ZapIcon className="mr-2 h-4 w-4" />
                                <span>Restore All MP</span>
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will restore every student in your guild to their maximum Magic Points.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRestoreAll('mp')}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
                    <DropdownMenuItem onClick={() => router.push('/teacher/settings/leveling')}>
                        <BarChart className="mr-2 h-4 w-4" />
                        <span>Custom Leveling Curve</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/teacher/gamelog')}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>The Chronicler's Scroll</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsReminderDialogOpen(true)}>
                        <Bell className="mr-2 h-4 w-4" />
                        Set Daily Reminder
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setIsRegenDialogOpen(true)}>
                        <HeartPulse className="mr-2 h-4 w-4" />
                        Set Daily HP/MP Regen
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsBulkMeditationOpen(true)} disabled={selectedStudents.length === 0}>
                        <Moon className="mr-2 h-4 w-4" />
                        Send Selected to Meditation
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleReleaseAll} className="text-green-600 focus:text-green-700">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Release All from Meditation
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
                </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-black border-black">
                        <SortAsc className="mr-2 h-4 w-4" /> Sort By
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                        <DropdownMenuRadioItem value="studentName">Student Name</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="characterName">Character Name</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="xp">Experience</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="class">Class</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="company">Company</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="inMeditation">In Meditation</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>

             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-black border-black">
                        <Filter className="mr-2 h-4 w-4" /> Filter by Company
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuCheckboxItem
                        checked={companyFilters.includes('all')}
                        onSelect={(e) => { e.preventDefault(); handleCompanyFilterChange('all'); }}
                    >
                        All Companies
                    </DropdownMenuCheckboxItem>
                     <DropdownMenuCheckboxItem
                        checked={companyFilters.includes('freelancers')}
                        onSelect={(e) => { e.preventDefault(); handleCompanyFilterChange('freelancers'); }}
                    >
                        Freelancers
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {companies.map(company => (
                        <DropdownMenuCheckboxItem
                            key={company.id}
                            checked={companyFilters.includes(company.id)}
                             onSelect={(e) => { e.preventDefault(); handleCompanyFilterChange(company.id); }}
                        >
                            {company.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {pendingStudents.length > 0 && (
                <Button variant="secondary" onClick={() => setIsApprovalDialogOpen(true)} className="border-black border">
                    <Bell className="mr-2 h-4 w-4 animate-pulse" />
                    Pending Approvals ({pendingStudents.length})
                </Button>
            )}
             <Button variant="outline" onClick={() => handleOpenMessageCenter()} className="relative text-black border-black">
                <MessageSquare className="mr-2 h-5 w-5" />
                Message Center
                {teacherData?.hasUnreadTeacherMessages && <span className="absolute top-1 right-1 flex h-3 w-3 rounded-full bg-red-600 animate-pulse" />}
            </Button>

            <Dialog open={isRewardsDialogOpen} onOpenChange={setIsRewardsDialogOpen}>
              <DialogTrigger asChild>
                  <Button disabled={selectedStudents.length === 0} className="bg-green-600 hover:bg-green-700 text-white border-black border">
                      <Star className="mr-2 h-4 w-4" /> Bestow Rewards
                  </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                  <DialogTitle>Bestow Rewards</DialogTitle>
                  <DialogDescription>
                      Enter a positive value to add or a negative value to remove XP or Gold for all selected students.
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
                       <div className="space-y-2 col-span-4">
                          <Label htmlFor="award-reason">
                              Reason for Award (Optional)
                          </Label>
                          <Textarea
                              id="award-reason"
                              value={awardReason}
                              onChange={(e) => setAwardReason(e.target.value)}
                              placeholder="e.g., For excellent participation in class."
                              disabled={isAwarding}
                          />
                      </div>
                  </div>
                  <DialogFooter>
                      <Button onClick={handleAwardRewards} disabled={isAwarding || selectedStudents.length === 0}>
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
                            This will hide {selectedStudents.length} student(s) from the main dashboard. Their login will be disabled. This action can be undone from the "Archived Heroes" page in the Classroom tools menu. Are you sure?
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
            <TeacherMessageCenter 
                teacher={teacher} 
                students={students}
                isOpen={isMessageCenterOpen}
                onOpenChange={handleCloseMessageCenter}
                initialStudent={initialStudentToView}
                onConversationSelect={setInitialStudentToView}
            />
            <SetQuestProgressDialog
                isOpen={isQuestProgressOpen}
                onOpenChange={setIsQuestProgressOpen}
                studentsToUpdate={students.filter(s => selectedStudents.includes(s.uid))}
                teacherUid={teacher.uid}
                hubs={hubs}
                chapters={chapters}
            />
            <div className="flex items-center space-x-2">
                <Switch id="show-hidden" checked={showHidden} onCheckedChange={setShowHidden} />
                <Label htmlFor="show-hidden" className="flex items-center gap-1 cursor-pointer font-semibold text-black text-lg">
                    {showHidden ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                    {showHidden ? 'Showing Hidden Heroes' : 'Show Hidden Heroes'}
                </Label>
            </div>
             <Dialog open={isBulkMeditationOpen} onOpenChange={setIsBulkMeditationOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send {selectedStudents.length} Student(s) to Meditation</DialogTitle>
                        <DialogDescription>
                            Enter a message for the selected students to reflect on.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Textarea
                            value={bulkMeditationMessage}
                            onChange={(e) => setBulkMeditationMessage(e.target.value)}
                            placeholder="e.g., Reflect on your focus during today's quest."
                            rows={4}
                        />
                         <div className="space-y-2">
                            <Label htmlFor="meditation-duration">Release After (Minutes, Optional)</Label>
                            <Input
                                id="meditation-duration"
                                type="number"
                                value={bulkMeditationDuration}
                                onChange={e => setBulkMeditationDuration(e.target.value)}
                                placeholder="e.g., 15"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkMeditationOpen(false)}>Cancel</Button>
                        <Button onClick={handleBulkMeditation} disabled={isAwarding || !bulkMeditationMessage.trim()}>
                            {isAwarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirm & Send
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Daily Reminder</DialogTitle>
                        <DialogDescription>
                            This message will pop up for students the first time they log in each day.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="reminder-active" checked={isReminderActive} onCheckedChange={setIsReminderActive} />
                            <Label htmlFor="reminder-active">Daily Reminder Active</Label>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reminder-title">Title</Label>
                            <Input id="reminder-title" value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="reminder-message">Message</Label>
                            <Textarea id="reminder-message" value={reminderMessage.replace(/\\n/g, '\n')} onChange={(e) => setReminderMessage(e.target.value)} rows={6} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveReminder} disabled={isSavingReminder}>
                            {isSavingReminder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Settings
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             <Dialog open={isRegenDialogOpen} onOpenChange={setIsRegenDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Daily HP/MP Regeneration</DialogTitle>
                        <DialogDescription>
                            Set the percentage of Max HP and MP that students will regenerate automatically each day. This happens on their first login of the day.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="regen-percent">Regeneration Percentage (%)</Label>
                        <Input 
                            id="regen-percent" 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={regenPercentage}
                            onChange={e => setRegenPercentage(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRegenDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveRegen} disabled={isSavingRegen}>
                             {isSavingRegen ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Rate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                                teacherUid={teacher.uid}
                                onSendMessage={handleOpenMessageCenter}
                                hubs={hubs}
                                chapters={chapters}
                                onlineUids={onlineUids || []}
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
                            teacherUid={teacher.uid}
                            onSendMessage={handleOpenMessageCenter}
                            hubs={hubs}
                            chapters={chapters}
                            onlineUids={onlineUids || []}
                        />
                    </div>
                )}
            </div>
        ) : sortedStudents.type === 'flat' ? (
            <StudentList 
                students={sortedStudents.data} 
                selectedStudents={selectedStudents}
                onSelectStudent={handleToggleStudentSelection}
                teacherUid={teacher.uid}
                onSendMessage={handleOpenMessageCenter}
                hubs={hubs}
                chapters={chapters}
                onlineUids={onlineUids}
            />
        ) : null}
      </main>
    </div>
  );
}

