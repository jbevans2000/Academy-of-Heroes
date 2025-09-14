
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { Message, Teacher } from '@/lib/data';
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
import { onSnapshot, collection, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdminMessageCenterProps {
    admin: User | null;
    teachers: Teacher[];
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    initialTeacher: Teacher | null;
    onConversationSelect: (teacher: Teacher | null) => void;
}

export function AdminMessageCenter({ 
    admin, 
    teachers,
    isOpen,
    onOpenChange,
    initialTeacher,
    onConversationSelect,
}: AdminMessageCenterProps) {
    const { toast } = useToast();
    
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [currentThreadMessages, setCurrentThreadMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const sortedTeachers = useMemo(() => {
        return [...teachers].sort((a, b) => {
            const aHasUnread = a.hasUnreadAdminMessages ?? false;
            const bHasUnread = b.hasUnreadAdminMessages ?? false;
            if (aHasUnread && !bHasUnread) return -1;
            if (!aHasUnread && bHasUnread) return 1;
            // Fallback to name sorting if unread status is the same
            if (a.name && b.name) {
                return a.name.localeCompare(b.name);
            }
            return 0;
        });
    }, [teachers]);

    useEffect(() => {
        if (!isOpen) {
            onConversationSelect(null);
        }
    }, [isOpen, onConversationSelect]);
    
    useEffect(() => {
        if (initialTeacher && admin) {
             const messagesQuery = query(collection(db, 'teachers', initialTeacher.id, 'adminMessages'), orderBy('timestamp', 'asc'));
             const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                setCurrentThreadMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
             });
             
             markAdminMessagesAsRead({ teacherId: initialTeacher.id });
             
             return () => unsubscribe();
        } else {
            setCurrentThreadMessages([]);
        }
    }, [initialTeacher, admin]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [currentThreadMessages]);
    
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!admin || !initialTeacher || !messageText.trim()) return;

        setIsSending(true);
        try {
            const result = await sendMessageToTeacherFromAdmin({
                adminUid: admin.uid,
                teacherUid: initialTeacher.id,
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
                            {sortedTeachers.map(teacher => (
                                <div 
                                    key={teacher.id}
                                    onClick={() => onConversationSelect(teacher)}
                                    className={cn(
                                        "p-2 rounded-md cursor-pointer hover:bg-accent",
                                        initialTeacher?.id === teacher.id && "bg-accent"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {teacher.hasUnreadAdminMessages && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                            )}
                                            <p className="font-semibold">{teacher.name}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground ml-4">{teacher.className}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <div className="w-2/3 flex flex-col">
                   {initialTeacher ? (
                        <>
                             <DialogHeader>
                                <DialogTitle>Conversation with {initialTeacher.name}</DialogTitle>
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
                                                    <p>{msg.text}</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                     {msg.timestamp ? formatDistanceToNow(new Date(msg.timestamp.seconds * 1000), { addSuffix: true }) : 'Sending...'}
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
                                    placeholder={`Message ${initialTeacher.name}...`}
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
