
'use client';

import { useState, useEffect } from 'react';
import type { Student } from '@/lib/data';
import type { DuelSettings } from '@/lib/duels';
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
import { onSnapshot, collection, query, where, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Swords } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getDuelSettings } from '@/ai/flows/manage-duels';

interface ChallengeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
}

export function ChallengeDialog({ isOpen, onOpenChange, student }: ChallengeDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [onlineStudents, setOnlineStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChallenging, setIsChallenging] = useState<string | null>(null);
  const [duelSettings, setDuelSettings] = useState<DuelSettings | null>(null);

  useEffect(() => {
    if (!isOpen || !student.teacherUid) return;

    setIsLoading(true);

    getDuelSettings(student.teacherUid).then(settings => {
        setDuelSettings(settings);
        if (!settings.isDuelsEnabled) {
            setIsLoading(false);
            return;
        }

        const allStudentsQuery = query(
            collection(db, 'teachers', student.teacherUid, 'students'),
            where('isArchived', '!=', true)
        );
        
        const unsubAllStudents = onSnapshot(allStudentsQuery, (snapshot) => {
            const allStudentsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
            
            const presenceRef = doc(db, 'teachers', student.teacherUid, 'presence', 'online');
            const unsubPresence = onSnapshot(presenceRef, (presenceSnap) => {
                const presenceData = presenceSnap.data()?.onlineStatus || {};
                const availableStudents = allStudentsData.filter(s =>
                    s.uid !== student.uid &&
                    (s.inDuel === undefined || s.inDuel === false) &&
                    presenceData[s.uid]?.status === 'online'
                );
                setOnlineStudents(availableStudents);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching presence data: ", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch online students.' });
                setIsLoading(false);
            });
            return () => unsubPresence();

        }, (error) => {
             console.error("Error fetching all students: ", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not load class roster.' });
             setIsLoading(false);
        });

        return () => unsubAllStudents();
    });

  }, [isOpen, student.teacherUid, student.uid, toast]);
  
  const handleChallenge = async (opponent: Student) => {
    if (!student.teacherUid) return;
    setIsChallenging(opponent.uid);
    try {
        const duelsRef = collection(db, 'teachers', student.teacherUid, 'duels');
        await addDoc(duelsRef, {
            challengerUid: student.uid,
            challengerName: student.characterName,
            opponentUid: opponent.uid,
            opponentName: opponent.characterName,
            status: 'pending', // pending, active, declined, finished
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Challenge Sent!', description: `Your challenge has been sent to ${opponent.characterName}.` });
        onOpenChange(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not send the challenge.' });
    } finally {
        setIsChallenging(null);
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Challenge a Guildmate</DialogTitle>
          <DialogDescription>
            Select an online hero to challenge to a friendly duel.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border">
            <div className="p-4">
            {isLoading ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin"/>
                </div>
            ) : !(duelSettings?.isDuelsEnabled ?? true) ? (
                 <p className="text-center text-muted-foreground p-4">The Training Grounds are currently closed by the Guild Leader.</p>
            ) : onlineStudents.length === 0 ? (
                <p className="text-center text-muted-foreground p-4">No other heroes are available for a duel right now.</p>
            ) : (
                <div className="space-y-2">
                    {onlineStudents.map(opp => (
                        <div key={opp.uid} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2">
                                <Image src={opp.avatarUrl} alt={opp.characterName} width={40} height={40} className="rounded-full" />
                                <span className="font-semibold">{opp.characterName}</span>
                            </div>
                            <Button size="sm" onClick={() => handleChallenge(opp)} disabled={!!isChallenging}>
                                {isChallenging === opp.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <Swords className="h-4 w-4"/>}
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
