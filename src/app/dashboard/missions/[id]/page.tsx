
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import type { Mission } from '@/lib/missions';
import type { Student } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Save, Send, Upload, File as FileIcon } from 'lucide-react';
import { saveMissionDraft, submitMission } from '@/ai/flows/manage-missions';
import { v4 as uuidv4 } from 'uuid';

interface SubmissionData {
    submissionContent: string;
    fileUrl?: string;
    status: 'draft' | 'submitted' | 'completed';
    submittedAt?: any;
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

    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    // Effect to get user and student data
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

    // Effect to fetch mission and submission data once student is loaded
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
                    
                    // Smart handling of embedded content
                    if (missionData.content.includes('<iframe')) {
                        const iframeSrcMatch = missionData.content.match(/<iframe.*?src=["'](.*?)["']/);
                        if (iframeSrcMatch && iframeSrcMatch[1]) {
                            window.open(iframeSrcMatch[1], '_blank');
                            toast({ title: "Assignment Opened", description: "Your assignment has been opened in a new tab. Please complete your work there, save it, and upload it here." });
                        }
                    }

                } else {
                    toast({ variant: 'destructive', title: 'Mission Not Found' });
                    router.push('/dashboard/missions');
                }

                const subRef = doc(db, 'teachers', student.teacherUid, 'missions', missionId, 'submissions', student.uid);
                const subSnap = await getDoc(subRef);
                if (subSnap.exists()) {
                    setSubmission(subSnap.data() as SubmissionData);
                } else {
                    // Initialize a new submission document if it doesn't exist
                    await setDoc(subRef, { status: 'draft', submissionContent: '', fileUrl: '' });
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
    
    const isSubmitted = submission.status === 'submitted';

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/dashboard/missions')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Missions
                    </Button>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-3xl font-headline">{mission.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className="prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: mission.content }}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Your Submission</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="submission-text">Your Written Response</Label>
                                <Textarea
                                    id="submission-text"
                                    rows={10}
                                    value={submission.submissionContent || ''}
                                    onChange={(e) => setSubmission(prev => ({...prev, submissionContent: e.target.value}))}
                                    placeholder="Type your response here..."
                                    disabled={isSubmitted}
                                />
                            </div>
                             <div>
                                <Label htmlFor="file-upload">Upload a File (Optional)</Label>
                                <Input 
                                    id="file-upload" 
                                    type="file" 
                                    onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)}
                                    disabled={isSubmitted}
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
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isSubmitted ? "Pending Review" : <Send className="mr-2 h-4 w-4" />}
                                {isSubmitted ? "Pending Review" : "Mark as Complete"}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
}
