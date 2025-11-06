
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import { sendGuildHallMessage } from '@/ai/flows/manage-messages';
import { cn } from '@/lib/utils';
import { ClientOnlyTime } from '@/components/client-only-time';
import type { Company, Student } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface GuildHallMessage {
    id: string;
    text: string;
    senderName: string;
    senderUid: string;
    isTeacher: boolean;
    companyId?: string;
    timestamp: any; // Firestore ServerTimestamp
}

export default function GuildHallPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [teacherData, setTeacherData] = useState<{ name: string, isChatEnabled?: boolean } | null>(null);
    const [messages, setMessages] = useState<GuildHallMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    
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
        if (!teacher) return;
        
        const teacherRef = doc(db, 'teachers', teacher.uid);
        const unsubTeacher = onSnapshot(teacherRef, (docSnap) => {
            if (docSnap.exists()) {
                setTeacherData(docSnap.data() as { name: string, isChatEnabled?: boolean });
            }
        });
        
        const messagesQuery = query(collection(db, 'teachers', teacher.uid, 'guildHallMessages'), orderBy('timestamp', 'asc'));
        const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuildHallMessage)));
            setIsLoading(false);
        });

        const companiesQuery = query(collection(db, 'teachers', teacher.uid, 'companies'));
        const unsubCompanies = onSnapshot(companiesQuery, (snapshot) => {
            setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
        });

        return () => {
            unsubTeacher();
            unsubMessages();
            unsubCompanies();
        };

    }, [teacher]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !teacher || !teacherData) return;
        
        setIsSending(true);
        try {
            await sendGuildHallMessage({
                teacherUid: teacher.uid,
                senderUid: teacher.uid,
                senderName: teacherData.name,
                text: newMessage,
                isTeacher: true,
                companyId: 'teacher',
            });
            setNewMessage('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
        } finally {
            setIsSending(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleToggleChat = async (enabled: boolean) => {
        if (!teacher) return;
        const teacherRef = doc(db, 'teachers', teacher.uid);
        await updateDoc(teacherRef, { isChatEnabled: enabled });
        toast({ title: `Chat is now ${enabled ? 'ENABLED' : 'DISABLED'}` });
    };
    
    const getCompanyColor = (companyId?: string): string => {
        if (!companyId) return 'bg-gray-200';
        const company = companies.find(c => c.id === companyId);
        return company?.color ? '' : 'bg-gray-200'; // Return empty string if color is HSL
    };

    const getCompanyStyle = (companyId?: string): React.CSSProperties => {
        if (!companyId) return {};
        const company = companies.find(c => c.id === companyId);
        return company?.color ? { backgroundColor: company.color } : {};
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Podium
                        </Button>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="chat-enabled"
                                checked={teacherData?.isChatEnabled ?? true}
                                onCheckedChange={handleToggleChat}
                            />
                            <Label htmlFor="chat-enabled">Chat Enabled for Students</Label>
                        </div>
                    </div>
                    <Card className="h-[75vh] flex flex-col">
                        <CardHeader>
                            <CardTitle>The Guild Hall</CardTitle>
                            <CardDescription>A place for all guild members to communicate.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow overflow-hidden flex flex-col">
                            <ScrollArea className="flex-grow pr-4 -mr-4">
                                <div className="space-y-4">
                                    {isLoading ? (
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                    ) : messages.length === 0 ? (
                                        <p className="text-center text-muted-foreground">The hall is quiet... be the first to speak!</p>
                                    ) : (
                                        messages.map(msg => (
                                            <div key={msg.id} className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full flex-shrink-0" style={getCompanyStyle(msg.companyId)} />
                                                <div className="flex-grow">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-bold">{msg.senderName}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {msg.timestamp && <ClientOnlyTime date={new Date(msg.timestamp.seconds * 1000)} />}
                                                        </span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                     <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>
                            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 pt-4 border-t">
                                <Textarea 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Send a message to the guild..."
                                    rows={1}
                                    disabled={isSending}
                                />
                                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
