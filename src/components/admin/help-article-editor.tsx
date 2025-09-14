
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, Save, Loader2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import {
    createHelpArticle,
    updateHelpArticle,
    deleteHelpArticle,
    seedInitialHelpArticles,
} from '@/ai/flows/manage-help-articles';

export interface HelpArticle {
    id: string;
    title: string;
    content: string;
    audience: 'teacher' | 'student';
    videoUrl?: string;
    order: number;
}

export function HelpArticleEditor() {
    const { toast } = useToast();
    const [articles, setArticles] = useState<HelpArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    
    // Editor State
    const [editingArticle, setEditingArticle] = useState<Partial<HelpArticle> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const q = collection(db, 'content', 'help', 'articles');
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const articlesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpArticle))
                .sort((a, b) => a.order - b.order);
            setArticles(articlesData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const result = await seedInitialHelpArticles();
            if(result.success) {
                toast({ title: "Success", description: result.message });
            } else {
                throw new Error(result.error);
            }
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Seeding Failed', description: error.message });
        } finally {
            setIsSeeding(false);
        }
    }

    const handleSave = async () => {
        if (!editingArticle || !editingArticle.title || !editingArticle.content || !editingArticle.audience) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Title, Content, and Audience are required.' });
            return;
        }
        setIsSaving(true);
        try {
            if (editingArticle.id) { // Update
                const result = await updateHelpArticle(editingArticle as HelpArticle);
                if (!result.success) throw new Error(result.error);
                toast({ title: 'Article Updated' });
            } else { // Create
                 const result = await createHelpArticle(editingArticle as Omit<HelpArticle, 'id'>);
                if (!result.success) throw new Error(result.error);
                toast({ title: 'Article Created' });
            }
            setEditingArticle(null);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (articleId: string) => {
        try {
            const result = await deleteHelpArticle(articleId);
            if (!result.success) throw new Error(result.error);
            toast({ title: 'Article Deleted' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        }
    }

    const renderEditor = () => (
        <div className="p-4 border rounded-lg space-y-4">
            <h4 className="font-bold text-lg">{editingArticle?.id ? 'Edit Article' : 'Create New Article'}</h4>
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={editingArticle?.title || ''} onChange={e => setEditingArticle(prev => ({...prev, title: e.target.value}))} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea id="content" value={editingArticle?.content || ''} onChange={e => setEditingArticle(prev => ({...prev, content: e.target.value}))} rows={6} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="videoUrl">YouTube Video URL (Optional)</Label>
                <Input id="videoUrl" value={editingArticle?.videoUrl || ''} onChange={e => setEditingArticle(prev => ({...prev, videoUrl: e.target.value}))} />
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="audience">Audience</Label>
                    <select id="audience" value={editingArticle?.audience || ''} onChange={e => setEditingArticle(prev => ({...prev, audience: e.target.value as 'teacher' | 'student'}))} className="w-full p-2 border rounded-md">
                        <option value="" disabled>Select...</option>
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                    </select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="order">Display Order</Label>
                    <Input id="order" type="number" value={editingArticle?.order ?? articles.length} onChange={e => setEditingArticle(prev => ({...prev, order: Number(e.target.value)}))} />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditingArticle(null)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                </Button>
            </div>
        </div>
    );
    
    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin" />;

    return (
        <div className="space-y-4">
             {articles.length === 0 && (
                <div className="text-center p-4 border-dashed border-2 rounded-md">
                    <p className="text-muted-foreground">No help articles found in the database.</p>
                     <Button onClick={handleSeed} disabled={isSeeding} className="mt-2">
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Seed Initial Help Content
                    </Button>
                </div>
            )}
            {editingArticle ? renderEditor() : (
                 <Button onClick={() => setEditingArticle({ audience: 'teacher', order: articles.length })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Article
                </Button>
            )}
            <Accordion type="multiple" className="w-full">
                {articles.map(article => (
                    <AccordionItem value={article.id} key={article.id}>
                        <AccordionTrigger className="flex justify-between items-center">
                            <span className="font-semibold text-left">{article.title} ({article.audience})</span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2">
                            <p className="whitespace-pre-wrap">{article.content}</p>
                            {article.videoUrl && <p className="text-sm text-blue-500">Video: {article.videoUrl}</p>}
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => setEditingArticle(article)}><Edit className="mr-2 h-4 w-4"/> Edit</Button>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the article "{article.title}".</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(article.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    )
}
