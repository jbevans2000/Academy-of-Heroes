
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Archive, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AccountArchivedPage() {
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
                        <Archive className="h-16 w-16 text-primary" />
                    </div>
                    <CardTitle className="text-4xl font-headline text-black text-outline">Account Archived</CardTitle>
                    <CardDescription className="text-xl text-black text-outline">
                        This hero's journey has been recorded in the archives.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-lg text-black text-outline">
                        This account is no longer active and cannot be used to log in. Please speak with your Guild Leader if you believe this is a mistake.
                    </p>
                     <Button variant="secondary" onClick={handleLogout} className="mt-4 bg-accent hover:bg-accent/80 text-accent-foreground">
                        <LogOut className="mr-2 h-4 w-4" />
                        Return to Login
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
