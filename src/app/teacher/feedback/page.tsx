
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Send, Bug, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitFeedback } from '@/ai/flows/submit-feedback';
import { DashboardHeader } from '@/components/dashboard/header';

function FeedbackFormComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const feedbackType = searchParams.get('type') === 'feature' ? 'feature' : 'bug';
    const from = searchParams.get('from') || 'teacher';

    const [user, setUser] = useState<User | null>(null);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    const handleSubmit = async () => {
        if (!user || !message.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Message cannot be empty.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await submitFeedback({ feedbackType, message });
            if (result.success) {
                toast({ title: 'Feedback Sent!', description: 'Thank you for helping us improve The Academy of Heroes.' });
                router.push(from === 'student' ? '/dashboard' : '/teacher/dashboard');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const pageDetails = {
        bug: {
            icon: <Bug className="h-12 w-12 text-destructive" />,
            title: 'Report a Bug',
            description: 'Encountered an issue or something not working as expected? Let us know the details so we can investigate.'
        },
        feature: {
            icon: <Lightbulb className="h-12 w-12 text-yellow-500" />,
            title: 'Request a Feature',
            description: 'Have a great idea for a new tool or improvement? We would love to hear your thoughts!'
        }
    }

    const details = pageDetails[feedbackType];
    const returnPath = from === 'student' ? '/dashboard' : '/teacher/dashboard';

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            {from === 'teacher' ? <TeacherHeader /> : <DashboardHeader />}
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push(returnPath)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>

                    <Card>
                        <CardHeader className="text-center">
                            {details.icon}
                            <CardTitle className="text-3xl">{details.title}</CardTitle>
                            <CardDescription>{details.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="feedback-message">Your Message</Label>
                                <Textarea
                                    id="feedback-message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={`Please be as detailed as possible. If reporting a bug, describe the steps to reproduce it.`}
                                    rows={10}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Submit
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

export default function FeedbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <FeedbackFormComponent />
        </Suspense>
    )
}
