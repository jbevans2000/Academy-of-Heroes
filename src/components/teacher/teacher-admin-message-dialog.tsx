
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, getDoc, getDocs, where, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import type { Message, Teacher } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Paperclip, X, CheckCheck } from 'lucide-react';
import { sendMessageToAdmin, markAdminMessagesAsRead } from '@/ai/flows/manage-admin-messages';
import { cn } from '@/lib/utils';
import { ClientOnlyTime } from '../client-only-time';
import Image from 'next/image';

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
    const [adminUid, setAdminUid] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // New state for image attachments
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

                    const adminsQuery = query(collection(db, 'admins'), limit(1));
                    const adminSnapshot = await getDocs(adminsQuery);
                    if (!adminSnapshot.empty) {
                        setAdminUid(adminSnapshot.docs[0].id);
                    } else {
                        toast({ variant: 'destructive', title: 'Admin Not Found', description: 'Could not find an administrator to message.' });
                    }

                    return () => unsubTeacher();
                }
            });
            return () => unsubscribe();
        }
    }, [isOpen, toast]);

    useEffect(() => {
        if (isOpen && teacher && adminUid) {
            const messagesQuery = query(collection(db, 'admins', adminUid, 'teacherMessages', teacher.id, 'conversation'), orderBy('timestamp', 'asc'));
            const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            });
            
            return () => unsubscribe();
        }
    }, [isOpen, teacher, adminUid]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    const handleMarkAsRead = async () => {
        if (!adminUid || !teacher) return;
        try {
            await markAdminMessagesAsRead({ adminUid, teacherId: teacher.id });
            toast({ title: "Messages Marked as Read", description: "The notification has been cleared." });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not mark messages as read.' });
        }
    };
    
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() && !imageFile) return;
        if (!teacher || !user || !adminUid) return;

        setIsSending(true);
        let imageUrl: string | undefined = undefined;

        try {
            if (imageFile) {
                setIsUploading(true);
                const storage = getStorage(app);
                const filePath = `admin_messages/${user.uid}/${Date.now()}_${imageFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
                setIsUploading(false);
            }

            const result = await sendMessageToAdmin({
                teacherUid: user.uid,
                teacherName: teacher.name,
                message: newMessage,
                imageUrl,
                adminUid: adminUid,
            });
            if (result.success) {
                setNewMessage('');
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

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <DialogTitle>Contact Admin</DialogTitle>
                         <Button onClick={handleMarkAsRead} variant="secondary" size="sm">
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Mark as Read
                        </Button>
                    </div>
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
                    <div className="relative w-24 h-24 border p-1 rounded-md">
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
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder="Type your message..."
                        rows={2}
                        disabled={isSending || !adminUid}
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                        <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button type="submit" disabled={isSending || (!newMessage.trim() && !imageFile) || !adminUid}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
