
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveMission } from '@/ai/flows/manage-missions';
import { useToast } from '@/hooks/use-toast';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/teacher/rich-text-editor';
import { ArrowLeft, Loader2, Save, Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export default function NewMissionPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isAssigned, setIsAssigned] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

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

    const handleSave = async () => {
        if (!teacher) return;
        if (!title.trim() || !content.trim()) {
            toast({ variant: 'destructive', title: 'Missing Content', description: 'Please provide a title and content for the mission.' });
            return;
        }

        setIsSaving(true);
        try {
            const result = await saveMission(teacher.uid, {
                title,
                content,
                isAssigned,
            });

            if (result.success && result.id) {
                toast({ title: 'Mission Created!', description: 'Your new mission has been saved.' });
                router.push('/teacher/missions');
            } else {
                throw new Error(result.error || 'Failed to save the mission.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDownloadPdf = async () => {
        if (!contentRef.current) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find the content to download.' });
            return;
        }

        const editorContent = contentRef.current;
    
        try {
            const dataUrl = await toPng(editorContent, { 
                quality: 0.95,
                style: { margin: '0' } // Ensure no extra margins are added to the image
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

            pdf.save(`${title || 'mission'}.pdf`);
    
        } catch (error) {
            console.error('oops, something went wrong!', error);
            toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate the PDF.' });
        }
    };

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
                             <Button variant="secondary" onClick={handleDownloadPdf}>
                                <Download className="mr-2 h-4 w-4" /> Download as PDF
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Mission
                            </Button>
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Mission Editor</CardTitle>
                            <CardDescription>Create a new special mission for your students.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Mission Title</Label>
                                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., The Mystery of the Missing Artifact" />
                            </div>
                            <div className="space-y-2">
                                <Label>Mission Content</Label>
                                <RichTextEditor value={content} onChange={setContent} editorRef={contentRef} />
                            </div>
                             <div className="flex items-center space-x-2 pt-4">
                                <Switch id="is-assigned" checked={isAssigned} onCheckedChange={setIsAssigned} />
                                <Label htmlFor="is-assigned">{isAssigned ? "Assigned to Students" : "Saved as Draft"}</Label>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Mission
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
