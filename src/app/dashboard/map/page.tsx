
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from "lucide-react";
import Image from 'next/image';

export default function WorldMapPage() {
    const router = useRouter();
    const worldMapImageUrl = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FWorld%20Map.JPG?alt=media&token=2d88af7d-a54c-4f34-b4c7-1a7c04485b8b";

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <Card className="w-full max-w-6xl shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center text-primary">World Map</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/50">
                        <Image
                            src={worldMapImageUrl}
                            alt="World Map"
                            fill
                            className="object-cover"
                            priority
                         />
                    </div>
                </CardContent>
            </Card>
             <Button 
                onClick={() => router.back()} 
                className="mt-6"
                variant="outline"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
            </Button>
        </div>
    );
}
