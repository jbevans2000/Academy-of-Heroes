
'use client';

import { Sword, UserPlus, LogIn, ArrowLeft, School, UserCheck } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getGlobalSettings } from '@/ai/flows/manage-settings';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [showStudentLogin, setShowStudentLogin] = useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
        const settings = await getGlobalSettings();
        if (settings.isMaintenanceModeOn) {
            const user = auth.currentUser;
            if (!user || !(settings.maintenanceWhitelist || []).includes(user.uid)) {
                router.push('/maintenance');
                return;
            }
        }
        setIsLoading(false);
    };
    checkStatus();
  }, [router]);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8"
      style={{
        backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Sep%2012%2C%202025%2C%2005_46_01%20PM.png?alt=media&token=6472f0e5-15db-43c3-bfdb-343fa35b5577')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-md">
        <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
             <div className="flex justify-center mb-4">
                <Sword className="h-12 w-12 text-primary" />
             </div>
            <CardTitle className="text-3xl font-headline">Welcome!</CardTitle>
            <CardDescription>Join a classroom guild or log in to continue your adventure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <Link href="/register" passHref>
                <Button size="lg" className="w-full text-lg py-8">
                    <UserPlus className="mr-3 h-6 w-6" />
                    Forge Your Hero & Join a Guild
                </Button>
            </Link>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-headline">
                  Or
                </span>
              </div>
            </div>

            {!showStudentLogin ? (
                <Button size="lg" variant="secondary" className="w-full text-lg py-8" onClick={() => setShowStudentLogin(true)}>
                    <LogIn className="mr-3 h-6 w-6" />
                    Login as Existing Hero
                </Button>
            ) : (
                <div className="animate-in fade-in-50">
                    <h3 className="text-center font-headline text-lg mb-2">Existing Hero Login</h3>
                    <LoginForm />
                </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-headline">
                  For the Guild Leaders
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                <Link href="/teacher/login" passHref>
                    <Button size="lg" className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700">
                        <School className="mr-3 h-6 w-6" />
                        Guild Leader's Login
                    </Button>
                </Link>
                 <Link href="/teacher/register" passHref>
                    <Button size="lg" variant="secondary" className="w-full text-lg py-6">
                        <UserCheck className="mr-3 h-6 w-6" />
                        Guild Leader's Registration
                    </Button>
                </Link>
            </div>

          </CardContent>
        </Card>
         <div className="text-center mt-4">
            <Link href="/" passHref>
                <Button variant="outline" className="bg-black/20 text-white hover:text-white hover:bg-black/40">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Button>
            </Link>
        </div>
      </div>
    </div>
  );
}
