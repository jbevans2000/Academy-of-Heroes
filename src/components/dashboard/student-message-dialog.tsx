
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Message, Student } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { sendMessageToTeacher, markMessagesAsRead } from '@/ai/flows/manage-messages';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';


interface StudentMessageDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function StudentMessageDialog({ isOpen, onOpenChange }: StudentMessageDialogProps) {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                    const studentMetaRef = doc(db, 'students', currentUser.uid);
                    const metaSnap = await getDoc(studentMetaRef);
                    if (metaSnap.exists()) {
                        const studentRef = doc(db, 'teachers', metaSnap.data().teacherUid, 'students', currentUser.uid);
                        const unsubStudent = onSnapshot(studentRef, (studentSnap) => {
                            if (studentSnap.exists()) {
                                setStudent(studentSnap.data() as Student);
                            }
                        });
                        return () => unsubStudent();
                    }
                }
            });
            return () => unsubscribe();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && student?.teacherUid && user?.uid) {
            const messagesQuery = query(collection(db, 'teachers', student.teacherUid, 'students', user.uid, 'messages'), orderBy('timestamp', 'asc'));
            const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            });
            
            // Mark messages as read when dialog opens
            markMessagesAsRead({ teacherUid: student.teacherUid, studentUid: user.uid, reader: 'student' });
            
            return () => unsubscribe();
        }
    }, [isOpen, student, user]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !student || !user) return;
        setIsSending(true);
        try {
            const result = await sendMessageToTeacher({
                teacherUid: student.teacherUid,
                studentUid: user.uid,
                studentName: student.characterName,
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
                    <DialogTitle>Message Center</DialogTitle>
                    <DialogDescription>Your private correspondence with the Guild Leader.</DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-hidden">
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-4">
                            {messages.map(msg => (
                                <div key={msg.id} className={cn("flex flex-col", msg.sender === 'student' ? 'items-end' : 'items-start')}>
                                    <div className={cn(
                                        "p-3 rounded-lg max-w-[80%]",
                                        msg.sender === 'student' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
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
                <div className="flex gap-2 pt-4 border-t">
                    <Textarea 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder="Type your message..."
                        rows={2}
                        disabled={isSending}
                    />
                    <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
