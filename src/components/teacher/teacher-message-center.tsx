
'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
    selectedStudentUids: string[];
}

export function TeacherMessageCenter({ teacher, students, selectedStudentUids }: TeacherMessageCenterProps) {
    const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [messageText, setMessageText] = useState('');
    const { toast } = useToast();
    
    // For viewing conversations
    const [isConversationViewOpen, setIsConversationViewOpen] = useState(false);
    const [currentThreadStudent, setCurrentThreadStudent] = useState<Student | null>(null);
    const [currentThreadMessages, setCurrentThreadMessages] = useState<Message[]>([]);
    
    const unreadMessagesByStudent = students.reduce((acc, student) => {
        if (student.hasUnreadMessages) {
            acc[student.uid] = true;
        }
        return acc;
    }, {} as { [uid: string]: boolean });

    useEffect(() => {
        if (isConversationViewOpen && currentThreadStudent && teacher) {
             const messagesQuery = query(collection(db, 'teachers', teacher.uid, 'students', currentThreadStudent.uid, 'messages'), orderBy('timestamp', 'asc'));
             const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                setCurrentThreadMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
             });
             
             // Mark messages as read
             markMessagesAsRead({ teacherUid: teacher.uid, studentUid: currentThreadStudent.uid, reader: 'teacher' });
             
             return () => unsubscribe();
        }
    }, [isConversationViewOpen, currentThreadStudent, teacher]);


    const handleSendMessage = async () => {
        if (!teacher || selectedStudentUids.length === 0 || !messageText.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select students and write a message.' });
            return;
        }
        setIsSending(true);
        try {
            const result = await sendMessageToStudents({
                teacherUid: teacher.uid,
                studentUids: selectedStudentUids,
                message: messageText,
            });
            if (result.success) {
                toast({ title: 'Message Sent!', description: result.message });
                setMessageText('');
                setIsMessageDialogOpen(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSending(false);
        }
    };
    
    const handleViewConversation = (student: Student) => {
        setCurrentThreadStudent(student);
        setIsConversationViewOpen(true);
    }

    return (
        <>
            <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
                <DialogTrigger asChild>
                     <Button disabled={selectedStudentUids.length === 0}>
                        <MessageSquare className="mr-2 h-4 w-4" /> Message ({selectedStudentUids.length})
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send a Message</DialogTitle>
                        <DialogDescription>
                           Your message will be sent to the {selectedStudentUids.length} selected student(s).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea 
                            value={messageText} 
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type your message to the student(s)..."
                            rows={5}
                            disabled={isSending}
                        />
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendMessage} disabled={isSending}>
                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                            Send Message
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isConversationViewOpen} onOpenChange={setIsConversationViewOpen}>
                <DialogContent className="max-w-xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Conversation with {currentThreadStudent?.characterName}</DialogTitle>
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
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
            
            <Select onValueChange={(uid) => {
                const student = students.find(s => s.uid === uid);
                if (student) handleViewConversation(student);
            }}>
                <SelectTrigger className="w-[280px] text-black border-black">
                    <SelectValue placeholder="View Student Message Thread" />
                </SelectTrigger>
                <SelectContent>
                     {students.map(student => (
                        <SelectItem key={student.uid} value={student.uid}>
                            <div className="flex items-center gap-2">
                                {unreadMessagesByStudent[student.uid] && <span className="h-2 w-2 rounded-full bg-red-500" />}
                                {student.characterName} ({student.studentName})
                            </div>
                        </SelectItem>
                     ))}
                </SelectContent>
            </Select>

        </>
    );
}
