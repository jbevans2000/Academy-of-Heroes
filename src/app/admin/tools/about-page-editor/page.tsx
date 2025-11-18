
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save, Eye } from 'lucide-react';
import { getAboutPageContent, updateAboutPageContent } from '@/ai/flows/manage-about-page';
import RichTextEditor from '@/components/teacher/rich-text-editor';

export default function AboutPageEditor() {
    const router = useRouter();
    const { toast } = useToast();
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                const pageContent = await getAboutPageContent();
                setContent(pageContent);
            } catch (error) {
                console.error("Failed to fetch content:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load page content.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, [toast]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateAboutPageContent(content);
            if (result.success) {
                toast({ title: 'Success', description: 'The About page has been updated.' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Dashboard
                        </Button>
                        <div className="flex gap-2">
                             <a href="/about" target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary">
                                    <Eye className="mr-2 h-4 w-4" /> Preview Live Page
                                </Button>
                            </a>
                             <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>About Page Content Editor</CardTitle>
                            <CardDescription>Use the editor below to modify the public "About the Academy" page. Changes will be live immediately after saving.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-64">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                </div>
                            ) : (
                                <RichTextEditor value={content} onChange={setContent} />
                            )}
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
        </div>
    );
}
