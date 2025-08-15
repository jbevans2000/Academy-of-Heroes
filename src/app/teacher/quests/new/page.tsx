
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function NewQuestPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="outline" onClick={() => router.push('/teacher/quests')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Quests
          </Button>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl">Create New Quest</CardTitle>
              <CardDescription>
                Design a new chapter for your students. Start by defining the Hub, then add the chapter content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              <div className="space-y-4 p-6 border rounded-lg">
                <h3 className="text-xl font-semibold">Phase 1: Quest Hub</h3>
                <p className="text-muted-foreground">This section will contain the dropdown to select an existing hub or create a new one, including the map for drag-and-drop positioning. (Coming in Phase 2)</p>
              </div>
              
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Phase 2: Chapter Content</h3>
                <p className="text-muted-foreground">This section will contain the form to add the chapter title, story text, lesson text, images, and video URLs. (Coming in Phase 3)</p>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button size="lg" disabled>
                    Save Quest
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
