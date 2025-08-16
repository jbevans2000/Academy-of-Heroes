
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, writeBatch, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';

export default function FixHubsPage() {
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleFixHubs = async () => {
    setIsFixing(true);
    try {
      const hubsRef = collection(db, 'questHubs');
      // Query for any hub where the 'hubOrder' field does NOT exist.
      // Firestore doesn't have a "does not exist" query, so we fetch all and filter client-side.
      // This is acceptable for a small number of hubs in a one-time utility.
      const querySnapshot = await getDocs(hubsRef);

      const batch = writeBatch(db);
      let hubToUpdate = null;

      // Find the first document that is missing the 'hubOrder' field.
      for (const doc of querySnapshot.docs) {
          const data = doc.data();
          if (data.hubOrder === undefined || data.hubOrder === null) {
              hubToUpdate = doc;
              break; // Stop after finding the first one.
          }
      }

      if (!hubToUpdate) {
        toast({
          variant: 'destructive',
          title: 'Hub Not Found',
          description: 'Could not find a hub that needs to be updated. It might already be fixed.',
        });
        setIsFixing(false);
        return;
      }
      
      batch.update(hubToUpdate.ref, { hubOrder: 1 });
      await batch.commit();
      
      toast({
          title: `Hub "${hubToUpdate.data().name}" Updated!`,
          description: 'The hub has been set as the first in the sequence.',
      });

      router.push('/teacher/quests');

    } catch (error) {
      console.error("Error fixing hub order: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred while trying to fix the hub order.',
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Quest Hub Data Fix</CardTitle>
            <CardDescription>
              This is a one-time utility to ensure your existing quest hubs are correctly configured for the new progression system. It will find the first hub that doesn't have an order number and set it to 1.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-6 text-muted-foreground">
              Click the button below to patch your quest hub data. You will be redirected back to the quests page afterward.
            </p>
            <Button onClick={handleFixHubs} disabled={isFixing} size="lg">
              {isFixing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
              Set Hub Order
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
