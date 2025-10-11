
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, CheckCircle, Loader2, RotateCcw, ArrowRight, Maximize, Save, Send, File as FileIcon, Star, Coins } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, app } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Mission } from '@/lib/missions';
import type { Student } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { saveMissionDraft, submitMission } from '@/ai/flows/manage-missions';
import RichTextEditor from '@/components/teacher/rich-text-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { DashboardHeader } from '@/components/dashboard/header';

interface SubmissionData {
    submissionContent: string;
    fileUrl?: string;
    status: 'draft' | 'submitted' | 'completed';
    submittedAt?: any;
    grade?: string;
    feedback?: string;
    xpAwarded?: number;
    goldAwarded?: number;
}

export default function StudentMissionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const missionId = params.id as string;
    const { toast } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [mission, setMission] = useState<Mission | null>(null);
    const [submission, setSubmission] = useState<Partial<SubmissionData>>({ submissionContent: '', fileUrl: '', status: 'draft' });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [showEmbedInstructionsAlert, setShowEmbedInstructionsAlert] = useState(false);
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);

    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const studentMetaRef = doc(db, 'students', currentUser.uid);
                const metaSnap = await getDoc(studentMetaRef);
                if (metaSnap.exists()) {
                    const teacherUid = metaSnap.data().teacherUid;
                    const studentRef = doc(db, 'teachers', teacherUid, 'students', currentUser.uid);
                    const studentSnap = await getDoc(studentRef);
                    if (studentSnap.exists()) {
                        setStudent({ uid: studentSnap.id, teacherUid, ...studentSnap.data() } as Student);
                    }
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not find your student data.' });
                    router.push('/dashboard');
                }
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router, toast]);

    useEffect(() => {
        if (!student?.teacherUid || !missionId) return;

        const fetchMissionAndSubmission = async () => {
            setIsLoading(true);
            try {
                const missionRef = doc(db, 'teachers', student.teacherUid, 'missions', missionId);
                const missionSnap = await getDoc(missionRef);
                if (missionSnap.exists()) {
                    const missionData = { id: missionSnap.id, ...missionSnap.data() } as Mission;
                    setMission(missionData);
                    
                    const subRef = doc(db, 'teachers', student.teacherUid, 'missions', missionId, 'submissions', student.uid);
                    const subSnap = await getDoc(subRef);
                    let submissionData;
                    if (subSnap.exists()) {
                        submissionData = subSnap.data() as SubmissionData;
                        setSubmission(submissionData);
                    } else {
                        await setDoc(subRef, { status: 'draft', submissionContent: '', fileUrl: '' });
                        submissionData = { status: 'draft' };
                    }
                    
                    if (missionData.openInNewTab && missionData.content.includes('<iframe') && submissionData.status !== 'completed') {
                        const iframeSrcMatch = missionData.content.match(/<iframe.*?src=["'](.*?)["']/);
                        if (iframeSrcMatch && iframeSrcMatch[1]) {
                            const url = iframeSrcMatch[1];
                            setEmbedUrl(url);
                            if(!sessionStorage.getItem(`tab_opened_${missionId}`)) {
                                window.open(url, '_blank');
                                sessionStorage.setItem(`tab_opened_${missionId}`, 'true');
                            }
                            setShowEmbedInstructionsAlert(true);
                        }
                    }

                } else {
                    toast({ variant: 'destructive', title: 'Mission Not Found' });
                    router.push('/dashboard/missions');
                }

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load mission data.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchMissionAndSubmission();
    }, [student, missionId, router, toast]);

    const handleSaveDraft = async () => {
        if (!student?.teacherUid || !missionId) return;
        setIsSaving(true);
        try {
            let uploadedFileUrl = submission.fileUrl;
            if (fileToUpload) {
                const storage = getStorage(app);
                const filePath = `missions/${student.teacherUid}/${missionId}/${student.uid}/${fileToUpload.name}-${uuidv4()}`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, fileToUpload);
                uploadedFileUrl = await getDownloadURL(fileRef);
            }
            
            const result = await saveMissionDraft({
                teacherUid: student.teacherUid,
                studentUid: student.uid,
                missionId,
                submissionContent: submission.submissionContent || '',
                fileUrl: uploadedFileUrl
            });
            if (result.success) {
                toast({ title: 'Draft Saved!' });
                if(uploadedFileUrl) setSubmission(prev => ({...prev, fileUrl: uploadedFileUrl}));
                setFileToUpload(null);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmitMission = async () => {
        if (!student?.teacherUid || !missionId) return;
        if (!submission.submissionContent?.trim() && !fileToUpload && !submission.fileUrl) {
            toast({ variant: 'destructive', title: 'Empty Submission', description: 'You must either write a response or upload a file.' });
            return;
        }

        setIsSubmitting(true);
        try {
            let uploadedFileUrl = submission.fileUrl;
            if (fileToUpload) {
                 const storage = getStorage(app);
                const filePath = `missions/${student.teacherUid}/${missionId}/${student.uid}/${fileToUpload.name}-${uuidv4()}`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, fileToUpload);
                uploadedFileUrl = await getDownloadURL(fileRef);
            }
            
            const result = await submitMission({
                teacherUid: student.teacherUid,
                studentUid: student.uid,
                missionId,
                submissionContent: submission.submissionContent || '',
                fileUrl: uploadedFileUrl
            });
            if (result.success) {
                toast({ title: 'Mission Submitted!', description: 'Your Guild Leader has been notified.' });
                setSubmission(prev => ({...prev, status: 'submitted'}));
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || !mission || !student) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const isCompleted = submission.status === 'completed';
    const isSubmitted = submission.status === 'submitted' || submission.status === 'completed';
    
    const showMissionContent = !isCompleted || !(mission.openInNewTab && mission.content.includes('<iframe'));
    const submissionContentHtml = submission.submissionContent 
        ? submission.submissionContent
        : (mission.openInNewTab && mission.content.includes('<iframe'))
        ? '<p class="text-muted-foreground">This was an embedded assignment. Please view the student\'s submitted file to see their work.</p>'
        : '<p class="text-muted-foreground">No written response submitted.</p>';

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/dashboard/missions')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Missions
                    </Button>
                    
                    {showEmbedInstructionsAlert && (
                        <Alert variant="default" className="bg-yellow-100/90 border-yellow-500 text-yellow-900 dark:bg-yellow-900/80 dark:text-yellow-100">
                            <AlertTitle className="text-2xl font-bold text-black">External Assignment Instructions</AlertTitle>
                            <p className="text-lg text-black">
                                Please Complete this Mission on the Second Browser Tab that Just opened. When complete, please press Control + P, and SAVE the mission as a PDF file. Upload your PDF file for your Guild Leader's review using the upload box below!
                                <br/><br/>
                                If you closed the tab by mistake, you can reopen it by{' '}
                                <a href={embedUrl!} target="_blank" rel="noopener noreferrer" className="font-bold underline text-blue-800">
                                    clicking HERE.
                                </a>
                            </p>
                        </Alert>
                    )}

                    {isCompleted && mission.openInNewTab && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-3xl font-headline">{mission.title}</CardTitle>
                            </CardHeader>
                        </Card>
                    )}

                    {showMissionContent && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-3xl font-headline">{mission.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="relative">
                                {(showEmbedInstructionsAlert && !isCompleted) && <div className="absolute inset-0 bg-white/70 dark:bg-black/70 z-10" />}
                                <div
                                    className="prose dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: mission.content }}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {isCompleted ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Graded Report</CardTitle>
                                <CardDescription>Your Guild Leader has reviewed your submission.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-2 bg-secondary rounded-lg">
                                        <p className="text-sm font-medium text-muted-foreground">Grade</p>
                                        <p className="text-2xl font-bold">{submission.grade || 'N/A'}</p>
                                    </div>
                                     <div className="p-2 bg-secondary rounded-lg">
                                        <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><Star className="h-4 w-4 text-yellow-400"/> XP Awarded</p>
                                        <p className="text-2xl font-bold">{submission.xpAwarded || 0}</p>
                                    </div>
                                     <div className="p-2 bg-secondary rounded-lg">
                                        <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><Coins className="h-4 w-4 text-amber-500"/> Gold Awarded</p>
                                        <p className="text-2xl font-bold">{submission.goldAwarded || 0}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Feedback from your Guild Leader:</h4>
                                    <div className="prose dark:prose-invert max-w-none mt-2 border p-4 rounded-md bg-background" dangerouslySetInnerHTML={{ __html: submission.feedback || '<p>No feedback provided.</p>'}} />
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold">Your Submitted File:</h4>
                                    {submission.fileUrl ? (
                                        <Button asChild variant="link" className="mt-2 text-lg">
                                            <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">View Your Submission</a>
                                        </Button>
                                    ) : (
                                        <p className="text-muted-foreground mt-2">You did not submit a file.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Submission</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className={cn(mission.openInNewTab && mission.content.includes('<iframe') && 'opacity-50 pointer-events-none')}>
                                    <Label htmlFor="submission-text">Your Written Response</Label>
                                    <RichTextEditor
                                        value={submission.submissionContent || ''}
                                        onChange={(value) => setSubmission(prev => ({...prev, submissionContent: value}))}
                                        disabled={isSubmitted || isSaving || (mission.openInNewTab && mission.content.includes('<iframe'))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="file-upload">Upload a File (Optional)</Label>
                                    <Input 
                                        id="file-upload" 
                                        type="file" 
                                        onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)}
                                        disabled={isSubmitted || isSaving}
                                    />
                                    {(fileToUpload || submission.fileUrl) && (
                                        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                                            <FileIcon className="h-4 w-4" />
                                            <span>Current file: {fileToUpload?.name || submission.fileUrl?.split('%2F').pop()?.split('?')[0]}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                 <Button variant="secondary" onClick={handleSaveDraft} disabled={isSaving || isSubmitted}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Draft
                                </Button>
                                <Button onClick={handleSubmitMission} disabled={isSubmitting || isSubmitted}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    {isSubmitted ? "Submitted" : "Mark as Complete"}
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
