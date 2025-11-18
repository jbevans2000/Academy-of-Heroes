
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, ArrowLeft, ShieldAlert, Users } from 'lucide-react';
import { sendGuildHallMessage } from '@/ai/flows/manage-messages';
import { cn } from '@/lib/utils';
import { ClientOnlyTime } from '@/components/client-only-time';
import type { Company, Student, Teacher } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    const [student, setStudent] = useState<Student | null>(null);
    const [messages, setMessages] = useState<GuildHallMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [teacherData, setTeacherData] = useState<Teacher | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    
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
                }
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!student?.teacherUid) return;

        const teacherRef = doc(db, 'teachers', student.teacherUid);
        const unsubTeacher = onSnapshot(teacherRef, (docSnap) => {
            if (docSnap.exists()) {
                setTeacherData(docSnap.data() as Teacher);
            }
        });

        const messagesQuery = query(collection(db, 'teachers', student.teacherUid, 'guildHallMessages'), orderBy('timestamp', 'asc'));
        const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuildHallMessage)));
            setIsLoading(false);
        });

        const companiesQuery = query(collection(db, 'teachers', student.teacherUid, 'companies'));
        const unsubCompanies = onSnapshot(companiesQuery, (snapshot) => {
            setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
        });

        return () => {
            unsubTeacher();
            unsubMessages();
            unsubCompanies();
        };

    }, [student]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !student || !user) return;
        
        setIsSending(true);
        try {
            await sendGuildHallMessage({
                teacherUid: student.teacherUid,
                senderUid: user.uid,
                senderName: `${student.studentName} (${student.characterName})`,
                text: newMessage,
                isTeacher: false,
                companyId: student.companyId,
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
    
    const getCompanyColor = (companyId?: string): React.CSSProperties => {
        if (companyId === 'teacher') return { backgroundColor: 'black' };
        if (!companyId) return { backgroundColor: 'gray' };
        const company = companies.find(c => c.id === companyId);
        return company?.color ? { backgroundColor: company.color } : {};
    };

    const isChatEnabled = teacherData?.isChatEnabled ?? true;
    const isCompanyChatActive = teacherData?.isCompanyChatActive ?? false;

    const filteredMessages = isCompanyChatActive && student?.companyId
        ? messages.filter(msg => msg.companyId === student.companyId || msg.isTeacher)
        : messages;

    const currentCompany = student?.companyId ? companies.find(c => c.id === student.companyId) : null;

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
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    <Button variant="outline" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                    {isCompanyChatActive && (
                        <div className="bg-primary/80 backdrop-blur-sm text-primary-foreground p-4 rounded-lg flex items-center gap-4">
                            {currentCompany?.logoUrl && (
                                <Image src={currentCompany.logoUrl} alt={currentCompany.name} width={40} height={40} className="rounded-full border-2 border-white"/>
                            )}
                            <div>
                                <h3 className="font-bold">Company Chat Active</h3>
                                <p className="text-sm">{currentCompany ? `You are in a private channel with ${currentCompany.name}.` : "You can only see messages from your Guild Leader."}</p>
                            </div>
                        </div>
                    )}
                    <Card className="h-[75vh] flex flex-col bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>The Guild Hall {isCompanyChatActive && currentCompany ? `- ${currentCompany.name} Chat` : ''}</CardTitle>
                            <CardDescription>A place for all guild members to communicate.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow overflow-hidden flex flex-col">
                            {isLoading ? (
                                <div className="flex-grow flex items-center justify-center">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                </div>
                            ) : !isChatEnabled ? (
                                <div className="flex-grow flex items-center justify-center">
                                    <Alert variant="destructive" className="max-w-md mx-auto">
                                        <ShieldAlert className="h-4 w-4" />
                                        <AlertTitle>Chat Disabled</AlertTitle>
                                        <AlertDescription>The Guild Leader has currently disabled the Guild Hall chat.</AlertDescription>
                                    </Alert>
                                </div>
                            ) : (
                                <ScrollArea className="flex-grow pr-4 -mr-4">
                                    <div className="space-y-4">
                                        {filteredMessages.map(msg => (
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
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>
                            )}
                            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 pt-4 border-t">
                                <Textarea 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Send a message to the guild..."
                                    rows={1}
                                    disabled={isSending || !isChatEnabled}
                                />
                                <Button type="submit" disabled={isSending || !newMessage.trim() || !isChatEnabled}>
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
