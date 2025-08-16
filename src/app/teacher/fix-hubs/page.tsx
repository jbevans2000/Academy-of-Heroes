
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
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
      const q = query(hubsRef, where('name', '==', 'The Capitol City of Luminaria'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Hub Not Found',
          description: 'Could not find a hub named "The Capitol City of Luminaria" to update.',
        });
        return;
      }

      const batch = writeBatch(db);
      let updated = false;

      querySnapshot.forEach(doc => {
        const hubData = doc.data();
        if (hubData.hubOrder !== 1) {
            batch.update(doc.ref, { hubOrder: 1 });
            updated = true;
        }
      });
      
      if (updated) {
        await batch.commit();
        toast({
            title: 'Hub Updated!',
            description: '"The Capitol City of Luminaria" has been set as the first hub in the sequence.',
        });
      } else {
         toast({
            title: 'No Update Needed',
            description: 'The hub was already correctly configured.',
        });
      }

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
              This is a one-time utility to ensure your existing "The Capitol City of Luminaria" quest hub is correctly configured as the first hub in the new progression system.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-6 text-muted-foreground">
              Click the button below to find the hub and set its `hubOrder` to 1. You will be redirected back to the quests page afterward.
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
