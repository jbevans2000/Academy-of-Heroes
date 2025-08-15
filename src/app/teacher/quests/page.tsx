
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, LayoutDashboard } from 'lucide-react';

export default function QuestsPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Quests</h1>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/teacher/dashboard')} variant="outline">
              <LayoutDashboard className="mr-2 h-5 w-5" />
              Return to Dashboard
            </Button>
            <Button onClick={() => router.push('/teacher/quests/new')}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Quest
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-20 text-center">
            <h2 className="text-xl font-semibold text-muted-foreground">No Quests Created Yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">This area will show a list of all the quests and chapters you have created.</p>
            <Button onClick={() => router.push('/teacher/quests/new')} className="mt-4">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Your First Quest
            </Button>
          </div>

      </main>
    </div>
  );
}
