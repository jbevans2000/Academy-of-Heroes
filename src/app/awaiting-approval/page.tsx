
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Hourglass, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AwaitingApprovalPage() {
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    return (
        <div 
            className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-b18c1ab2-8859-45c9-a9f8-d48645d2eadd.jpg?alt=media&token=f7b64b1f-597b-47a5-b15a-80d08fdd7d6d')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <Hourglass className="h-16 w-16 text-primary animate-spin" />
                    </div>
                    <CardTitle className="text-3xl font-headline">Awaiting Approval</CardTitle>
                    <CardDescription className="text-lg">
                        Your request to join the guild has been sent!
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        Your Guild Leader must first approve your hero's application before you can enter the realm. They have been notified of your request.
                    </p>
                    <p className="text-muted-foreground">
                        Please check back later. You will be able to log in and begin your adventure once you are approved.
                    </p>
                     <Button variant="outline" onClick={handleLogout} className="mt-4">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

    