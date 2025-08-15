
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Eye, Loader2, LayoutDashboard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface BossBattle {
  id: string;
  battleName: string;
}

export default function BossBattlesPage() {
  const [battles, setBattles] = useState<BossBattle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingBattleId, setStartingBattleId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchBattles = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'bossBattles'));
        const battlesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as BossBattle));
        setBattles(battlesData);
      } catch (error) {
        console.error("Error fetching boss battles: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch battle data.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBattles();
  }, [toast]);

  const handleStartBattle = async (battleId: string) => {
    setStartingBattleId(battleId);
    try {
        const batch = writeBatch(db);

        // 1. Delete the old active-battle document to ensure a clean slate
        const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
        await deleteDoc(liveBattleRef).catch(err => {
            // It's okay if the doc doesn't exist, so we can ignore "not-found" errors.
            if (err.code !== 'not-found') {
                throw err;
            }
        });

        // 2. Set the new active battle state
        batch.set(liveBattleRef, {
            battleId: battleId,
            status: 'IN_PROGRESS', 
            currentQuestionIndex: 0,
        });

        // 3. Clear any previous responses from the old subcollection (as a safety measure)
        const responsesQuery = await getDocs(collection(liveBattleRef, 'responses'));
        responsesQuery.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Commit the batch
        await batch.commit();

        toast({
            title: 'Battle Started!',
            description: 'Students can now join the battle.',
        });

        // Navigate the teacher to their live battle view
        router.push(`/teacher/battle/live/${battleId}`);

    } catch (error) {
        console.error("Error starting battle:", error);
        toast({
            variant: 'destructive',
            title: 'Failed to Start Battle',
            description: 'Could not update the live battle state. Please try again.',
        });
    } finally {
        setStartingBattleId(null);
    }
  };

  const navigateToCreate = () => {
    router.push('/teacher/battles/new');
  };
  
  const navigateToDashboard = () => {
    router.push('/teacher/dashboard');
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Boss Battles</h1>
          <div className="flex gap-2">
            <Button onClick={navigateToDashboard} variant="outline">
              <LayoutDashboard className="mr-2 h-5 w-5" />
              Return to Dashboard
            </Button>
            <Button onClick={navigateToCreate}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Boss Battle
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : battles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-20 text-center">
            <h2 className="text-xl font-semibold text-muted-foreground">No Boss Battles Have Been Created</h2>
            <p className="mt-2 text-sm text-muted-foreground">Get started by creating your first boss battle.</p>
            <Button onClick={navigateToCreate} className="mt-4">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create a Boss Battle
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {battles.map((battle) => (
              <Card key={battle.id}>
                <CardHeader>
                  <CardTitle>{battle.battleName}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-2">
                        <Button 
                            className="w-full" 
                            onClick={() => handleStartBattle(battle.id)}
                            disabled={startingBattleId === battle.id}
                        >
                            {startingBattleId === battle.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Start Battle
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => router.push(`/teacher/battles/preview/${battle.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Preview Battle
                        </Button>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
