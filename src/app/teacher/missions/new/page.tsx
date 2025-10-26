
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, app } from '@/lib/firebase';
import { saveMission } from '@/ai/flows/manage-missions';
import { useToast } from '@/hooks/use-toast';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/teacher/rich-text-editor';
import { ArrowLeft, Loader2, Save, Download, Star, Coins, Trash2, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import jsPDF from 'jspdf';
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
import { Textarea } from '@/components/ui/textarea';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { v4 as uuidv4 } from 'uuid';

export default function NewMissionPage() {
    const router = useRouter();
    const { toast } = useToast();
    const editorRef = useRef<TinyMCEEditor | null>(null);
    const [teacher, setTeacher] = useState<User | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isAssigned, setIsAssigned] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [defaultXp, setDefaultXp] = useState<number | ''>('');
    const [defaultGold, setDefaultGold] = useState<number | ''>('');
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [openInNewTab, setOpenInNewTab] = useState(false);
    
    // New state for image upload
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);


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
    
    const handleImageUpload = async () => {
        if (!imageFile || !teacher) return;
        setIsUploading(true);
        try {
            const storage = getStorage(app);
            const filePath = `mission-images/${teacher.uid}/${uuidv4()}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, imageFile);
            const downloadUrl = await getDownloadURL(storageRef);
            
            const imgHtml = `<p style="text-align: center;"><img src="${downloadUrl}" alt="Mission Image" style="width: 100%; height: auto; border-radius: 8px; display: inline-block;" /></p>`;
            
            setContent(prev => imgHtml + prev);
            toast({ title: 'Image Uploaded', description: 'The image has been added to the top of your mission content.' });
            setImageFile(null);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the image.' });
        } finally {
            setIsUploading(false);
        }
    };
    
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
                defaultXpReward: Number(defaultXp) || 0,
                defaultGoldReward: Number(defaultGold) || 0,
                openInNewTab,
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
    
    const handleDownloadPdf = () => {
        if (!content) {
            toast({ variant: 'destructive', title: 'Error', description: 'No content to download.' });
            return;
        }
        
        const iframeMatch = content.match(/<iframe.*?src=["'](.*?)["']/);
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
                <h1>${title || 'Mission'}</h1>
                ${content}
            </body>
            </html>
        `;

        pdf.html(completeHtml, {
            callback: function (doc) {
                doc.save(`${title || 'mission'}.pdf`);
            },
            x: margin,
            y: margin,
            width: contentWidth,
            windowWidth: contentWidth,
            autoPaging: 'text',
        });
    };

    const handleClearContent = () => {
        setContent('');
        setIsClearConfirmOpen(false);
        toast({ title: 'Content Cleared' });
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
                                <p className="text-red-500 font-bold">It is recommended you create missions in Google Docs or Similar Editor, then Copy/Paste into the Mission Content Field to Ensure Full Functionality</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Mission Title</Label>
                                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., The Mystery of the Missing Artifact" />
                                </div>
                                 <div className="space-y-4 p-4 border rounded-lg bg-secondary/50">
                                    <Label className="text-base font-semibold">Default Completion Rewards (Optional)</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="default-xp" className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400" /> Default XP</Label>
                                            <Input id="default-xp" type="number" value={defaultXp} onChange={e => setDefaultXp(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 100" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="default-gold" className="flex items-center gap-1"><Coins className="h-4 w-4 text-amber-500" /> Default Gold</Label>
                                            <Input id="default-gold" type="number" value={defaultGold} onChange={e => setDefaultGold(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 50" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">These will be auto-calculated in the grading view based on the percentage score, but you can always override them.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Mission Image (Optional)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="file" id="mission-image" className="max-w-xs" onChange={(e) => setImageFile(e.target.files?.[0] || null)} disabled={isUploading} />
                                        <Button onClick={handleImageUpload} disabled={!imageFile || isUploading}>
                                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Mission Content</Label>
                                    <RichTextEditor ref={editorRef} value={content} onChange={setContent} />
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch id="open-in-new-tab" checked={openInNewTab} onCheckedChange={setOpenInNewTab} />
                                    <Label htmlFor="open-in-new-tab">Open Embedded Content in New Tab</Label>
                                </div>
                                <p className="text-xs text-muted-foreground -mt-2">Recommended for interactive content like Google Forms, Docs, or external websites.</p>
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
        </>
    );
}
