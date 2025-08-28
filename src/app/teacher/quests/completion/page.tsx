
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

import type { Student } from '@/lib/data';
import type { QuestCompletionRequest } from '@/lib/quests';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, X, Loader2, Bell } from 'lucide-react';
import { getQuestSettings, updateQuestSettings, approveChapterCompletion, denyChapterCompletion, approveAllPending } from '@/ai/flows/manage-quests';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ManageQuestCompletionPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [pendingRequests, setPendingRequests] = useState<QuestCompletionRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Settings State
    const [globalApproval, setGlobalApproval] = useState(false);
    const [isDailyLimitEnabled, setIsDailyLimitEnabled] = useState(true);
    const [studentOverrides, setStudentOverrides] = useState<{ [uid: string]: boolean }>({});
    const [isUpdating, setIsUpdating] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) setTeacher(user);
            else router.push('/teacher/login');
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!teacher) return;

        const fetchSettings = async () => {
            setIsLoading(true);
            const settings = await getQuestSettings(teacher.uid);
            setGlobalApproval(settings.globalApprovalRequired);
            setIsDailyLimitEnabled(settings.isDailyLimitEnabled);
            setStudentOverrides(settings.studentOverrides || {});
        };

        fetchSettings();

        const studentsQuery = query(collection(db, 'teachers', teacher.uid, 'students'), orderBy('studentName'));
        const unsubStudents = onSnapshot(studentsQuery, snapshot => {
            setStudents(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));
            setIsLoading(false);
        });

        const requestsQuery = query(collection(db, 'teachers', teacher.uid, 'pendingQuestRequests'), orderBy('requestedAt', 'desc'));
        const unsubRequests = onSnapshot(requestsQuery, snapshot => {
            setPendingRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestCompletionRequest)));
        });

        return () => {
            unsubStudents();
            unsubRequests();
        };

    }, [teacher]);

    const handleGlobalApprovalToggle = async (checked: boolean) => {
        if (!teacher) return;
        setIsUpdating(true);
        setGlobalApproval(checked);
        setStudentOverrides({});
        
        const result = await updateQuestSettings(teacher.uid, { 
            globalApprovalRequired: checked,
            studentOverrides: {}
        });

        if (!result.success) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
            setGlobalApproval(!checked);
        } else {
             toast({ title: 'Global Setting Updated', description: 'All student settings have been aligned to the new global default.' });
        }
        setIsUpdating(false);
    };

    const handleDailyLimitToggle = async (checked: boolean) => {
        if (!teacher) return;
        setIsUpdating(true);
        setIsDailyLimitEnabled(checked);
        const result = await updateQuestSettings(teacher.uid, { isDailyLimitEnabled: checked });
        if (!result.success) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
            setIsDailyLimitEnabled(!checked);
        } else {
            toast({ title: 'Gameplay Setting Updated', description: `Daily limit is now ${checked ? 'ON' : 'OFF'}.` });
        }
        setIsUpdating(false);
    }

    const handleStudentToggle = async (studentUid: string, checked: boolean) => {
        if (!teacher) return;
        
        const originalOverrides = { ...studentOverrides };
        const newOverrides = { ...studentOverrides };

        if (checked === globalApproval) {
            delete newOverrides[studentUid];
        } else {
            newOverrides[studentUid] = checked;
        }

        setStudentOverrides(newOverrides);
        setIsUpdating(true);
        const result = await updateQuestSettings(teacher.uid, { studentOverrides: newOverrides });
         if (!result.success) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
            setStudentOverrides(originalOverrides);
        }
        setIsUpdating(false);
    };

    const handleRequest = async (requestId: string, approve: boolean) => {
        if (!teacher) return;
        setIsProcessing(requestId);
        try {
            const result = approve
                ? await approveChapterCompletion({ teacherUid: teacher.uid, requestId })
                : await denyChapterCompletion(teacher.uid, requestId);
            
            if (result.success) {
                toast({ title: 'Success', description: result.message });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsProcessing(null);
        }
    };
    
    const handleApproveAll = async () => {
        if (!teacher || pendingRequests.length === 0) return;
        setIsProcessing('all');
        try {
            const result = await approveAllPending(teacher.uid);
             if (result.success) {
                toast({ title: 'All Approved!', description: `${result.count} request(s) have been approved.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsProcessing(null);
        }
    }

    if (isLoading) {
        return (
             <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin" /></main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Podium
                    </Button>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Global Gameplay Settings</CardTitle>
                            <CardDescription>These rules apply to all students unless individually overridden.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex items-center space-x-2">
                                <Switch id="global-approval" checked={globalApproval} onCheckedChange={handleGlobalApprovalToggle} disabled={isUpdating} />
                                <Label htmlFor="global-approval">{globalApproval ? "Approval Required to Advance Chapters" : "Students Can Advance Freely"}</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Switch id="daily-limit" checked={isDailyLimitEnabled} onCheckedChange={handleDailyLimitToggle} disabled={isUpdating} />
                                <Label htmlFor="daily-limit">{isDailyLimitEnabled ? "Enforce 1 Chapter Completion Per Day" : "Daily Limit is OFF"}</Label>
                            </div>
                            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>Individual Student Overrides</CardTitle>
                                <CardDescription>Override the global approval setting for specific students.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                                {students.map(student => {
                                    const hasOverride = studentOverrides.hasOwnProperty(student.uid);
                                    const isRestricted = hasOverride ? studentOverrides[student.uid] : globalApproval;
                                    
                                    return (
                                        <div key={student.uid} className="flex items-center justify-between p-2 border rounded-md">
                                            <div>
                                                <p className="font-semibold">{student.studentName}</p>
                                                <p className="text-sm text-muted-foreground">{student.characterName}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={cn('text-xs font-semibold', isRestricted ? 'text-destructive' : 'text-green-700')}>
                                                     {isRestricted ? 'Restricted' : 'Standard'}
                                                </span>
                                                <Switch 
                                                    checked={hasOverride} 
                                                    onCheckedChange={(checked) => handleStudentToggle(student.uid, checked ? !globalApproval : globalApproval)}
                                                    disabled={isUpdating}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Bell className={pendingRequests.length > 0 ? "text-primary animate-pulse" : ""} /> Pending Requests</CardTitle>
                                <CardDescription>Students waiting for approval to advance.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                 {pendingRequests.length > 0 && (
                                     <Button onClick={handleApproveAll} disabled={isProcessing === 'all'}>
                                        {isProcessing === 'all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                        Approve All ({pendingRequests.length})
                                    </Button>
                                 )}
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                {pendingRequests.length === 0 && <p className="text-muted-foreground text-center py-8">No pending requests.</p>}
                                {pendingRequests.map(req => (
                                    <div key={req.id} className="p-3 border rounded-lg bg-secondary/50">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-grow">
                                                <p className="font-bold">{req.characterName}</p>
                                                <p className="text-sm">wants to complete: <span className="font-semibold">{req.chapterTitle}</span></p>
                                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(req.requestedAt.seconds * 1000), { addSuffix: true })}</p>
                                                 {req.quizScore !== undefined && <p className="text-sm font-semibold">Quiz Score: {req.quizScore}%</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="destructive" onClick={() => handleRequest(req.id, false)} disabled={!!isProcessing}>
                                                    {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4"/>}
                                                </Button>
                                                <Button size="icon" className="bg-green-600 hover:bg-green-700" onClick={() => handleRequest(req.id, true)} disabled={!!isProcessing}>
                                                     {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4"/>}
                                                </Button>
                                            </div>
                                        </div>
                                        {req.quizAnswers && (
                                            <Accordion type="single" collapsible className="w-full mt-2">
                                                <AccordionItem value="item-1">
                                                    <AccordionTrigger className="text-sm">View Quiz Answers</AccordionTrigger>
                                                    <AccordionContent>
                                                        <ul className="space-y-2 text-xs">
                                                            {req.quizAnswers.map((answer, i) => (
                                                                <li key={i} className={cn("p-2 rounded-md", answer.isCorrect ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30")}>
                                                                    <p className="font-bold">{answer.question}</p>
                                                                    <p>Student answered: <span className="font-semibold">{answer.studentAnswer}</span></p>
                                                                    {!answer.isCorrect && <p>Correct answer: <span className="font-semibold">{answer.correctAnswer}</span></p>}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        )}
                                    </div>
                                ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </main>
        </div>
    );
}
