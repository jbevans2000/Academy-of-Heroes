
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
                    <CardTitle className="text-3xl font-headline">Verify Your Email Address</CardTitle>
                    <CardDescription>One final step to forge your new account!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-lg">
                        We have sent a verification link to your email address. Please check your inbox (and your spam folder, just in case) and click the link to complete your registration.
                    </p>
                    <p className="text-muted-foreground">
                        Once you have verified your email, you can log in to your new Guild Leader account.
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
