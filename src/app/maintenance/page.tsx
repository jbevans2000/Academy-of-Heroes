

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getGlobalSettings } from '@/ai/flows/manage-settings';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';


export default function MaintenancePage() {
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await getGlobalSettings();
                if (settings.maintenanceEndsAt) {
                    const date = (settings.maintenanceEndsAt as Timestamp).toDate();
                    setEndTime(date);
                }
            } catch (error) {
                console.error("Could not fetch maintenance end time:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    return (
        <div 
            className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center p-8 text-center text-white"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FMaintenence.png?alt=media&token=1dc89667-524b-455f-9fd7-cee662b27e1f')`,
            }}
        >
             <div className="bg-black/70 p-8 rounded-lg shadow-2xl backdrop-blur-sm max-w-3xl space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold font-headline text-shadow-lg">
                    The Academy of Heroes is under maintenence and will be back soon!
                </h1>
                {isLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                ) : endTime ? (
                    <p className="text-xl md:text-2xl font-semibold text-yellow-300">
                        The site is expected to be back online around {format(endTime, "PPP p")}.
                    </p>
                ) : null}
            </div>
            <div className="mt-12">
                <Link href="/login" passHref>
                    <Button size="lg" variant="secondary" className="text-lg py-6 px-8">
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Return to Login
                    </Button>
                </Link>
            </div>
        </div>
    );
}

