
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { Student, Message } from '@/lib/data';
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
import { sendMessageToStudents, markMessagesAsRead } from '@/ai/flows/manage-messages';
import { onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { ClientOnlyTime } from '../client-only-time';

interface TeacherMessageCenterProps {
    teacher: User | null;
    students: Student[];
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    initialStudent: Student | null;
    onConversationSelect: (student: Student | null) => void;
}

export function TeacherMessageCenter({ 
    teacher, 
    students,
    isOpen,
    onOpenChange,
    initialStudent,
    onConversationSelect,
}: TeacherMessageCenterProps) {
    const { toast } = useToast();
    
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const [currentThreadMessages, setCurrentThreadMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const sortedStudents = useMemo(() => {
        const visibleStudents = students.filter(s => !s.isHidden);
        
        const unread = visibleStudents
            .filter(s => s.hasUnreadMessages)
            .sort((a, b) => a.studentName.localeCompare(b.studentName));
        
        const read = visibleStudents
            .filter(s => !s.hasUnreadMessages)
            .sort((a, b) => a.studentName.localeCompare(b.studentName));

        return [...unread, ...read];
    }, [students]);

    useEffect(() => {
        if (!isOpen) {
            onConversationSelect(null);
        }
    }, [isOpen, onConversationSelect]);
    
    useEffect(() => {
        if (initialStudent && teacher) {
             const messagesQuery = query(collection(db, 'teachers', teacher.uid, 'students', initialStudent.uid, 'messages'), orderBy('timestamp', 'asc'));
             const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                setCurrentThreadMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
             });
             
             markMessagesAsRead({ teacherUid: teacher.uid, studentUid: initialStudent.uid, reader: 'teacher' });
             
             return () => unsubscribe();
        } else {
            setCurrentThreadMessages([]);
        }
    }, [initialStudent, teacher]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [currentThreadMessages]);
    
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!teacher || !initialStudent || !newMessage.trim()) return;

        setIsSending(true);
        try {
            const result = await sendMessageToStudents({
                teacherUid: teacher.uid,
                studentUids: [initialStudent.uid],
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
            <DialogContent className="max-w-4xl h-[90vh] flex">
                {/* Left Panel: Student List */}
                <div className="w-1/3 border-r pr-4 flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Message Center</DialogTitle>
                         <DialogDescription>Select a student to view your conversation.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-grow mt-4">
                        <div className="space-y-2">
                            {sortedStudents.map(student => (
                                <div 
                                    key={student.uid}
                                    onClick={() => onConversationSelect(student)}
                                    className={cn(
                                        "p-2 rounded-md cursor-pointer hover:bg-accent",
                                        initialStudent?.uid === student.uid && "bg-accent"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {student.hasUnreadMessages && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                            )}
                                            <p className="font-semibold">{student.characterName}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground ml-4">{student.studentName}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Panel: Conversation View */}
                <div className="w-2/3 flex flex-col">
                   {initialStudent ? (
                        <>
                             <DialogHeader>
                                <DialogTitle>Conversation with {initialStudent.characterName}</DialogTitle>
                            </DialogHeader>
                             <div className="flex-grow overflow-hidden my-4">
                                <ScrollArea className="h-full pr-4">
                                    <div className="space-y-4">
                                        {currentThreadMessages.map(msg => (
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
                                    placeholder={`Message ${initialStudent.characterName}...`}
                                    rows={2}
                                    disabled={isSending}
                                />
                                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </form>
                        </>
                   ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <MessageSquare className="h-16 w-16 mb-4"/>
                            <p>Select a student from the list to begin messaging.</p>
                        </div>
                   )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
