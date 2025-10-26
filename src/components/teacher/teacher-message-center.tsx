
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send, Trash2, CheckCheck } from 'lucide-react';
import { sendMessageToStudents, markMessagesAsRead, clearMessageHistory, markAllTeacherMessagesAsRead } from '@/ai/flows/manage-messages';
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
    const [isClearing, setIsClearing] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    
    const [currentThreadMessages, setCurrentThreadMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => {
            const aHasUnread = a.hasUnreadMessages ?? false;
            const bHasUnread = b.hasUnreadMessages ?? false;
            if (aHasUnread && !bHasUnread) return -1;
            if (!aHasUnread && bHasUnread) return 1;
            return a.studentName.localeCompare(b.studentName);
        });
    }, [students]);
    
    const hasUnread = useMemo(() => students.some(s => s.hasUnreadMessages), [students]);

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
             
             if (initialStudent.hasUnreadMessages) {
                markMessagesAsRead({ teacherUid: teacher.uid, studentUid: initialStudent.uid, reader: 'teacher' });
             }
             
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

    const handleClearHistory = async () => {
        if (!teacher || !initialStudent) return;
        setIsClearing(true);
        try {
            const result = await clearMessageHistory({
                teacherUid: teacher.uid,
                studentUid: initialStudent.uid,
            });
            if (result.success) {
                toast({ title: "History Cleared", description: `The message history for ${initialStudent.studentName} has been deleted.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsClearing(false);
            setIsClearConfirmOpen(false);
        }
    }

    const handleMarkAllRead = async () => {
        if (!teacher) return;
        setIsMarkingAllRead(true);
        try {
            const result = await markAllTeacherMessagesAsRead(teacher.uid);
            if(result.success) {
                toast({ title: 'All messages marked as read.'});
            } else {
                throw new Error(result.error);
            }
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not mark all messages as read.' });
        } finally {
            setIsMarkingAllRead(false);
        }
    }

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex">
                <div className="w-1/3 border-r pr-4 flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Message Center</DialogTitle>
                         <DialogDescription>Select a student to view your conversation.</DialogDescription>
                    </DialogHeader>
                    {hasUnread && (
                        <div className="py-2">
                             <Button onClick={handleMarkAllRead} disabled={isMarkingAllRead} size="sm" variant="secondary" className="w-full">
                                {isMarkingAllRead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                                Mark All as Read
                            </Button>
                        </div>
                    )}
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
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                            )}
                                            <p className="font-semibold">{student.studentName}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground ml-4">{student.characterName}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <div className="w-2/3 flex flex-col">
                   {initialStudent ? (
                        <>
                             <DialogHeader className="flex-row justify-between items-center">
                                <DialogTitle>Conversation with {initialStudent.studentName}</DialogTitle>
                                <Button variant="destructive" size="sm" onClick={() => setIsClearConfirmOpen(true)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Clear History
                                </Button>
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
                                    placeholder={`Message ${initialStudent.studentName}...`}
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
        <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the entire message history with {initialStudent?.studentName}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearHistory} disabled={isClearing} className="bg-destructive hover:bg-destructive/90">
                        {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Yes, Clear History
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
