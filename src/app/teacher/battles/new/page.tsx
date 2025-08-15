
'use client';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewBossBattlePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
           <Button variant="outline" onClick={() => router.push('/teacher/battles')} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All Battles
            </Button>
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Create New Boss Battle</CardTitle>
              <CardDescription>
                Fill in the details below to create an epic boss battle for your students.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="battle-name" className="text-lg">Battle Name</Label>
                <Input id="battle-name" placeholder="e.g., The Ancient Karkorah" />
              </div>
              
              {/* Question editor will go here in the next step */}
              <div className="space-y-4 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                 <h3 className="text-lg font-semibold text-muted-foreground">Question Editor Coming Soon</h3>
                 <p className="text-sm text-muted-foreground">You will be able to add and manage questions here.</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.push('/teacher/battles')}>Cancel</Button>
                <Button>Save Boss Battle</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
