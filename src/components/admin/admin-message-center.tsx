
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDocs, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { sendMessageToTeacherFromAdmin, markAdminMessagesAsRead } from '@/ai/flows/manage-admin-messages';
import { cn } from '@/lib/utils';
import { ClientOnlyTime } from '../client-only-time';

// Define more specific types based on the new structure
interface TeacherConversation {
    id: string; // This will be the teacher's UID
    name?: string;
    className?: string;
    hasUnreadAdminMessages?: boolean;
}

interface AdminMessage {
  id: string;
  text: string;
  sender: 'teacher' | 'admin';
  timestamp: any;
  isRead: boolean;
  senderName?: string;
}

interface AdminMessageCenterProps {
    admin: User | null;
    teachers: any[]; // Using any for now as the shape might not match the new structure perfectly
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    initialTeacher: any | null;
    onConversationSelect: (teacher: TeacherConversation | null) => void;
}

export function AdminMessageCenter({ 
    admin, 
    teachers: initialTeachers, // Renamed to avoid confusion
    isOpen,
    onOpenChange,
    initialTeacher: selectedTeacher,
    onConversationSelect,
}: AdminMessageCenterProps) {
    const { toast } = useToast();
    
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [currentThreadMessages, setCurrentThreadMessages] = useState<AdminMessage[]>([]);
    const [conversations, setConversations] = useState<TeacherConversation[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!admin) return;

        // Fetch teachers to get their names and class names
        const teachersRef = collection(db, 'teachers');
        const unsubTeachers = onSnapshot(teachersRef, (snapshot) => {
            const allTeachers = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, className: doc.data().className, hasUnreadAdminMessages: doc.data().hasUnreadAdminMessages }));
            
            // Now, fetch the conversations from the admin's subcollection
            const convosRef = collection(db, 'admins', admin.uid, 'teacherMessages');
            const unsubConvos = onSnapshot(query(convosRef, orderBy('lastMessageAt', 'desc')), (convoSnapshot) => {
                const convoData = convoSnapshot.docs.map(doc => {
                    const teacherInfo = allTeachers.find(t => t.id === doc.id);
                    return {
                        id: doc.id,
                        name: teacherInfo?.name || 'Unknown Teacher',
                        className: teacherInfo?.className,
                        hasUnreadAdminMessages: teacherInfo?.hasUnreadAdminMessages
                    };
                });
                 // Add teachers who haven't had a conversation yet
                const teachersWithConvos = new Set(convoData.map(c => c.id));
                const teachersWithoutConvos = allTeachers.filter(t => !teachersWithConvos.has(t.id));

                setConversations([...convoData, ...teachersWithoutConvos]);
            });
            
            return unsubConvos;
        });

        return () => unsubTeachers();
    }, [admin]);

    useEffect(() => {
        if (!isOpen) {
            onConversationSelect(null);
        }
    }, [isOpen, onConversationSelect]);
    
    useEffect(() => {
        if (selectedTeacher && admin) {
             const messagesQuery = query(collection(db, 'admins', admin.uid, 'teacherMessages', selectedTeacher.id, 'conversation'), orderBy('timestamp', 'asc'));
             const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                setCurrentThreadMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminMessage)));
             });
             
             markAdminMessagesAsRead({ adminUid: admin.uid, teacherId: selectedTeacher.id });
             
             return () => unsubscribe();
        } else {
            setCurrentThreadMessages([]);
        }
    }, [selectedTeacher, admin]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [currentThreadMessages]);
    
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!admin || !selectedTeacher || !messageText.trim()) return;

        setIsSending(true);
        try {
            const result = await sendMessageToTeacherFromAdmin({
                adminUid: admin.uid,
                teacherUid: selectedTeacher.id,
                message: messageText,
            });
            if (result.success) {
                setMessageText('');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSending(false);
        }
    };

    const sortedConversations = useMemo(() => {
        return [...conversations].sort((a, b) => {
            const aHasUnread = a.hasUnreadAdminMessages ?? false;
            const bHasUnread = b.hasUnreadAdminMessages ?? false;
            if (aHasUnread && !bHasUnread) return -1;
            if (!aHasUnread && bHasUnread) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [conversations]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex">
                <div className="w-1/3 border-r pr-4 flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Master Message Center</DialogTitle>
                         <DialogDescription>Select a Guild Leader to view your conversation.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-grow mt-4">
                        <div className="space-y-2">
                            {sortedConversations.map(convo => (
                                <div 
                                    key={convo.id}
                                    onClick={() => onConversationSelect(convo)}
                                    className={cn(
                                        "p-2 rounded-md cursor-pointer hover:bg-accent",
                                        selectedTeacher?.id === convo.id && "bg-accent"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {convo.hasUnreadAdminMessages && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                            )}
                                            <p className="font-semibold">{convo.name}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground ml-4">{convo.className}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <div className="w-2/3 flex flex-col">
                   {selectedTeacher ? (
                        <>
                             <DialogHeader>
                                <DialogTitle>Conversation with {selectedTeacher.name}</DialogTitle>
                            </DialogHeader>
                             <div className="flex-grow overflow-hidden my-4">
                                <ScrollArea className="h-full pr-4">
                                    <div className="space-y-4">
                                        {currentThreadMessages.map(msg => (
                                            <div key={msg.id} className={cn("flex flex-col", msg.sender === 'admin' ? 'items-end' : 'items-start')}>
                                                <div className={cn(
                                                    "p-3 rounded-lg max-w-[80%]",
                                                    msg.sender === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                                                )}>
                                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                     {msg.timestamp ? <ClientOnlyTime date={new Date(msg.timestamp.seconds * 1000)} /> : 'Sending...'}
                                                </p>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>
                            </div>
                            <form onSubmit={handleSendMessage} className="flex gap-2 pt-4 border-t">
                                <Textarea 
                                    value={messageText} 
                                    onChange={(e) => setMessageText(e.target.value)} 
                                    placeholder={`Message ${selectedTeacher.name}...`}
                                    rows={2}
                                    disabled={isSending}
                                />
                                <Button type="submit" disabled={isSending || !messageText.trim()}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </form>
                        </>
                   ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <MessageSquare className="h-16 w-16 mb-4"/>
                            <p>Select a Guild Leader from the list to begin messaging.</p>
                        </div>
                   )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
