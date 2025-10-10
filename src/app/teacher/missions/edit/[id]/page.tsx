
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Mission } from '@/lib/missions';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import RichTextEditor from '@/components/teacher/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, Trash2, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { saveMission, deleteMission } from '@/ai/flows/manage-missions';
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
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';


export default function EditMissionPage() {
    const router = useRouter();
    const params = useParams();
    const missionId = params.id as string;
    const { toast } = useToast();
    const contentRef = useRef<HTMLDivElement>(null);

    const [teacher, setTeacher] = useState<User | null>(null);
    const [mission, setMission] = useState<Partial<Mission> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                setTeacher(user);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!teacher || !missionId) return;

        const fetchMission = async () => {
            setIsLoading(true);
            try {
                const missionRef = doc(db, 'teachers', teacher.uid, 'missions', missionId);
                const docSnap = await getDoc(missionRef);
                if (docSnap.exists()) {
                    setMission({ id: docSnap.id, ...docSnap.data() });
                } else {
                    toast({ variant: 'destructive', title: 'Not Found' });
                    router.push('/teacher/missions');
                }
            } catch (error) {
                 toast({ variant: 'destructive', title: 'Error', description: 'Failed to load mission data.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchMission();
    }, [teacher, missionId, router, toast]);

    const handleSave = async () => {
        if (!teacher || !mission?.id) return;
        if (!mission.title || !mission.content) {
            toast({ variant: 'destructive', title: 'Missing Content', description: 'Title and content are required.' });
            return;
        }

        setIsSaving(true);
        try {
            const result = await saveMission(teacher.uid, mission as Mission);
            if (result.success) {
                toast({ title: 'Mission Updated!', description: 'Your changes have been saved.' });
                router.push('/teacher/missions');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!teacher || !mission?.id) return;
        setIsDeleting(true);
        try {
            const result = await deleteMission(teacher.uid, mission.id);
            if (result.success) {
                toast({ title: 'Mission Deleted', description: 'The mission has been permanently removed.' });
                router.push('/teacher/missions');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    }

    const handleDownloadPdf = async () => {
        if (!contentRef.current) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find the content to download.' });
            return;
        }
    
        const editorContentElement = contentRef.current;
    
        try {
            const dataUrl = await toPng(editorContentElement, { 
                quality: 0.95,
                pixelRatio: 2, // Increase resolution
                style: { margin: '0' }
            });
    
            const pdf = new jsPDF('p', 'px', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(dataUrl);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`${mission?.title || 'mission'}.pdf`);
    
        } catch (error) {
            console.error('oops, something went wrong!', error);
            toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate the PDF.' });
        }
    };


    if (isLoading || !mission) {
         return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                     <div className="max-w-4xl mx-auto space-y-6">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                     <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => router.push('/teacher/missions')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Missions
                        </Button>
                        <div className="flex gap-2">
                             <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Mission
                            </Button>
                             <Button variant="secondary" onClick={handleDownloadPdf}>
                                <Download className="mr-2 h-4 w-4" /> Download as PDF
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Edit Mission</CardTitle>
                            <CardDescription>Update the details of your special mission.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="title">Mission Title</Label>
                                <Input 
                                    id="title" 
                                    value={mission.title || ''} 
                                    onChange={(e) => setMission(prev => ({...prev, title: e.target.value}))} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Mission Content</Label>
                                <RichTextEditor 
                                    value={mission.content || ''} 
                                    onChange={(value) => setMission(prev => ({...prev, content: value}))}
                                    ref={contentRef}
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-4">
                                <Switch 
                                    id="is-assigned" 
                                    checked={mission.isAssigned} 
                                    onCheckedChange={(checked) => setMission(prev => ({...prev, isAssigned: checked}))}
                                />
                                <Label htmlFor="is-assigned">{mission.isAssigned ? "Assigned to Students" : "Saved as Draft"}</Label>
                            </div>
                        </CardContent>
                    </Card>
                     <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </main>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the mission "{mission.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Mission
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
