
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WelcomePreviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const placeholderClassCode = 'ABC-123';

  const copyClassCode = () => {
    navigator.clipboard.writeText(placeholderClassCode);
    toast({ title: 'Class Code Copied!', description: 'You can now share it with your students.' });
    setIsOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Button>
        <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold">Welcome Pop-up Preview</h1>
            <p className="text-muted-foreground">This is a preview of the dialog that new teachers see.</p>
        </div>

        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-3xl">Welcome to The Academy of Heroes!</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Your classroom is ready! To get your students started, give them your unique Class Code and instruct them to follow these steps:
                <ol className="list-decimal list-inside mt-4 space-y-2 text-foreground text-lg">
                  <li>Go to the main login page.</li>
                  <li>Click "Create New Hero & Join a Class".</li>
                  <li>
                    Enter your Class Code:
                    <strong className="font-mono text-xl bg-primary/10 px-2 py-1 rounded-md mx-1">{placeholderClassCode}</strong>
                  </li>
                  <li>Fill out the rest of the form to create their character.</li>
                </ol>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={copyClassCode}>
                <Copy className="mr-2 h-4 w-4" /> Copy Code & Close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

