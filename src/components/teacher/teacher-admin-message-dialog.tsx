
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Message, Teacher } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { sendMessageToAdmin, markAdminMessagesAsRead } from '@/ai/flows/manage-admin-messages';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ClientOnlyTime } from '../client-only-time';


interface TeacherAdminMessageDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function TeacherAdminMessageDialog({ isOpen, onOpenChange }: TeacherAdminMessageDialogProps) {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                    const teacherRef = doc(db, 'teachers', currentUser.uid);
                    const unsubTeacher = onSnapshot(teacherRef, (teacherSnap) => {
                        if (teacherSnap.exists()) {
                            setTeacher({ id: teacherSnap.id, ...teacherSnap.data()} as unknown as Teacher);
                        }
                    });
                    return () => unsubTeacher();
                }
            });
            return () => unsubscribe();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && teacher) {
            const messagesQuery = query(collection(db, 'teachers', teacher.id, 'adminMessages'), orderBy('timestamp', 'asc'));
            const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            });
            
            markAdminMessagesAsRead({ teacherId: teacher.id });
            
            return () => unsubscribe();
        }
    }, [isOpen, teacher]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !teacher || !user) return;
        setIsSending(true);
        try {
            const result = await sendMessageToAdmin({
                teacherUid: user.uid,
                teacherName: teacher.name,
                message: newMessage,
            });
            if (result.success) {
                setNewMessage('');
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
            <DialogContent className="max-w-lg h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Contact Admin</DialogTitle>
                    <DialogDescription>Your private correspondence with the site administrators.</DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-hidden">
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-4">
                            {messages.map(msg => (
                                <div key={msg.id} className={cn("flex flex-col", msg.sender === 'teacher' ? 'items-end' : 'items-start')}>
                                    <div className={cn(
                                        "p-3 rounded-lg max-w-[80%]",
                                        msg.sender === 'teacher' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
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
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder="Type your message..."
                        rows={2}
                        disabled={isSending}
                    />
                    <Button type="submit" disabled={isSending || !newMessage.trim()}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
