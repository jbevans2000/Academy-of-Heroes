'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc, collection, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollText, ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface PowerLogEntry {
  id: string;
  round: number;
  casterName: string;
  powerName: string;
  description: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

export function BattleLog({ teacherUid }: { teacherUid: string }) {
    const [logEntries, setLogEntries] = useState<PowerLogEntry[]>([]);
    const [isOpen, setIsOpen] = useState(true);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!teacherUid) return;
        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const unsubscribeLive = onSnapshot(liveBattleRef, (docSnap) => {
            if (!docSnap.exists() || docSnap.data().status === 'WAITING') {
                setLogEntries([]);
                return;
            }
            const logRef = collection(db, 'teachers', teacherUid, 'liveBattles/active-battle/battleLog');
            const q = query(logRef);
            const unsubscribeLog = onSnapshot(q, (snapshot) => {
                const entries: PowerLogEntry[] = [];
                snapshot.forEach(doc => {
                    entries.push({ id: doc.id, ...doc.data() } as PowerLogEntry);
                });
                
                // Filter out entries with null timestamps before sorting
                const sortedEntries = entries
                    .filter(entry => entry.timestamp)
                    .sort((a, b) => a.timestamp!.seconds - b.timestamp!.seconds);

                setLogEntries(sortedEntries);
            });
             return () => unsubscribeLog();
        });

        return () => unsubscribeLive();
    }, [teacherUid]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logEntries])
    
    const titleColor = logEntries.length > 0 ? 'text-black' : '';

    return (
        <Card className="flex flex-col bg-card/60 backdrop-blur-sm">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer">
                        <CardTitle className={`flex items-center gap-2 ${titleColor}`}><ScrollText/> Battle Log</CardTitle>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="flex-grow overflow-hidden flex flex-col max-h-48">
                        <div className="flex-grow overflow-y-auto pr-4 space-y-3">
                            {logEntries.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground">No powers have been used yet.</p>
                            ) : (
                                logEntries.map(log => (
                                    <div key={log.id} className="text-sm text-black">
                                        <span className="font-bold">{log.casterName}</span>
                                        <span> used </span>
                                        <span className="font-semibold">{log.powerName}</span>
                                        <span>. </span> 
                                        <span className="italic">{log.description}</span>
                                    </div>
                                ))
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    )
}
