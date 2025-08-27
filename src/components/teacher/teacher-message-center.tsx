

'use client';

import { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { Student, Message } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { sendMessageToStudents, markMessagesAsRead } from '@/ai/flows/manage-messages';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TeacherMessageCenterProps {
    teacher: User | null;
    students: Student[];
    selectedStudentUids?: string[];
    isMessageOpen: boolean;
    onMessageOpenChange: (isOpen: boolean) => void;
    isConversationViewOpen: boolean;
    onConversationViewOpenChange: (isOpen: boolean) => void;
    studentToMessage: Student | null;
}

export function TeacherMessageCenter({ 
    teacher, 
    students, 
    selectedStudentUids = [],
    isMessageOpen,
    onMessageOpenChange,
    isConversationViewOpen,
    onConversationViewOpenChange,
    studentToMessage
}: TeacherMessageCenterProps) {
    const { toast } = useToast();
    
    // For bulk messages
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    // For viewing conversations
    const [currentThreadMessages, setCurrentThreadMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [currentThreadMessages]);

    useEffect(() => {
        if (isConversationViewOpen && studentToMessage && teacher) {
             const messagesQuery = query(collection(db, 'teachers', teacher.uid, 'students', studentToMessage.uid, 'messages'), orderBy('timestamp', 'asc'));
             const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                setCurrentThreadMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
             });
             
             // Mark messages as read
             markMessagesAsRead({ teacherUid: teacher.uid, studentUid: studentToMessage.uid, reader: 'teacher' });
             
             return () => unsubscribe();
        }
    }, [isConversationViewOpen, studentToMessage, teacher]);


    const handleSendMessage = async () => {
        const uidsToSend = studentToMessage ? [studentToMessage.uid] : selectedStudentUids;

        if (!teacher || uidsToSend.length === 0 || !messageText.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select students and write a message.' });
            return;
        }
        setIsSending(true);
        try {
            const result = await sendMessageToStudents({
                teacherUid: teacher.uid,
                studentUids: uidsToSend,
                message: messageText,
            });
            if (result.success) {
                toast({ title: 'Message Sent!', description: result.message });
                setMessageText('');
                // Close the appropriate dialog
                if (isConversationViewOpen) onConversationViewOpenChange(false);
                if (isMessageOpen) onMessageOpenChange(false);

            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSending(false);
        }
    };
    
    
    const getRecipientDescription = () => {
        if (selectedStudentUids.length === 1) {
             const student = students.find(s => s.uid === selectedStudentUids[0]);
             return `Your message will be sent to ${student?.characterName || '1 student'}.`;
        }
        if (selectedStudentUids.length > 1) {
            return `Your message will be sent to the ${selectedStudentUids.length} selected students.`
        }
        return 'Select students from the dashboard to send them a message.';
    }

    return (
        <>
            <Dialog open={isMessageOpen} onOpenChange={onMessageOpenChange}>
                <DialogTrigger asChild>
                     <Button disabled={selectedStudentUids.length === 0}>
                        <MessageSquare className="mr-2 h-4 w-4" /> Message Selected ({selectedStudentUids.length})
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send a Message</DialogTitle>
                        <DialogDescription>
                           {getRecipientDescription()}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea 
                            value={messageText} 
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type your message..."
                            rows={5}
                            disabled={isSending}
                        />
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => onMessageOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSendMessage} disabled={isSending || selectedStudentUids.length === 0}>
                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                            Send Message
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isConversationViewOpen} onOpenChange={onConversationViewOpenChange}>
                <DialogContent className="max-w-xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Conversation with {studentToMessage?.characterName}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow overflow-hidden">
                       <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {currentThreadMessages.map(msg => (
                                     <div key={msg.id} className={cn("flex flex-col", msg.sender === 'teacher' ? 'items-end' : 'items-start')}>
                                        <div className={cn(
                                            "p-3 rounded-lg max-w-[80%]",
                                            msg.sender === 'teacher' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
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
                            value={messageText} 
                            onChange={(e) => setMessageText(e.target.value)} 
                            placeholder="Type your message..."
                            rows={2}
                            disabled={isSending}
                        />
                        <Button onClick={handleSendMessage} disabled={isSending || !messageText.trim()}>
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
