
'use client';

import { Sword, UserPlus, LogIn, ArrowLeft, School } from 'lucide-react';
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

export default function LoginPage() {
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8"
      style={{
        backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Aug%2014%2C%202025%2C%2009_44_22%20PM.png?alt=media&token=cb2379fa-3333-44f9-b4fb-b4a72672a312')`,
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
            <CardDescription>Join a class or login to continue your adventure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <Link href="/register" passHref>
                <Button size="lg" className="w-full text-lg py-8">
                    <UserPlus className="mr-3 h-6 w-6" />
                    Create New Hero & Join a Class
                </Button>
            </Link>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-headline">
                  Or Login If You Have An Account
                </span>
              </div>
            </div>

            <LoginForm />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-headline">
                  Are you a teacher?
                </span>
              </div>
            </div>

            <Link href="/teacher/register" passHref>
                <Button size="lg" className="w-full text-lg py-8 bg-blue-600 hover:bg-blue-700">
                    <School className="mr-3 h-6 w-6" />
                    New Teacher Registration
                </Button>
            </Link>

          </CardContent>
        </Card>
         <div className="text-center mt-4">
            <Link href="/" passHref>
                <Button variant="outline" className="bg-black/20">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Button>
            </Link>
        </div>
      </div>
    </div>
  );
}
