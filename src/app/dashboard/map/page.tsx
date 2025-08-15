
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';

export default function WorldMapPage() {
    const router = useRouter();
    const worldMapImageUrl = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FWorld%20Map.JPG?alt=media&token=2d88af7d-a54c-4f34-b4c7-1a7c04485b8b";
    
    // NOTE: The map's original dimensions are 2048x1536.
    // The coordinates are converted to percentages to maintain position on different screen sizes.
    // X: 1200 -> (1200 / 2048) * 100 = 58.59%
    // Y: 1115 -> (1115 / 1536) * 100 = 72.59%
    const capitalCityNode = {
      name: 'Capital City',
      href: '/dashboard/map/capital-city',
      style: {
        left: '58.59%',
        top: '72.59%',
      },
    };

    return (
        <div className="flex flex-col items-center justify-start bg-background p-2">
            <Card className="w-full max-w-7xl shadow-2xl">
                <CardHeader className="py-4">
                    <CardTitle className="text-3xl font-bold text-center text-primary">The World of Luminaria</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                    <div className="relative aspect-[2048/1536] rounded-lg overflow-hidden bg-muted/50">
                        <Image
                            src={worldMapImageUrl}
                            alt="World Map"
                            fill
                            className="object-contain"
                            priority
                         />
                         {/* Quest Node */}
                         <Link href={capitalCityNode.href} passHref>
                            <div
                                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                style={capitalCityNode.style}
                            >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-white font-bold text-shadow-lg transition-transform duration-300 group-hover:scale-110 bg-black/50 rounded px-2 py-1">
                                    {capitalCityNode.name}
                                </div>
                                <div className="w-5 h-5 bg-yellow-400 rounded-full ring-2 ring-white shadow-xl animate-pulse-glow"></div>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>
             <Button 
                onClick={() => router.push('/dashboard')}
                className="mt-4"
                variant="outline"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
            </Button>
        </div>
    );
}
