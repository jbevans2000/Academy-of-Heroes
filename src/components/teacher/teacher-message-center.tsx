
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
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { sendMessageToStudents, markMessagesAsRead } from '@/ai/flows/manage-messages';
import { onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface TeacherMessageCenterProps {
    teacher: User | null;
    isMessageOpen: boolean;
    onMessageOpenChange: (isOpen: boolean) => void;
}

export function TeacherMessageCenter({ 
    teacher, 
    isMessageOpen,
    onMessageOpenChange
}: TeacherMessageCenterProps) {
    const { toast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    
    // For bulk messages
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    // For viewing conversations
    const [currentThreadMessages, setCurrentThreadMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!teacher) return;
        const studentsQuery = query(collection(db, 'teachers', teacher.uid, 'students'), where('isArchived', '!=', true), orderBy('isArchived'), orderBy('studentName'));
        const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));
        });
        return () => unsubscribe();
    }, [teacher]);
    
    useEffect(() => {
        if (selectedStudent && teacher) {
             const messagesQuery = query(collection(db, 'teachers', teacher.uid, 'students', selectedStudent.uid, 'messages'), orderBy('timestamp', 'asc'));
             const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                setCurrentThreadMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
             });
             
             // Mark messages as read
             markMessagesAsRead({ teacherUid: teacher.uid, studentUid: selectedStudent.uid, reader: 'teacher' });
             
             return () => unsubscribe();
        } else {
            setCurrentThreadMessages([]);
        }
    }, [selectedStudent, teacher]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [currentThreadMessages]);
    
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!teacher || !selectedStudent || !messageText.trim()) return;

        setIsSending(true);
        try {
            const result = await sendMessageToStudents({
                teacherUid: teacher.uid,
                studentUids: [selectedStudent.uid],
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
        <Dialog open={isMessageOpen} onOpenChange={onMessageOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex">
                {/* Left Panel: Student List */}
                <div className="w-1/3 border-r pr-4 flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Message Center</DialogTitle>
                         <DialogDescription>Select a student to view your conversation.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-grow mt-4">
                        <div className="space-y-2">
                            {students.map(student => (
                                <div 
                                    key={student.uid}
                                    onClick={() => setSelectedStudent(student)}
                                    className={cn(
                                        "p-2 rounded-md cursor-pointer hover:bg-accent",
                                        selectedStudent?.uid === student.uid && "bg-accent"
                                    )}
                                >
                                    <p className="font-semibold">{student.characterName}</p>
                                    <p className="text-sm text-muted-foreground">{student.studentName}</p>
                                    {student.hasUnreadMessages && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Panel: Conversation View */}
                <div className="w-2/3 flex flex-col">
                   {selectedStudent ? (
                        <>
                             <DialogHeader>
                                <DialogTitle>Conversation with {selectedStudent.characterName}</DialogTitle>
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
                                    placeholder={`Message ${selectedStudent.characterName}...`}
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
                            <p>Select a student from the list to begin messaging.</p>
                        </div>
                   )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
