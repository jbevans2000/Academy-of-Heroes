
'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MaintenancePage() {
    return (
        <div 
            className="flex flex-col items-center justify-end min-h-screen bg-cover bg-center p-8"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FMaintenence.png?alt=media&token=1dc89667-524b-455f-9fd7-cee662b27e1f')`,
            }}
        >
            <div className="text-center pb-12">
                <Link href="http://www.academy-heroes.com" passHref>
                    <Button size="lg" variant="secondary" className="text-lg py-6 px-8">
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Return to Home Page
                    </Button>
                </Link>
            </div>
        </div>
    );
}
