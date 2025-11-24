
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
import { Loader2, Send, ArrowLeft, ShieldAlert, Trash2, Download, Users } from 'lucide-react';
import { sendGuildHallMessage, clearGuildHallChat } from '@/ai/flows/manage-messages';
import { cn } from '@/lib/utils';
import { ClientOnlyTime } from '@/components/client-only-time';
import type { Company, Student, Teacher } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import jsPDF from 'jspdf';
import Image from 'next/image';


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
    const [user, setUser] = useState<User | null>(null);
    const [teacherData, setTeacherData] = useState<Teacher | null>(null);
    const [mainTeacherUid, setMainTeacherUid] = useState<string | null>(null);
    const [messages, setMessages] = useState<GuildHallMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isClearing, setIsClearing] = useState(false);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const teacherDocRef = doc(db, 'teachers', currentUser.uid);
                const teacherDocSnap = await getDoc(teacherDocRef);
                if (teacherDocSnap.exists()) {
                    const data = teacherDocSnap.data();
                    setTeacherData({ id: teacherDocSnap.id, ...data } as Teacher);
                    if (data.accountType === 'co-teacher' && data.mainTeacherUid) {
                        setMainTeacherUid(data.mainTeacherUid);
                    } else {
                        setMainTeacherUid(currentUser.uid);
                    }
                }
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!mainTeacherUid) return;

        const unsubscribers: (() => void)[] = [];

        const mainTeacherRef = doc(db, 'teachers', mainTeacherUid);
        unsubscribers.push(onSnapshot(mainTeacherRef, (docSnap) => {
             if (docSnap.exists()) {
                // We read settings from the main teacher, but the local teacherData holds the logged-in user's name
                const mainData = docSnap.data();
                setTeacherData(prev => ({
                    ...prev!,
                    isChatEnabled: mainData.isChatEnabled,
                    isCompanyChatActive: mainData.isCompanyChatActive,
                }));
            }
        }));

        const messagesQuery = query(collection(db, 'teachers', mainTeacherUid, 'guildHallMessages'), orderBy('timestamp', 'asc'));
        unsubscribers.push(onSnapshot(messagesQuery, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuildHallMessage)));
            setIsLoading(false);
        }));

        const companiesQuery = query(collection(db, 'teachers', mainTeacherUid, 'companies'));
        unsubscribers.push(onSnapshot(companiesQuery, (snapshot) => {
            setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
        }));

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };

    }, [mainTeacherUid]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user || !teacherData || !mainTeacherUid) return;
        
        setIsSending(true);
        try {
            await sendGuildHallMessage({
                teacherUid: mainTeacherUid, // Post to main teacher's hall
                senderUid: user.uid, // But as the logged-in user
                senderName: teacherData.characterName || teacherData.name,
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

    const handleToggleSetting = async (field: 'isChatEnabled' | 'isCompanyChatActive', enabled: boolean) => {
        if (!mainTeacherUid) return;
        const mainTeacherRef = doc(db, 'teachers', mainTeacherUid);
        await updateDoc(mainTeacherRef, { [field]: enabled });
        let featureName = field === 'isChatEnabled' ? 'Chat' : 'Company Chat';
        toast({ title: `${featureName} is now ${enabled ? 'ENABLED' : 'DISABLED'}` });
    };
    
     const handleClearChat = async () => {
        if (!mainTeacherUid) return;
        setIsClearing(true);
        try {
            const result = await clearGuildHallChat({ teacherUid: mainTeacherUid });
            if (result.success) {
                toast({ title: "Chat Cleared", description: result.message });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsClearing(false);
        }
    }
    
    const handleDownloadChat = () => {
        const doc = new jsPDF();
        let y = 15;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;

        doc.setFontSize(16);
        doc.text("Guild Hall Chat Transcript", margin, y);
        y += 20;

        doc.setFontSize(10);

        messages.forEach(msg => {
            if (y > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
            const date = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString() : 'Pending...';
            const messageHeader = `[${date}] ${msg.senderName}:`;
            doc.text(messageHeader, margin, y);
            y += 6;

            const splitText = doc.splitTextToSize(msg.text, 180);
            splitText.forEach((line: string) => {
                 if (y > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }
                doc.text(line, margin + 5, y);
                y += 6;
            })
            y += 4; // Extra space between messages
        });

        doc.save(`guild-hall-chat-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const getCompanyColor = (companyId?: string): React.CSSProperties => {
        if (companyId === 'teacher') return { backgroundColor: 'black' };
        if (!companyId) return { backgroundColor: 'gray' };
        const company = companies.find(c => c.id === companyId);
        return company?.color ? { backgroundColor: company.color } : {};
    };
    
    const isChatEnabled = teacherData?.isChatEnabled ?? true;
    const isCompanyChatActive = teacherData?.isCompanyChatActive ?? false;

    return (
        <div className="relative flex min-h-screen w-full flex-col">
            <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FGuild%20Hall.jpg?alt=media&token=b58a4615-2b4e-49b8-82ea-69aa003344cb')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                    opacity: 0.4,
                }}
            />
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Podium
                        </Button>
                         <div className="flex items-center space-x-4">
                             <Button variant="secondary" onClick={handleDownloadChat} disabled={messages.length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Chat
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isClearing}>
                                        {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the entire Guild Hall chat history. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearChat} className="bg-destructive hover:bg-destructive/90">
                                            Yes, Clear History
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button 
                                variant={isCompanyChatActive ? 'default' : 'outline'}
                                onClick={() => handleToggleSetting('isCompanyChatActive', !isCompanyChatActive)}
                            >
                                {isCompanyChatActive ? 'Deactivate Company Chat' : 'Activate Company Chat'}
                            </Button>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="chat-enabled"
                                    checked={isChatEnabled}
                                    onCheckedChange={(checked) => handleToggleSetting('isChatEnabled', checked)}
                                />
                                <Label htmlFor="chat-enabled">Chat Enabled</Label>
                            </div>
                        </div>
                    </div>
                    {isCompanyChatActive && (
                        <div className="bg-primary/80 backdrop-blur-sm text-primary-foreground p-3 rounded-lg flex items-center justify-center gap-2">
                            <Users className="h-5 w-5" />
                            <h3 className="font-bold">Company Chat Mode is ACTIVE. Only members of the same company will see each other's messages.</h3>
                        </div>
                    )}
                    <Card className="h-[75vh] flex flex-col bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>The Guild Hall</CardTitle>
                            <CardDescription>A place for all guild members to communicate.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow overflow-hidden flex flex-col">
                            <ScrollArea className="flex-grow pr-4 -mr-4">
                                <div className="space-y-4">
                                    {isLoading ? (
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                    ) : !isChatEnabled ? (
                                        <div className="flex-grow flex items-center justify-center">
                                            <Alert variant="destructive" className="max-w-md mx-auto">
                                                <ShieldAlert className="h-4 w-4" />
                                                <AlertTitle>Chat Disabled</AlertTitle>
                                                <AlertDescription>You have currently disabled the Guild Hall chat for students.</AlertDescription>
                                            </Alert>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <p className="text-center text-muted-foreground">The hall is quiet... be the first to speak!</p>
                                    ) : (
                                        messages.map(msg => (
                                            <div key={msg.id} className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full flex-shrink-0" style={getCompanyColor(msg.companyId)} />
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
