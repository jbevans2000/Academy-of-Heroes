
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
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-76d263d1-64d5-4a17-bda2-a3dc4f20d94f.jpg?alt=media&token=c42c3ef2-243c-4458-9cd5-10bc3bf7fadd')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <Card className="w-full max-w-md bg-transparent border-none shadow-none text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <Hourglass className="h-16 w-16 text-primary animate-spin" />
                    </div>
                    <CardTitle className="text-4xl font-headline text-black text-outline">Awaiting Approval</CardTitle>
                    <CardDescription className="text-xl text-black text-outline">
                        Your request to join the guild has been sent!
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-lg text-black text-outline">
                        Your Guild Leader must first approve your hero's application before you can enter the realm. They have been notified of your request.
                    </p>
                    <p className="text-lg text-black text-outline">
                        Please check back later. You will be able to log in and begin your adventure once you are approved.
                    </p>
                     <Button variant="outline" onClick={handleLogout} className="mt-4 bg-black/20 hover:bg-black/40 text-white border-white/50">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
