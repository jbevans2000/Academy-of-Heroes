
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc, query, orderBy, updateDoc, addDoc, serverTimestamp, deleteDoc, onSnapshot, where, Timestamp, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { AdminHeader } from '@/components/admin/admin-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getGlobalSettings, updateGlobalSettings } from '@/ai/flows/manage-settings';
import { deleteFeedback } from '@/ai/flows/submit-feedback';
import { getAdminNotepadContent, updateAdminNotepadContent } from '@/ai/flows/manage-admin-notepad';
import { getKnownBugsContent, updateKnownBugsContent } from '@/ai/flows/manage-known-bugs';
import { getUpcomingFeaturesContent, updateUpcomingFeaturesContent } from '@/ai/flows/manage-upcoming-features';
import { markAllAdminMessagesAsRead } from '@/ai/flows/manage-admin-messages';
import { downloadAndZipHostingFiles } from '@/ai/flows/download-hosting-files';
import { Loader2, ToggleLeft, ToggleRight, RefreshCw, Star, Bug, Lightbulb, Trash2, Diamond, Wrench, ChevronDown, Upload, TestTube2, CheckCircle, XCircle, Box, ArrowUpDown, Send, MessageCircle, HelpCircle, Edit, Reply, FileText, Save, CreditCard, View, Power, Users, Archive, DatabaseZap } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { DirectPromptInterface } from '@/components/admin/direct-prompt-interface';
import { Textarea } from '@/components/ui/textarea';
import { HelpArticleEditor } from '@/components/admin/help-article-editor';
import { AdminMessageCenter } from '@/components/admin/admin-message-center';
import PayPalTestButton from '@/components/admin/paypal-test-button';
import { Switch } from '@/components/ui/switch';
import { AdminSdkTester } from '@/components/admin/admin-sdk-tester';

type SortDirection = 'asc' | 'desc';
type TeacherSortKey = 'className' | 'name' | 'email' | 'schoolName' | 'studentCount' | 'createdAt' | 'contactEmail';
type StudentSortKey = 'studentName' | 'characterName' | 'studentId' | 'teacherName' | 'createdAt';

interface Teacher {
    id: string;
    name: string;
    email: string; // Auth email
    contactEmail?: string; // Firestore contact email
    address?: string;
    className: string;
    schoolName: string;
    studentCount: number;
    createdAt: Date | null;
    hasUnreadAdminMessages?: boolean;
}

interface Student {
    uid: string;
    studentId: string;
    studentName: string;
    characterName: string;
    teacherName: string;
    teacherId: string;
    createdAt: Date | null;
    lastLogin: Date | null;
}

interface Feedback {
    id: string;
    feedbackType: 'bug' | 'feature';
    message: string;
    createdAt: {
        seconds: number;
        nanoseconds: number;
    };
    status: 'new' | 'addressed';
    teacherUid: string;
    teacherName?: string;
    teacherEmail?: string;
}

interface Broadcast {
    id: string;
    message: string;
    sentAt: {
        seconds: number;
        nanoseconds: number;
    };
}


