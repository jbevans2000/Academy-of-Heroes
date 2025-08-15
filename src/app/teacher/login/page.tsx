
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { School, Loader2 } from 'lucide-react';

export default function TeacherLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    setIsLoading(true);
    // Directly navigate to the dashboard without authentication
    router.push('/teacher/dashboard');
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <School className="h-10 w-10 text-primary" />
        </div>
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline text-primary">
              Teacher Dashboard
            </CardTitle>
            <CardDescription>
              Click below to view student progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button type="button" className="w-full" onClick={handleLogin} disabled={isLoading}>
                 {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                View Dashboard
              </Button>
            </div>
             <div className="mt-4 text-center text-sm">
                <Button
                    type="button"
                    variant="link"
                    className="w-full"
                    onClick={() => router.push('/')}
                    disabled={isLoading}
                >
                    Back to Student Login
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
