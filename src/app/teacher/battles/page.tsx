
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Define a type for the battle document for type safety
interface BossBattle {
  id: string;
  battleName: string;
  // Add other properties as they are defined
}

export default function BossBattlesPage() {
  const [battles, setBattles] = useState<BossBattle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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
        // Optionally, add a toast notification for the error
      } finally {
        setIsLoading(false);
      }
    };

    fetchBattles();
  }, []);

  const navigateToCreate = () => {
    router.push('/teacher/battles/new');
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Boss Battles</h1>
          <Button onClick={navigateToCreate}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Boss Battle
          </Button>
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
            {/* This is where the list of boss battles will be rendered */}
            {battles.map((battle) => (
              <Card key={battle.id}>
                <CardHeader>
                  <CardTitle>{battle.battleName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Start Battle</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
