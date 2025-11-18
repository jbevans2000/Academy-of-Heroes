
'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc, collection, query, orderBy } from 'firebase/firestore';
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

    useEffect(() => {
        if (!teacherUid) return;

        const logRef = collection(db, 'teachers', teacherUid, 'liveBattles/active-battle/battleLog');
        const q = query(logRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entries: PowerLogEntry[] = [];
            snapshot.forEach(doc => {
                entries.push({ id: doc.id, ...doc.data() } as PowerLogEntry);
            });
            setLogEntries(entries);
        }, (error) => {
            console.error("Error fetching battle log:", error);
            // Don't toast here, as it could be noisy if the collection doesn't exist yet.
        });

        return () => unsubscribe();
    }, [teacherUid]);

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
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    )
}
