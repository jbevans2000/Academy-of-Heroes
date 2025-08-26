
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { MailCheck, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
    const router = useRouter();

    return (
         <div 
            className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8"
            style={{
              backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-b2ed6807-b64f-48e1-9b8c-a2d0b719db78.jpg?alt=media&token=793c0484-06f3-49ab-9557-9ca0a9b0f6bf')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
        >
            <Card className="w-full max-w-lg shadow-2xl bg-card/80 backdrop-blur-sm text-center">
                <CardHeader>
                     <div className="flex justify-center mb-4">
                        <MailCheck className="h-16 w-16 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-headline">A Message from the Academy!</CardTitle>
                    <CardDescription>Your request to form a guild has been received. One final step remains!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-lg">
                        A raven has been dispatched to your email address carrying a scroll of verification. Please check your inbox (and the raven's roost, or spam folder) and click the link upon the scroll to finalize your registration.
                    </p>
                    <p className="text-muted-foreground">
                        Once your email has been verified, you may enter the Guild Leader's Podium and begin your journey.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" asChild>
                        <Link href="/teacher/login">
                             <LogIn className="mr-2 h-4 w-4" />
                            Return to Login
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