export default function AdminDashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isStudentRegistrationOpen, setIsStudentRegistrationOpen] = useState(true);
    const [isTeacherRegistrationOpen, setIsTeacherRegistrationOpen] = useState(true);
    const [isFeedbackPanelVisible, setIsFeedbackPanelVisible] = useState(false);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
    const [isDeletingFeedback, setIsDeletingFeedback] = useState(false);

    // Deletion state
    const [userToDelete, setUserToDelete] = useState<{ type: 'teacher' | 'student', data: Teacher | Student } | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    
    // Maintenance Mode State
    const [isMaintenanceModeOn, setIsMaintenanceModeOn] = useState(false);
    const [maintenanceWhitelist, setMaintenanceWhitelist] = useState('');
    const [maintenanceMessage, setMaintenanceMessage] = useState('');


    // Notepad State
    const [notepadContent, setNotepadContent] = useState('');
    const [isNotepadLoading, setIsNotepadLoading] = useState(true);
    const [isSavingNotepad, setIsSavingNotepad] = useState(false);
    const initialNotepadContent = useRef('');
    
    // Known Bugs State
    const [knownBugsContent, setKnownBugsContent] = useState('');
    const [isKnownBugsLoading, setIsKnownBugsLoading] = useState(true);
    const [isSavingKnownBugs, setIsSavingKnownBugs] = useState(false);
    const initialKnownBugsContent = useRef('');

    // Upcoming Features State
    const [upcomingFeaturesContent, setUpcomingFeaturesContent] = useState('');
    const [isUpcomingFeaturesLoading, setIsUpcomingFeaturesLoading] = useState(true);
    const [isSavingUpcomingFeatures, setIsSavingUpcomingFeatures] = useState(false);
    const initialUpcomingFeaturesContent = useRef('');


    // Broadcast message state
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
    const [broadcastToDelete, setBroadcastToDelete] = useState<Broadcast | null>(null);
    const [isDeletingBroadcast, setIsDeletingBroadcast] = useState(false);

    // Sorting state
    const [teacherSortConfig, setTeacherSortConfig] = useState<{ key: TeacherSortKey; direction: SortDirection } | null>({ key: 'className', direction: 'asc' });
    const [studentSortConfig, setStudentSortConfig] = useState<{ key: StudentSortKey; direction: SortDirection } | null>({ key: 'studentName', direction: 'asc' });

    // Message Center State
    const [isMessageCenterOpen, setIsMessageCenterOpen] = useState(false);
    const [initialTeacherToView, setInitialTeacherToView] = useState<Teacher | null>(null);
    const [isMarkingRead, setIsMarkingRead] = useState(false);

    // Column Visibility
    const [columnVisibility, setColumnVisibility] = useState({
        teacherUid: false,
        authEmail: true,
        contactEmail: true,
        school: true,
        studentCount: true,
        createdAt: true,
    });
    
    // Hosting Backup State
    const [isBackingUp, setIsBackingUp] = useState(false);
    
    const router = useRouter();
    const { toast } = useToast();

    // Client-side data deletion functions
    const deleteStudentData = async (teacherUid: string, studentUid: string) => {
        const batch = writeBatch(db);
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        const subcollections = ['messages', 'avatarLog'];
        for (const sub of subcollections) {
            const subRef = collection(studentRef, sub);
            const snapshot = await getDocs(subRef);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        batch.delete(studentRef);
        const globalStudentRef = doc(db, 'students', studentUid);
        batch.delete(globalStudentRef);
        await batch.commit();
    };

    const deleteTeacherData = async (teacherUid: string) => {
        const batch = writeBatch(db);
        const teacherRef = doc(db, 'teachers', teacherUid);
        const subcollections = [
            'students', 'pendingStudents', 'questHubs', 'chapters', 'bossBattles',
            'savedBattles', 'groupBattleSummaries', 'boons', 'pendingBoonRequests',
            'boonTransactions', 'gameLog', 'wheelOfFateEvents', 'duelQuestionSections',
            'companies', 'missions', 'guildHallMessages'
        ];
        for (const sub of subcollections) {
            const subRef = collection(teacherRef, sub);
            const snapshot = await getDocs(subRef);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        batch.delete(teacherRef);
        await batch.commit();
    };

    const fetchTeacherData = useCallback(async () => {
        const teachersQuery = query(collection(db, 'teachers'), orderBy('name'));
        const snapshot = await getDocs(teachersQuery);
        const teachersData: Teacher[] = [];
        for (const teacherDoc of snapshot.docs) {
            const teacherInfo = teacherDoc.data();
            const studentsSnapshot = await getDocs(collection(db, 'teachers', teacherDoc.id, 'students'));
            teachersData.push({
                id: teacherDoc.id,
                name: teacherInfo.name || '[No Name]',
                email: teacherInfo.email || '[No Auth Email]',
                contactEmail: teacherInfo.contactEmail || teacherInfo.email || '-',
                address: teacherInfo.address || '-',
                className: teacherInfo.className || '[No Class Name]',
                schoolName: teacherInfo.schoolName || '[No School]',
                studentCount: studentsSnapshot.size,
                createdAt: teacherInfo.createdAt?.toDate() || null,
                hasUnreadAdminMessages: teacherInfo.hasUnreadAdminMessages || false,
            });
        }
        setTeachers(teachersData);
    }, []);

    const fetchStudents = useCallback(async () => {
        try {
            const teachersSnapshot = await getDocs(collection(db, 'teachers'));
            const studentsData: Student[] = [];

             for (const teacherDoc of teachersSnapshot.docs) {
                const teacherInfo = teacherDoc.data();
                const studentsSnapshot = await getDocs(collection(db, 'teachers', teacherDoc.id, 'students'));
                 for (const studentDoc of studentsSnapshot.docs) {
                    const studentInfo = studentDoc.data();
                    let lastLoginDate = null;
                    if (studentInfo.lastLogin) {
                        lastLoginDate = studentInfo.lastLogin.toDate();
                    }

                    studentsData.push({
                        uid: studentDoc.id,
                        studentId: studentInfo.studentId || '[No Alias]',
                        studentName: studentInfo.studentName || '[No Name]',
                        characterName: studentInfo.characterName || '[No Character]',
                        teacherName: teacherInfo.name || '[No Teacher]',
                        teacherId: teacherDoc.id,
                        createdAt: studentInfo.createdAt?.toDate() || null,
                        lastLogin: lastLoginDate,
                    });
                }
            }
            setAllStudents(studentsData);
        } catch (error) {
             console.error("Error fetching students:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not load student data.' });
        }
    }, [toast]);

    const fetchFeedback = useCallback(async () => {
        try {
            const feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
            const feedbackSnapshot = await getDocs(feedbackQuery);
            const feedbackData = feedbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
            setFeedback(feedbackData);
        } catch (error) {
             console.error("Error fetching feedback:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not load feedback submissions.' });
        }
    }, [toast]);
    
    const fetchBroadcasts = useCallback(async () => {
        try {
            const broadcastsQuery = query(collection(db, 'settings', 'global', 'broadcasts'), orderBy('sentAt', 'desc'));
            const broadcastsSnapshot = await getDocs(broadcastsQuery);
            const broadcastsData = broadcastsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast));
            setBroadcasts(broadcastsData);
        } catch (error) {
            console.error("Error fetching broadcasts:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load broadcast history.' });
        }
    }, [toast]);
    
    const fetchNotepad = useCallback(async () => {
        setIsNotepadLoading(true);
        try {
            const content = await getAdminNotepadContent();
            setNotepadContent(content);
            initialNotepadContent.current = content;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load notepad content.' });
        } finally {
            setIsNotepadLoading(false);
        }
    }, [toast]);
    
    const fetchKnownBugs = useCallback(async () => {
        setIsKnownBugsLoading(true);
        try {
            const content = await getKnownBugsContent();
            setKnownBugsContent(content);
            initialKnownBugsContent.current = content;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load known bugs content.' });
        } finally {
            setIsKnownBugsLoading(false);
        }
    }, [toast]);

    const fetchUpcomingFeatures = useCallback(async () => {
        setIsUpcomingFeaturesLoading(true);
        try {
            const content = await getUpcomingFeaturesContent();
            setUpcomingFeaturesContent(content);
            initialUpcomingFeaturesContent.current = content;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load upcoming features content.' });
        } finally {
            setIsUpcomingFeaturesLoading(false);
        }
    }, [toast]);

    const fetchSettings = useCallback(async () => {
        setIsSettingsLoading(true);
        try {
            const settings = await getGlobalSettings();
            setIsStudentRegistrationOpen(settings.isStudentRegistrationOpen);
            setIsTeacherRegistrationOpen(settings.isTeacherRegistrationOpen);
            setIsFeedbackPanelVisible(settings.isFeedbackPanelVisible || false);
            setIsMaintenanceModeOn(settings.isMaintenanceModeOn || false);
            setMaintenanceWhitelist((settings.maintenanceWhitelist || []).join(', '));
            setMaintenanceMessage(settings.maintenanceMessage || 'The Academy of Heroes is under maintenance and will be back soon!');
        } catch (error) {
            console.error("Error fetching global settings:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load global settings.' });
        } finally {
            setIsSettingsLoading(false);
        }
    }, [toast]);
    
    const handleRefreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                fetchTeacherData(),
                fetchStudents(),
                fetchSettings(),
                fetchFeedback(),
                fetchBroadcasts(),
                fetchNotepad(),
                fetchKnownBugs(),
                fetchUpcomingFeatures(),
            ]);
            toast({ title: "Data Refreshed", description: "All dashboard data has been updated." });
        } catch (error) {
            console.error("Dashboard refresh error: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not refresh all dashboard data.' });
        } finally {
            setIsLoading(false);
        }
    }, [fetchTeacherData, fetchStudents, fetchSettings, fetchFeedback, fetchBroadcasts, fetchNotepad, fetchKnownBugs, fetchUpcomingFeatures, toast]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const adminRef = doc(db, 'admins', currentUser.uid);
                    const adminSnap = await getDoc(adminRef);

                    if (adminSnap.exists()) {
                        setUser(currentUser);
                        // Data fetching is now triggered here, only for admins
                        handleRefreshData();
                    } else {
                        // Not an admin, redirect
                        router.push('/teacher/dashboard');
                    }
                } catch (error) {
                    console.error("Error verifying admin status:", error);
                    router.push('/teacher/login');
                }
            } else {
                // Not logged in
                router.push('/teacher/login');
            }
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const sortedTeachers = useMemo(() => {
        let sortableItems = [...teachers];
        if (teacherSortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[teacherSortConfig.key] || '';
                const bValue = b[teacherSortConfig.key] || '';
                if (aValue < bValue) return teacherSortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return teacherSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [teachers, teacherSortConfig]);

    const sortedStudentsByTeacher = useMemo(() => {
        const groupedStudents: { [teacherId: string]: Student[] } = {};
        allStudents.forEach(student => {
            if (!groupedStudents[student.teacherId]) {
                groupedStudents[student.teacherId] = [];
            }
            groupedStudents[student.teacherId].push(student);
        });
        return groupedStudents;
    }, [allStudents]);

    const requestSort = (key: TeacherSortKey | StudentSortKey, type: 'teacher' | 'student') => {
        const config = type === 'teacher' ? teacherSortConfig : studentSortConfig;
        const setConfig = type === 'teacher' ? setTeacherSortConfig : setStudentSortConfig;
        
        let direction: SortDirection = 'asc';
        if (config && config.key === key && config.direction === 'asc') {
            direction = 'desc';
        }
        setConfig({ key, direction } as any);
    };
    
    const handleSaveNotepad = async () => {
        setIsSavingNotepad(true);
        try {
            const result = await updateAdminNotepadContent(notepadContent);
            if(result.success) {
                toast({ title: 'Notepad Saved', description: 'Your notes have been updated.' });
                initialNotepadContent.current = notepadContent;
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSavingNotepad(false);
        }
    }
    
    const handleSaveKnownBugs = async () => {
        setIsSavingKnownBugs(true);
        try {
            const result = await updateKnownBugsContent(knownBugsContent);
            if(result.success) {
                toast({ title: 'Known Bugs Saved', description: 'The known bugs list has been updated.' });
                initialKnownBugsContent.current = knownBugsContent;
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSavingKnownBugs(false);
        }
    }
    
    const handleSaveUpcomingFeatures = async () => {
        setIsSavingUpcomingFeatures(true);
        try {
            const result = await updateUpcomingFeaturesContent(upcomingFeaturesContent);
            if (result.success) {
                toast({ title: 'Upcoming Features Saved', description: 'The list of upcoming features has been updated.' });
                initialUpcomingFeaturesContent.current = upcomingFeaturesContent;
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSavingUpcomingFeatures(false);
        }
    };
    
    const handleToggleStudentRegistration = async () => {
        setIsSettingsLoading(true);
        try {
            const newStatus = !isStudentRegistrationOpen;
            const result = await updateGlobalSettings({ isStudentRegistrationOpen: newStatus });
            if (result.success) {
                setIsStudentRegistrationOpen(newStatus);
                toast({
                    title: 'Settings Updated',
                    description: `Student account registration is now ${newStatus ? 'ENABLED' : 'DISABLED'}.`
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSettingsLoading(false);
        }
    }

    const handleToggleTeacherRegistration = async () => {
        setIsSettingsLoading(true);
        try {
            const newStatus = !isTeacherRegistrationOpen;
            const result = await updateGlobalSettings({ isTeacherRegistrationOpen: newStatus });
            if (result.success) {
                setIsTeacherRegistrationOpen(newStatus);
                toast({
                    title: 'Settings Updated',
                    description: `Teacher account registration is now ${newStatus ? 'ENABLED' : 'DISABLED'}.`
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSettingsLoading(false);
        }
    }
    
    const handleToggleFeedbackPanel = async () => {
        setIsSettingsLoading(true);
        try {
            const newStatus = !isFeedbackPanelVisible;
            const result = await updateGlobalSettings({ isFeedbackPanelVisible: newStatus });
            if (result.success) {
                setIsFeedbackPanelVisible(newStatus);
                toast({
                    title: 'Settings Updated',
                    description: `Beta Feedback Panel is now ${newStatus ? 'VISIBLE' : 'HIDDEN'}.`
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSettingsLoading(false);
        }
    }
    
    const handleMaintenanceModeToggle = useCallback(async () => {
        setIsSettingsLoading(true);
        const newStatus = !isMaintenanceModeOn;
        try {
            const result = await updateGlobalSettings({ isMaintenanceModeOn: newStatus });
            if (result.success) {
                setIsMaintenanceModeOn(newStatus);
                toast({ title: 'Maintenance Mode Updated', description: `The site is now ${newStatus ? 'OFFLINE' : 'ONLINE'}.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSettingsLoading(false);
        }
    }, [isMaintenanceModeOn, toast]);

    const handleSaveMaintenanceSettings = async () => {
        setIsSettingsLoading(true);
        const whitelistArray = maintenanceWhitelist.split(',').map(uid => uid.trim()).filter(Boolean);

        try {
            const result = await updateGlobalSettings({ 
                maintenanceWhitelist: whitelistArray,
                maintenanceMessage: maintenanceMessage,
            });
            if (result.success) {
                toast({ title: 'Maintenance Settings Saved', description: 'Whitelist and message have been updated.' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSettingsLoading(false);
        }
    };


    const handleSendBroadcast = async () => {
        if (!broadcastMessage.trim()) {
            toast({ variant: 'destructive', title: 'Message Empty', description: 'Cannot send an empty broadcast message.' });
            return;
        }
        setIsSendingBroadcast(true);
        try {
            const broadcastsRef = collection(db, 'settings', 'global', 'broadcasts');
            const newBroadcastDoc = await addDoc(broadcastsRef, {
                message: broadcastMessage,
                sentAt: serverTimestamp(),
            });
            await fetchBroadcasts(); 

            const result = await updateGlobalSettings({
                broadcastMessageId: newBroadcastDoc.id,
                broadcastMessage: broadcastMessage,
            });

            if (result.success) {
                toast({ title: 'Broadcast Sent!', description: 'The message will be shown to teachers on their next login.' });
                setBroadcastMessage('');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Send Failed', description: error.message });
        } finally {
            setIsSendingBroadcast(false);
        }
    };
    
    const handleClearBroadcast = async () => {
        setIsSendingBroadcast(true);
        try {
            const result = await updateGlobalSettings({
                broadcastMessage: '',
                broadcastMessageId: '',
            });
            if (result.success) {
                setBroadcastMessage('');
                toast({ title: 'Broadcast Cleared', description: 'The announcement has been removed.' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Clear Failed', description: error.message });
        } finally {
            setIsSendingBroadcast(false);
        }
    };
    
    const handleDeleteBroadcast = async () => {
        if (!broadcastToDelete) return;
        setIsDeletingBroadcast(true);
        try {
            // Delete the specific broadcast document
            await deleteDoc(doc(db, 'settings', 'global', 'broadcasts', broadcastToDelete.id));

            // Check if we are deleting the *current* broadcast
            const settings = await getGlobalSettings();
            if (settings.broadcastMessageId === broadcastToDelete.id) {
                // Find the next latest message to set as current
                const remainingBroadcasts = broadcasts.filter(b => b.id !== broadcastToDelete.id);
                if (remainingBroadcasts.length > 0) {
                    await updateGlobalSettings({ 
                        broadcastMessageId: remainingBroadcasts[0].id,
                        broadcastMessage: remainingBroadcasts[0].message
                    });
                } else {
                    // No messages left, clear the main setting
                    await updateGlobalSettings({ broadcastMessageId: '', broadcastMessage: '' });
                }
            }
            
            toast({ title: "Broadcast Deleted" });
            setBroadcasts(prev => prev.filter(b => b.id !== broadcastToDelete.id));

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeletingBroadcast(false);
            setBroadcastToDelete(null);
        }
    };

    const handleFeedbackStatusChange = async (feedbackId: string, currentStatus: 'new' | 'addressed') => {
        const newStatus = currentStatus === 'new' ? 'addressed' : 'new';
        try {
            const feedbackRef = doc(db, 'feedback', feedbackId);
            await updateDoc(feedbackRef, { status: newStatus });
            setFeedback(prev => prev.map(item => item.id === feedbackId ? { ...item, status: newStatus } : item));
        } catch (error) {
            console.error("Error updating feedback status:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update feedback status.' });
        }
    };
    
    const handleDeleteFeedback = async () => {
        if (!feedbackToDelete) return;
        setIsDeletingFeedback(true);
        try {
            const result = await deleteFeedback(feedbackToDelete);
            if(result.success) {
                toast({ title: 'Feedback Deleted', description: 'The entry has been removed.' });
                setFeedback(prev => prev.filter(item => item.id !== feedbackToDelete));
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not delete the feedback entry.' });
        } finally {
            setIsDeletingFeedback(false);
            setFeedbackToDelete(null);
        }
    };
    
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeletingUser(true);
        try {
            if (userToDelete.type === 'teacher') {
                await deleteTeacherData(userToDelete.data.id!);
                toast({ title: 'Teacher Data Deleted', description: "The teacher's Firestore data has been removed. Their login account remains." });
            } else {
                await deleteStudentData((userToDelete.data as Student).teacherId, userToDelete.data.uid);
                toast({ title: 'Student Data Deleted', description: "The student's Firestore data has been removed. Their login account remains." });
            }
            await handleRefreshData(); // Refresh all data after deletion
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
        } finally {
            setIsDeletingUser(false);
            setUserToDelete(null);
        }
    };

    const handleOpenMessageCenter = (teacherId?: string) => {
        const teacher = teacherId ? sortedTeachers.find(t => t.id === teacherId) : null;
        setInitialTeacherToView(teacher || null);
        setIsMessageCenterOpen(true);
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        setIsMarkingRead(true);
        try {
            const result = await markAllAdminMessagesAsRead({ adminUid: user.uid });
            if (result.success) {
                toast({ title: "Success", description: result.message });
                // Optimistically update the UI while waiting for the listener to catch up
                setTeachers(prev => prev.map(t => ({ ...t, hasUnreadAdminMessages: false })));
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsMarkingRead(false);
        }
    };
    
    const handleDownloadBackup = async () => {
        setIsBackingUp(true);
        toast({ title: 'Backup Started', description: 'Generating and downloading hosting files. This may take a moment...' });
        try {
            const result = await downloadAndZipHostingFiles();
            if (result.success && result.downloadUrl) {
                toast({ title: 'Backup Ready!', description: 'Your download will begin shortly.' });
                // Trigger download
                const a = document.createElement('a');
                a.href = result.downloadUrl;
                a.download = `hosting-files-${new Date().toISOString().split('T')[0]}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                throw new Error(result.error || 'Failed to create backup.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Backup Failed', description: error.message });
        } finally {
            setIsBackingUp(false);
        }
    };
    
    const hasUnreadMessages = useMemo(() => teachers.some(t => t.hasUnreadAdminMessages), [teachers]);


    if (isLoading || !user) {
        return (
            <div className="flex min-h-screen w-full flex-col">
                <AdminHeader onOpenMessageCenter={() => handleOpenMessageCenter()} onMarkAllRead={handleMarkAllRead} isMarkingRead={isMarkingRead} hasUnreadMessages={hasUnreadMessages} />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <Skeleton className="h-10 w-1/3 mb-6" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                    </div>
                </main>
            </div>
        );
    }


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <AdminHeader 
                onOpenMessageCenter={() => handleOpenMessageCenter()} 
                hasUnreadMessages={hasUnreadMessages}
                onMarkAllRead={handleMarkAllRead}
                isMarkingRead={isMarkingRead}
            />
            <AdminMessageCenter
                isOpen={isMessageCenterOpen}
                onOpenChange={setIsMessageCenterOpen}
                admin={user}
                teachers={sortedTeachers}
                initialTeacher={initialTeacherToView}
                onConversationSelect={(teacher) => setInitialTeacherToView(teacher as Teacher)}
            />
            <main className="flex-1 p-4 md:p-6 lg:p-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 
                 <div className="lg:col-span-2 space-y-6">
                    {/* Maintenance Mode Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Power className="h-6 w-6 text-destructive" /> Maintenance Mode</CardTitle>
                            <CardDescription>Take the entire application offline for maintenance. Only whitelisted users will be able to log in.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Maintenance Mode</h4>
                                    <p className={cn("text-sm font-bold", isMaintenanceModeOn ? 'text-red-600' : 'text-green-600')}>
                                        {isMaintenanceModeOn ? 'ACTIVE' : 'INACTIVE'}
                                    </p>
                                </div>
                                <Switch
                                    checked={isMaintenanceModeOn}
                                    onCheckedChange={handleMaintenanceModeToggle}
                                    disabled={isSettingsLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maintenance-message">Maintenance Page Message</Label>
                                <Textarea
                                    id="maintenance-message"
                                    placeholder="Enter the message to display on the maintenance page..."
                                    value={maintenanceMessage}
                                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                                    rows={3}
                                    disabled={isSettingsLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="whitelist">Whitelist UIDs (comma-separated)</Label>
                                <Textarea
                                    id="whitelist"
                                    placeholder="Enter user UIDs..."
                                    value={maintenanceWhitelist}
                                    onChange={(e) => setMaintenanceWhitelist(e.target.value)}
                                    rows={3}
                                    disabled={isSettingsLoading}
                                />
                            </div>
                            <Button onClick={handleSaveMaintenanceSettings} disabled={isSettingsLoading}>
                                {isSettingsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                Save Maintenance Settings
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Admin Notepad */}
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Admin Notepad</CardTitle>
                                <CardDescription>Your private, persistent scratchpad.</CardDescription>
                            </div>
                            <Button onClick={handleSaveNotepad} disabled={isSavingNotepad || notepadContent === initialNotepadContent.current}>
                                {isSavingNotepad ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                Save
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isNotepadLoading ? <Skeleton className="h-40" /> : (
                                <Textarea
                                    placeholder="Jot down notes, to-do items, or reminders here..."
                                    value={notepadContent}
                                    onChange={(e) => setNotepadContent(e.target.value)}
                                    rows={8}
                                    disabled={isSavingNotepad}
                                />
                            )}
                        </CardContent>
                     </Card>
                    
                    {/* New Admin SDK Tester */}
                    <AdminSdkTester />

                    {/* Known Bugs Card */}
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Bug className="h-6 w-6 text-destructive" /> Known Bugs List</CardTitle>
                                <CardDescription>This content will be displayed to users on the feedback page.</CardDescription>
                            </div>
                            <Button onClick={handleSaveKnownBugs} disabled={isSavingKnownBugs || knownBugsContent === initialKnownBugsContent.current}>
                                {isSavingKnownBugs ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                Save Bugs
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isKnownBugsLoading ? <Skeleton className="h-40" /> : (
                                <Textarea
                                    placeholder="List known bugs here, one per line. Use markdown for formatting (e.g., - Bug description)."
                                    value={knownBugsContent}
                                    onChange={(e) => setKnownBugsContent(e.target.value)}
                                    rows={8}
                                    disabled={isSavingKnownBugs}
                                />
                            )}
                        </CardContent>
                     </Card>

                     {/* Upcoming Features Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Lightbulb className="h-6 w-6 text-yellow-500" /> Upcoming Features List</CardTitle>
                                <CardDescription>This content will be displayed on the "Request a Feature" page.</CardDescription>
                            </div>
                            <Button onClick={handleSaveUpcomingFeatures} disabled={isSavingUpcomingFeatures || upcomingFeaturesContent === initialUpcomingFeaturesContent.current}>
                                {isSavingUpcomingFeatures ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Features
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isUpcomingFeaturesLoading ? <Skeleton className="h-40" /> : (
                                <Textarea
                                    placeholder="List features currently being worked on."
                                    value={upcomingFeaturesContent}
                                    onChange={(e) => setUpcomingFeaturesContent(e.target.value)}
                                    rows={8}
                                    disabled={isSavingUpcomingFeatures}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Broadcast Message Card */}
                    <Collapsible>
                        <Card>
                            <CollapsibleTrigger asChild>
                                <div className="flex w-full cursor-pointer items-center justify-between p-6">
                                    <div className="flex items-center gap-2">
                                        <MessageCircle className="h-6 w-6 text-primary" />
                                        <div>
                                            <CardTitle>Broadcast to Teachers</CardTitle>
                                            <CardDescription>
                                                Send a pop-up message that all teachers will see on their next login.
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <ChevronDown className="h-6 w-6 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="space-y-4">
                                    <Textarea
                                        placeholder="Enter your announcement..."
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                        rows={4}
                                        disabled={isSendingBroadcast}
                                    />
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2">
                                            <Button onClick={handleSendBroadcast} disabled={isSendingBroadcast || !broadcastMessage.trim()}>
                                                {isSendingBroadcast ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                                Send Broadcast
                                            </Button>
                                            <Button variant="destructive" onClick={handleClearBroadcast} disabled={isSendingBroadcast}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Clear Current Broadcast
                                            </Button>
                                        </div>
                                    </div>
                                     <div className="pt-4 mt-4 border-t">
                                        <h4 className="font-semibold mb-2">Broadcast History</h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {broadcasts.map(b => (
                                                <div key={b.id} className="flex justify-between items-start p-2 border rounded-md">
                                                    <div>
                                                        <p className="text-sm whitespace-pre-wrap">{b.message}</p>
                                                        <p className="text-xs text-muted-foreground">{format(new Date(b.sentAt.seconds * 1000), 'PPp')}</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBroadcastToDelete(b)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CreditCard className="h-6 w-6 text-primary" /> Stripe Integration Test</CardTitle>
                            <CardDescription>Use this tool to test the payment flow with Stripe.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <p className="text-sm text-muted-foreground">This will open the Stripe checkout page in a new tab for a test product.</p>
                            <a href="https://buy.stripe.com/cNi28kbKE5LUdfG6kw1ZS00" target="_blank" rel="noopener noreferrer">
                               <Button>
                                   Test Purchase
                               </Button>
                            </a>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CreditCard className="h-6 w-6 text-blue-500" /> PayPal Subscription Test</CardTitle>
                            <CardDescription>Use this tool to test the PayPal subscription flow.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!isMessageCenterOpen && <PayPalTestButton />}
                        </CardContent>
                    </Card>
                    
                    <Collapsible>
                        <Card>
                             <CollapsibleTrigger asChild>
                                <div className="flex w-full cursor-pointer items-center justify-between p-6">
                                    <div className="flex items-center gap-2">
                                        <HelpCircle className="h-6 w-6 text-primary" />
                                        <div>
                                            <CardTitle>Help Content Editor</CardTitle>
                                            <CardDescription>
                                               Manage the content of the teacher and student help pages.
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <ChevronDown className="h-6 w-6 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                            </CollapsibleTrigger>
                             <CollapsibleContent>
                                <CardContent>
                                    <HelpArticleEditor />
                                </CardContent>
                             </CollapsibleContent>
                        </Card>
                    </Collapsible>


                    {/* Direct Prompt Interface */}
                    <DirectPromptInterface />

                    <Collapsible>
                        <Card>
                            <CollapsibleTrigger asChild>
                                <div className="flex w-full cursor-pointer items-center justify-between p-6">
                                    <div className='flex-grow'>
                                        <CardTitle>All Guilds</CardTitle>
                                        <CardDescription>A list of all registered teachers and their guilds. Click the guild name to view that teacher's dashboard.</CardDescription>
                                    </div>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="ml-4">
                                                <View className="mr-2 h-4 w-4" />
                                                View
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {Object.keys(columnVisibility).map((key) => (
                                                <DropdownMenuCheckboxItem
                                                    key={key}
                                                    checked={columnVisibility[key as keyof typeof columnVisibility]}
                                                    onCheckedChange={(checked) =>
                                                        setColumnVisibility(prev => ({ ...prev, [key]: checked }))
                                                    }
                                                >
                                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <ChevronDown className="h-6 w-6 transition-transform duration-200 group-data-[state=open]:rotate-180 ml-2" />
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead><Button variant="ghost" onClick={() => requestSort('className', 'teacher')}>Guild Name <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                    <TableHead><Button variant="ghost" onClick={() => requestSort('name', 'teacher')}>Leader (Teacher) <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                                    {columnVisibility.teacherUid && <TableHead>Teacher UID</TableHead>}
                                                    {columnVisibility.authEmail && <TableHead><Button variant="ghost" onClick={() => requestSort('email', 'teacher')}>Auth Email (from profile) <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>}
                                                    {columnVisibility.contactEmail && <TableHead><Button variant="ghost" onClick={() => requestSort('contactEmail', 'teacher')}>Contact Email <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>}
                                                    {columnVisibility.school && <TableHead><Button variant="ghost" onClick={() => requestSort('schoolName', 'teacher')}>School <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>}
                                                    {columnVisibility.studentCount && <TableHead><Button variant="ghost" onClick={() => requestSort('studentCount', 'teacher')}>Students <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>}
                                                    {columnVisibility.createdAt && <TableHead><Button variant="ghost" onClick={() => requestSort('createdAt', 'teacher')}>Date Created <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>}
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedTeachers.map((teacher) => (
                                                    <TableRow key={teacher.id}>
                                                        <TableCell>
                                                            <Link href={`/teacher/dashboard?teacherId=${teacher.id}`} className="font-semibold underline hover:text-primary">
                                                                {teacher.className}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>{teacher.name}</TableCell>
                                                        {columnVisibility.teacherUid && <TableCell className="font-mono text-xs">{teacher.id}</TableCell>}
                                                        {columnVisibility.authEmail && <TableCell>{teacher.email}</TableCell>}
                                                        {columnVisibility.contactEmail && <TableCell>{teacher.contactEmail}</TableCell>}
                                                        {columnVisibility.school && <TableCell>{teacher.schoolName}</TableCell>}
                                                        {columnVisibility.studentCount && <TableCell>{teacher.studentCount}</TableCell>}
                                                        {columnVisibility.createdAt && <TableCell>{teacher.createdAt ? format(teacher.createdAt, 'PP') : 'N/A'}</TableCell>}
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" onClick={() => setUserToDelete({ type: 'teacher', data: teacher })}>
                                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                    </Table>
                                    </div>
                                {teachers.length === 0 && !isLoading && (
                                    <div className="text-center py-10">
                                        <p className="text-muted-foreground">No teachers have registered yet.</p>
                                    </div>
                                )}
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                    <Accordion type="single" collapsible>
                        <Card>
                             <AccordionItem value="all-students-accordion" className="border-none">
                                <AccordionTrigger>
                                  <div className="flex w-full cursor-pointer items-center justify-between p-6">
                                      <div>
                                          <CardTitle>All Students</CardTitle>
                                          <CardDescription>A complete list of every student account in the system, grouped by guild.</CardDescription>
                                      </div>
                                      <ChevronDown className="h-6 w-6 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <CardContent>
                                    <Accordion type="multiple" className="w-full">
                                        {sortedTeachers.map(teacher => {
                                            const studentsOfTeacher = sortedStudentsByTeacher[teacher.id] || [];
                                            return (
                                                <AccordionItem value={teacher.id} key={teacher.id}>
                                                    <AccordionTrigger>
                                                        {teacher.className} ({teacher.name}) - {studentsOfTeacher.length} students
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Student Name</TableHead>
                                                                    <TableHead>Character</TableHead>
                                                                    <TableHead>Login Alias</TableHead>
                                                                    <TableHead>Date Created</TableHead>
                                                                    <TableHead>Last Login</TableHead>
                                                                    <TableHead>Actions</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {studentsOfTeacher.map(student => (
                                                                    <TableRow key={student.uid}>
                                                                        <TableCell>{student.studentName}</TableCell>
                                                                        <TableCell>{student.characterName}</TableCell>
                                                                        <TableCell className="font-mono">{student.studentId}</TableCell>
                                                                        <TableCell>{student.createdAt ? format(student.createdAt, 'PP') : 'N/A'}</TableCell>
                                                                        <TableCell>{student.lastLogin ? format(student.lastLogin, 'PPp') : 'Never'}</TableCell>
                                                                        <TableCell>
                                                                            <Button variant="ghost" size="icon" onClick={() => setUserToDelete({ type: 'student', data: student })}>
                                                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            )
                                        })}
                                        </Accordion>
                                    </CardContent>
                                </AccordionContent>
                             </AccordionItem>
                        </Card>
                    </Accordion>
                 </div>

                <div className="space-y-6 lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Global Settings</CardTitle>
                            <CardDescription>Control application-wide settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Student Registration</h4>
                                    <p className={cn("text-sm font-bold", isStudentRegistrationOpen ? 'text-green-600' : 'text-red-600')}>
                                        {isStudentRegistrationOpen ? 'ACTIVE' : 'DISABLED'}
                                    </p>
                                </div>
                                <Button onClick={handleToggleStudentRegistration} disabled={isSettingsLoading} size="icon">
                                    {isSettingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isStudentRegistrationOpen ? <ToggleRight className="h-6 w-6"/> : <ToggleLeft className="h-6 w-6"/>}
                                </Button>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Teacher Registration</h4>
                                    <p className={cn("text-sm font-bold", isTeacherRegistrationOpen ? 'text-green-600' : 'text-red-600')}>
                                        {isTeacherRegistrationOpen ? 'ACTIVE' : 'DISABLED'}
                                    </p>
                                </div>
                                <Button onClick={handleToggleTeacherRegistration} disabled={isSettingsLoading} size="icon">
                                    {isSettingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isTeacherRegistrationOpen ? <ToggleRight className="h-6 w-6"/> : <ToggleLeft className="h-6 w-6"/>}
                                </Button>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Refresh Data</h4>
                                    <p className="text-sm text-muted-foreground">Reload all dashboard info.</p>
                                </div>
                                <Button onClick={handleRefreshData} disabled={isLoading} size="icon">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Master Admin Tools</CardTitle>
                            <CardDescription>Tools for managing global assets.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <Button className="w-full justify-start" asChild>
                                <Link href="/admin/tools/global-forge">
                                    <Diamond className="mr-2 h-4 w-4" /> Global 2D Forge
                                </Link>
                            </Button>
                            <Button className="w-full justify-start" asChild>
                                <Link href="/admin/tools/2d-sizer">
                                    <Wrench className="mr-2 h-4 w-4" /> 2D Sizer
                                </Link>
                            </Button>
                             <Button className="w-full justify-start" asChild>
                                <Link href="/admin/tools/about-page-editor">
                                    <Edit className="mr-2 h-4 w-4" /> About Page Editor
                                </Link>
                            </Button>
                            <Button className="w-full justify-start" asChild>
                                <Link href="/admin/tools/inactive-accounts">
                                    <Users className="mr-2 h-4 w-4" /> Inactive Account Explorer
                                </Link>
                            </Button>
                            <Button className="w-full justify-start" asChild>
                                <Link href="/admin/tools/orphaned-accounts">
                                    <DatabaseZap className="mr-2 h-4 w-4" /> Orphaned Account Explorer
                                </Link>
                            </Button>
                            <Button onClick={handleDownloadBackup} disabled={isBackingUp} className="w-full justify-start">
                                {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                                Download Hosting Files
                            </Button>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Beta Features</CardTitle>
                            <CardDescription>Toggle experimental features.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Feedback Panel</h4>
                                    <p className={cn("text-sm font-bold", isFeedbackPanelVisible ? 'text-green-600' : 'text-red-600')}>
                                        {isFeedbackPanelVisible ? 'ACTIVE' : 'INACTIVE'}
                                    </p>
                                </div>
                                 <Button onClick={handleToggleFeedbackPanel} disabled={isSettingsLoading} size="icon">
                                    {isSettingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isFeedbackPanelVisible ? <ToggleRight className="h-6 w-6"/> : <ToggleLeft className="h-6 w-6"/>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Teacher Feedback</CardTitle>
                            <CardDescription>Bug reports and feature requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {feedback.length === 0 ? (
                                <p className="text-muted-foreground">No feedback yet.</p>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                    {feedback.map(item => (
                                        <div key={item.id} className="p-3 border rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-2 font-bold">
                                                         {item.feedbackType === 'bug' ? <Bug className="h-4 w-4 text-destructive" /> : <Lightbulb className="h-4 w-4 text-yellow-500" />}
                                                         <span>{item.feedbackType === 'bug' ? 'Bug' : 'Feature'}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        From: {item.teacherName || 'Anonymous'} ({item.teacherEmail || 'N/A'})
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <p className="text-xs text-muted-foreground">{format(new Date(item.createdAt.seconds * 1000), 'PPp')}</p>
                                                    <div className="flex items-center space-x-1">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFeedbackToDelete(item.id)}>
                                                            <Trash2 className="h-3 w-3 text-destructive" />
                                                        </Button>
                                                        <Checkbox
                                                            id={`feedback-${item.id}`}
                                                            checked={item.status === 'addressed'}
                                                            onCheckedChange={() => handleFeedbackStatusChange(item.id, item.status)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="mt-1 text-sm whitespace-pre-wrap">{item.message}</p>
                                            <Button variant="outline" size="sm" className="mt-2" onClick={() => handleOpenMessageCenter(item.teacherUid)}>
                                                <Reply className="mr-2 h-4 w-4"/> Reply
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Firestore Data?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all Firestore game data for{' '}
                                    <strong>{userToDelete && (userToDelete.type === 'teacher' ? (userToDelete.data as Teacher).name : (userToDelete.data as Student).characterName)}</strong>.
                                    Their login account will remain, but they will be removed from the game. This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeletingUser}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteUser} disabled={isDeletingUser} className="bg-destructive hover:bg-destructive/90">
                                    {isDeletingUser ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Yes, Delete Data Only'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog open={!!feedbackToDelete} onOpenChange={(isOpen) => !isOpen && setFeedbackToDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will permanently delete this feedback entry. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeletingFeedback}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteFeedback} disabled={isDeletingFeedback}>
                                    {isDeletingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog open={!!broadcastToDelete} onOpenChange={(isOpen) => !isOpen && setBroadcastToDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Broadcast?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this broadcast message? It will be removed from the history for all teachers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeletingBroadcast}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteBroadcast} disabled={isDeletingBroadcast} className="bg-destructive hover:bg-destructive/90">
                                    {isDeletingBroadcast ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </main>
        </div>
    );
}
