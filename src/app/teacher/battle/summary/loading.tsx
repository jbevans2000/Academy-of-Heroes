
'use client';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Loader2 } from 'lucide-react';

export default function LoadingSummary() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary mb-4" />
          <h1 className="text-3xl font-bold">Battle Report Generating!</h1>
          <p className="text-muted-foreground mt-2">The Oracle is consulting the chronicles...</p>
        </div>
      </main>
    </div>
  );
}
