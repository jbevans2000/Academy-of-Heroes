
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// These types will be expanded later
interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'SHOWING_RESULTS';
  currentQuestionIndex: number;
}

interface Battle {
    id: string;
    battleName: string;
    // ... other battle properties
}

export default function TeacherLiveBattlePage() {
  const router = useRouter();
  const params = useParams();
  const battleId = params.id as string;

  const [battle, setBattle] = useState<Battle | null>(null);
  const [liveState, setLiveState] = useState<LiveBattleState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the static battle definition once
  useEffect(() => {
    if (!battleId) return;
    const fetchBattle = async () => {
      const docRef = doc(db, 'bossBattles', battleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBattle({ id: docSnap.id, ...docSnap.data() } as Battle);
      } else {
        // Handle battle not found
      }
    };
    fetchBattle();
  }, [battleId]);

  // Listen for real-time updates on the live battle state
  useEffect(() => {
    const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
    const unsubscribe = onSnapshot(liveBattleRef, (doc) => {
      if (doc.exists()) {
        setLiveState(doc.data() as LiveBattleState);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading || !battle || !liveState) {
    return (
        <>
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    <Skeleton className="w-1/3 h-10" />
                    <Skeleton className="w-full h-64" />
                    <Skeleton className="w-full h-32" />
                </div>
            </main>
        </>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{battle.battleName}</CardTitle>
                    <CardDescription>Live Battle Control Panel</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Status: <span className="font-bold text-primary">{liveState.status}</span></p>
                    <p>Current Question: <span className="font-bold">{liveState.currentQuestionIndex + 1}</span></p>
                    
                    <div className="mt-6 p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg mb-2">Controls</h3>
                        <div className="flex gap-4">
                             <Button disabled>End Round</Button>
                             <Button disabled>Next Question</Button>
                             <Button variant="destructive">End Battle</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Live Student Responses</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Response tracking will appear here.</p>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
