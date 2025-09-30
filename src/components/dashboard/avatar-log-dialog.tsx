
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { AvatarLogEntry } from '@/lib/avatar-log';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ScrollText, Star, Coins } from 'lucide-react';
import { ClientOnlyTime } from '../client-only-time';
import { Separator } from '../ui/separator';

interface AvatarLogDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
}

export function AvatarLogDialog({ isOpen, onOpenChange, student }: AvatarLogDialogProps) {
    const { toast } = useToast();
    const [log, setLog] = useState<AvatarLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && student.teacherUid && student.uid) {
            setIsLoading(true);
            const logRef = collection(db, 'teachers', student.teacherUid, 'students', student.uid, 'avatarLog');
            const q = query(logRef, orderBy('timestamp', 'desc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const logData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvatarLogEntry));
                setLog(logData);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching avatar log: ", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load the avatar log.' });
                setIsLoading(false);
            });

            return () => unsubscribe();
        }
    }, [isOpen, student.teacherUid, student.uid, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <ScrollText className="h-6 w-6 text-primary" />
                        Avatar Log: {student.characterName}
                    </DialogTitle>
                    <DialogDescription>
                        A record of all Experience Points (XP) and Gold earned on your journey.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-hidden">
                    <ScrollArea className="h-full pr-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        ) : log.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                                <p>Your adventure is just beginning! No entries yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {log.map((entry, index) => (
                                    <div key={index} className="p-4 border rounded-lg bg-secondary/50">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="font-bold text-lg">{entry.source}</p>
                                                {entry.reason && <p className="text-sm italic text-muted-foreground">"{entry.reason}"</p>}
                                            </div>
                                            <p className="text-xs text-muted-foreground whitespace-nowrap pl-4">
                                                <ClientOnlyTime date={new Date(entry.timestamp?.seconds * 1000)} />
                                            </p>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="flex items-center gap-4 text-sm">
                                            {entry.xp !== undefined && (
                                                <span className="flex items-center gap-1 font-semibold text-yellow-500">
                                                    <Star className="h-4 w-4" /> {entry.xp > 0 ? `+${entry.xp}` : entry.xp} XP
                                                </span>
                                            )}
                                            {entry.gold !== undefined && (
                                                 <span className="flex items-center gap-1 font-semibold text-amber-600">
                                                    <Coins className="h-4 w-4" /> {entry.gold > 0 ? `+${entry.gold}` : entry.gold} Gold
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
