
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, orderBy, onSnapshot, doc, getDocs, where } from 'firebase/firestore';
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
import { Loader2, MessageSquare, Send, Trash2, Paperclip, X } from 'lucide-react';
import { sendMessageToTeacherFromAdmin, markAdminMessagesAsRead, clearAdminMessageHistory } from '@/ai/flows/manage-admin-messages';
import { cn } from '@/lib/utils';
import { ClientOnlyTime } from '../client-only-time';
import Image from 'next/image';

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
  imageUrl?: string;
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

    const [isClearing, setIsClearing] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    
    // New state for image attachments
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!admin) return;

        const teachersRef = collection(db, 'teachers');
        const unsubTeachers = onSnapshot(teachersRef, (snapshot) => {
            const allTeachers = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, className: doc.data().className, hasUnreadAdminMessages: doc.data().hasUnreadAdminMessages }));
            
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
        if (!admin || !selectedTeacher || (!messageText.trim() && !imageFile)) return;

        setIsSending(true);
        let imageUrl: string | undefined = undefined;

        try {
            if (imageFile) {
                setIsUploading(true);
                const storage = getStorage(app);
                const filePath = `admin_messages/${admin.uid}/${Date.now()}_${imageFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
                setIsUploading(false);
            }

            const result = await sendMessageToTeacherFromAdmin({
                adminUid: admin.uid,
                teacherUid: selectedTeacher.id,
                message: messageText,
                imageUrl,
            });
            if (result.success) {
                setMessageText('');
                setImageFile(null);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSending(false);
            setIsUploading(false);
        }
    };
    
    const handleClearHistory = async () => {
        if (!admin || !selectedTeacher) return;
        setIsClearing(true);
        try {
            const result = await clearAdminMessageHistory({
                adminUid: admin.uid,
                teacherId: selectedTeacher.id,
            });
            if (result.success) {
                toast({ title: "History Cleared", description: `The message history for ${selectedTeacher.name} has been deleted.` });
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
        <>
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
                                <DialogHeader className="flex-row justify-between items-center">
                                    <DialogTitle>Conversation with {selectedTeacher.name}</DialogTitle>
                                    <Button variant="destructive" size="sm" onClick={() => setIsClearConfirmOpen(true)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Clear History
                                    </Button>
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
                                                        {msg.imageUrl && (
                                                            <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                                                <Image src={msg.imageUrl} alt="Attached image" width={200} height={200} className="rounded-md mb-2 object-cover" />
                                                            </a>
                                                        )}
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
                                {imageFile && (
                                    <div className="relative w-24 h-24 border p-1 rounded-md mb-2">
                                        <Image src={URL.createObjectURL(imageFile)} alt="Preview" layout="fill" className="object-cover rounded-sm" />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={() => setImageFile(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                                <form onSubmit={handleSendMessage} className="flex gap-2 pt-4 border-t items-start">
                                    <Textarea 
                                        value={messageText} 
                                        onChange={(e) => setMessageText(e.target.value)} 
                                        placeholder={`Message ${selectedTeacher.name}...`}
                                        rows={2}
                                        disabled={isSending || isUploading}
                                    />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                                    />
                                    <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending || isUploading}>
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                                    </Button>
                                    <Button type="submit" disabled={isSending || isUploading || (!messageText.trim() && !imageFile)}>
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
            <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the entire message history with {selectedTeacher?.name}. This action cannot be undone.
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
