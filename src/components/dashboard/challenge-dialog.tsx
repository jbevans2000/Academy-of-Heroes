
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { onSnapshot, collection, query, addDoc, serverTimestamp, doc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
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

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}


export function ChallengeDialog({ isOpen, onOpenChange, student }: ChallengeDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [onlineUids, setOnlineUids] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChallenging, setIsChallenging] = useState<string | null>(null);
  const [duelSettings, setDuelSettings] = useState<DuelSettings | null>(null);
  
  // Confirmation Dialog State
  const [isConfirming, setIsConfirming] = useState(false);
  const [opponentToChallenge, setOpponentToChallenge] = useState<Student | null>(null);


  useEffect(() => {
    if (!isOpen || !student.teacherUid) return;

    const resetDailyCountIfNeeded = async () => {
        const today = new Date();
        const lastReset = student.lastDuelCountReset?.toDate();
        if (!lastReset || !isSameDay(today, lastReset)) {
             const studentRef = doc(db, 'teachers', student.teacherUid, 'students', student.uid);
             await updateDoc(studentRef, { dailyDuelCount: 0, lastDuelCountReset: serverTimestamp() });
        }
    };

    resetDailyCountIfNeeded();
    setIsLoading(true);
    
    getDuelSettings(student.teacherUid).then(settings => {
      setDuelSettings(settings);
    });
    
    const studentsQuery = query(
        collection(db, 'teachers', student.teacherUid, 'students')
    );
    const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
        const studentsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
        setAllStudents(studentsData);
        setIsLoading(false); 
    }, (error) => {
        console.error("Error fetching students: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load class roster.' });
        setIsLoading(false);
    });

    const presenceRef = doc(db, 'teachers', student.teacherUid, 'presence', 'online');
    const unsubPresence = onSnapshot(presenceRef, (presenceSnap) => {
        const presenceData = presenceSnap.exists() ? presenceSnap.data().onlineStatus || {} : {};
        const uids = Object.keys(presenceData).filter(uid => presenceData[uid]?.status === 'online');
        setOnlineUids(uids);
    }, (error) => {
        console.error("Error fetching presence data: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch online students.' });
    });

    return () => {
        unsubStudents();
        unsubPresence();
    };
  }, [isOpen, student.teacherUid, student.uid, toast, student.lastDuelCountReset]);
  
  const availableStudents = useMemo(() => {
    if (!duelSettings?.isDuelsEnabled) return [];
    return allStudents.filter(s => {
        return s.uid !== student.uid &&
               (s.inDuel === undefined || s.inDuel === false) &&
               !s.isArchived &&
               !s.isHidden &&
               onlineUids.includes(s.uid);
    });
  }, [allStudents, onlineUids, student.uid, duelSettings]);

  const handleChallengeClick = (opponent: Student) => {
      if (!duelSettings) return;

      // CRITICAL FIX: Check challenger's daily limit before allowing a challenge
      if (duelSettings.isDailyLimitEnabled) {
          const challengerDuelsToday = student.dailyDuelCount || 0;
          if (challengerDuelsToday >= (duelSettings.dailyDuelLimit || 999)) {
              toast({
                  variant: 'destructive',
                  title: 'Daily Limit Reached',
                  description: "The Guild Leader has imposed a daily limit for the Training Grounds! Please return tomorrow for additional training!",
                  duration: 6000,
              });
              return;
          }
          
          const opponentDuelsToday = opponent.dailyDuelCount || 0;
           if (opponentDuelsToday >= (duelSettings.dailyDuelLimit || 999)) {
              toast({
                  variant: 'destructive',
                  title: 'Opponent Unavailable',
                  description: `${opponent.characterName} has reached their daily duel limit. Please find another sparring partner.`,
                  duration: 6000,
              });
              return;
          }
      }
      
      const cost = duelSettings.duelCost || 0;
      if (cost > 0 && student.gold < cost) {
          toast({ variant: 'destructive', title: 'Not Enough Gold!', description: `You need ${cost} Gold to start this duel.` });
          return;
      }
      
      setOpponentToChallenge(opponent);
      setIsConfirming(true);
  }

  const handleConfirmChallenge = async () => {
    if (!student.teacherUid || !opponentToChallenge) return;
    setIsConfirming(false);
    setIsChallenging(opponentToChallenge.uid);

    try {
        const duelsRef = collection(db, 'teachers', student.teacherUid, 'duels');
        const newDuelDoc = await addDoc(duelsRef, {
            challengerUid: student.uid,
            challengerName: student.characterName,
            opponentUid: opponentToChallenge.uid,
            opponentName: opponentToChallenge.characterName,
            status: 'pending',
            createdAt: serverTimestamp(),
            cost: duelSettings?.duelCost || 0,
        });
        toast({ title: 'Challenge Sent!', description: `Your challenge has been sent to ${opponentToChallenge.characterName}.` });
        router.push(`/duel/${newDuelDoc.id}`);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not send the challenge.' });
    } finally {
        setIsChallenging(null);
    }
  }


  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Challenge a Guildmate</DialogTitle>
          <DialogDescription>
            {!(duelSettings?.isDuelsEnabled ?? true)
                ? 'The Training Grounds are currently closed by the Guild Leader.'
                : 'Select an online hero to challenge to a friendly duel.'
            }
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border">
            <div className="p-4">
            {isLoading ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin"/>
                </div>
            ) : !(duelSettings?.isDuelsEnabled ?? true) ? (
                 <p className="text-center text-muted-foreground p-4">The Training Grounds are closed.</p>
            ) : availableStudents.length === 0 ? (
                <p className="text-center text-muted-foreground p-4">No other heroes are available for a duel right now.</p>
            ) : (
                <div className="space-y-2">
                    {availableStudents.map(opp => (
                        <div key={opp.uid} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2">
                                <Image src={opp.avatarUrl} alt={opp.characterName} width={40} height={40} className="rounded-full" />
                                <span className="font-semibold">{opp.characterName}</span>
                            </div>
                            <Button size="sm" onClick={() => handleChallengeClick(opp)} disabled={!!isChallenging}>
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
    <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Challenge {opponentToChallenge?.characterName}?</AlertDialogTitle>
                <AlertDialogDescription>
                    {duelSettings?.duelCost ? `This duel has an entry cost of ${duelSettings.duelCost} Gold.` : "This duel is free."}
                    <br />
                    They will need to accept your challenge.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmChallenge}>Send Challenge</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
