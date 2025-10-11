
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth, app } from '@/lib/firebase';
import type { Mission } from '@/lib/missions';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import RichTextEditor from '@/components/teacher/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, Trash2, Download, Star, Coins, Link as LinkIcon } from 'lucide-react';
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

export default function EditMissionPage() {
    const router = useRouter();
    const params = useParams();
    const missionId = params.id as string;
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [mission, setMission] = useState<Partial<Mission> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [embedUrl, setEmbedUrl] = useState('');
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);
    const selectionRef = useRef<Range | null>(null);

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
                    toast({ variant: 'destructive', title: 'Not Found', description: 'This Mission does not exist.' });
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
    
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
                selectionRef.current = range.cloneRange();
            }
        }
    };

    const restoreSelection = () => {
        if (selectionRef.current) {
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(selectionRef.current);
        } else if (editorRef.current) {
            editorRef.current.focus();
        }
    };
    
    const handleConfirmEmbed = () => {
        if (!embedUrl) {
            toast({ variant: 'destructive', title: 'No URL Provided' });
            return;
        }

        let finalEmbedHtml = '';
        let finalEmbedUrl = embedUrl;

        const youtubeMatch = embedUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        
        if (youtubeMatch && youtubeMatch[1]) {
            finalEmbedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
            finalEmbedHtml = `<div style="text-align: center; margin: 2rem 0;"><div style="aspect-ratio: 16 / 9; max-width: 700px; margin: auto;"><iframe style="width: 100%; height: 100%; border-radius: 8px;" src="${finalEmbedUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
        } else if (/\.(jpeg|jpg|gif|png|webp)$/i.test(embedUrl)) {
            finalEmbedHtml = `<p style="text-align: center;"><img src="${embedUrl}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; display: inline-block;" /></p>`;
        } else if (embedUrl.includes('drive.google.com/file')) {
            finalEmbedUrl = embedUrl.replace('/view', '/preview');
        } else if (embedUrl.includes('docs.google.com/forms')) {
            finalEmbedUrl = embedUrl.replace('/viewform', '/viewform?embedded=true');
        } else if (embedUrl.includes('docs.google.com/presentation')) {
            finalEmbedUrl = embedUrl.replace('/edit', '/embed').replace('/pub', '/embed');
        } else if (embedUrl.includes('docs.google.com/document')) {
            finalEmbedUrl = embedUrl.replace('/edit', '/preview');
        }
        
        if (!finalEmbedHtml) {
            finalEmbedHtml = `<div style="position: relative; width: 100%; height: 0; padding-bottom: 75%;"><iframe src="${finalEmbedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe></div>`;
        }
        
        const embedBlock = `<p><br></p><p><br></p><p><br></p><p><br></p>${finalEmbedHtml}<p><br></p><p><br></p><p><br></p><p><br></p>`;
        
        restoreSelection();
        document.execCommand('insertHTML', false, embedBlock);

        if (editorRef.current) {
            handleFieldChange('content', editorRef.current.innerHTML);
        }

        setEmbedUrl('');
        toast({ title: 'Content Embedded!', description: 'The item has been added to the editor.' });
    };

    const handleFieldChange = (field: keyof Mission, value: any) => {
        setMission(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

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

    const handleDownloadPdf = () => {
        const contentHtml = mission?.content;
        if (!contentHtml) {
            toast({ variant: 'destructive', title: 'Error', description: 'No content to download.' });
            return;
        }
        
        const iframeMatch = contentHtml.match(/<iframe.*?src=["'](.*?)["']/);
        if (iframeMatch && iframeMatch[1]) {
            const iframeUrl = iframeMatch[1];
            const printWindow = window.open(iframeUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.focus();
                    printWindow.print();
                };
            } else {
                 toast({ variant: 'destructive', title: 'Popup Blocked', description: 'Could not open the content in a new tab. Please disable your popup blocker for this site.' });
            }
            return;
        }

        const pdf = new jsPDF('p', 'pt', 'a4');
        const margin = 40;
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pdfWidth - margin * 2;
        
        const completeHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Times, serif; font-size: 12pt; }
                    img, iframe { max-width: 100%; height: auto; }
                    blockquote { border-left: 2px solid #ccc; margin-left: 0; padding-left: 1rem; font-style: italic; }
                    h1, h2, h3, h4, h5, h6 { font-family: sans-serif; }
                </style>
            </head>
            <body>
                <h1>${mission.title || 'Mission'}</h1>
                ${contentHtml}
            </body>
            </html>
        `;

        pdf.html(completeHtml, {
            callback: function (doc) {
                doc.save(`${mission?.title || 'mission'}.pdf`);
            },
            x: margin,
            y: margin,
            width: contentWidth,
            windowWidth: contentWidth,
            autoPaging: 'text',
        });
    };

    const handleClearContent = () => {
        setMission(prev => prev ? { ...prev, content: '' } : null);
        setIsClearConfirmOpen(false);
        toast({ title: 'Content Cleared' });
    }

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
        <>
            <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will clear all content from the mission editor. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearContent} className="bg-destructive hover:bg-destructive/90">
                            Yes, Clear Content
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex justify-between items-center">
                            <Button variant="outline" onClick={() => router.push('/teacher/missions')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Missions
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => setIsClearConfirmOpen(true)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Clear Content
                                </Button>
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
                                        onChange={(e) => handleFieldChange('title', e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-4 p-4 border rounded-lg bg-secondary/50">
                                    <Label className="text-base font-semibold">Default Completion Rewards (Optional)</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="default-xp" className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400" /> Default XP</Label>
                                            <Input id="default-xp" type="number" value={mission.defaultXpReward ?? ''} onChange={e => handleFieldChange('defaultXpReward', Number(e.target.value))} placeholder="e.g., 100" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="default-gold" className="flex items-center gap-1"><Coins className="h-4 w-4 text-amber-500" /> Default Gold</Label>
                                            <Input id="default-gold" type="number" value={mission.defaultGoldReward ?? ''} onChange={e => handleFieldChange('defaultGoldReward', Number(e.target.value))} placeholder="e.g., 50" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">These will be auto-calculated in the grading view based on the percentage score, but you can always override them.</p>
                                </div>
                                <div className="space-y-2 p-4 border rounded-lg bg-secondary/50">
                                    <Label className="text-base font-semibold flex items-center gap-2"><LinkIcon className="h-4 w-4"/> Universal Embed</Label>
                                    <div className="flex items-center gap-2" onBlur={saveSelection}>
                                        <Input
                                            placeholder="Paste any URL (Google, YouTube, Image, etc.)..."
                                            value={embedUrl}
                                            onChange={(e) => setEmbedUrl(e.target.value)}
                                        />
                                        <Button onClick={handleConfirmEmbed} onMouseDown={(e) => e.preventDefault()}>Confirm Embed</Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">This will add the embedded item to the editor at your cursor's position.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Mission Content</Label>
                                    <RichTextEditor 
                                        ref={editorRef}
                                        value={mission.content || ''} 
                                        onChange={(value) => handleFieldChange('content', value)}
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-4">
                                    <Switch 
                                        id="is-assigned" 
                                        checked={mission.isAssigned} 
                                        onCheckedChange={(checked) => handleFieldChange('isAssigned', checked)}
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
        </>
    );
}
