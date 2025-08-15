
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Shield } from 'lucide-react';

interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'SHOWING_RESULTS';
  currentQuestionIndex: number;
}

export default function LiveBattlePage() {
  const [battleState, setBattleState] = useState<LiveBattleState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for real-time updates on the active-battle document
    const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
    
    const unsubscribe = onSnapshot(liveBattleRef, (doc) => {
      if (doc.exists()) {
        setBattleState(doc.data() as LiveBattleState);
      } else {
        // If the document doesn't exist, it means no battle is active.
        setBattleState({
          battleId: null,
          status: 'WAITING',
          currentQuestionIndex: 0,
        });
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to live battle state:", error);
      setIsLoading(false);
      // You could add a toast message here for the student
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  if (isLoading || !battleState) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold">Connecting to the Battle...</h1>
      </div>
    );
  }

  if (battleState.status === 'WAITING') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 text-center">
        <Shield className="h-24 w-24 text-primary mb-6 animate-pulse" />
        <h1 className="text-4xl font-bold tracking-tight">Waiting Room</h1>
        <p className="text-xl text-muted-foreground mt-2">Waiting for the Boss to appear!</p>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-8" />
      </div>
    );
  }

  // Placeholder for the active battle view
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <h1 className="text-2xl">Battle is in Progress!</h1>
      <p>Battle ID: {battleState.battleId}</p>
      <p>Question: {battleState.currentQuestionIndex + 1}</p>
    </div>
  );
}
