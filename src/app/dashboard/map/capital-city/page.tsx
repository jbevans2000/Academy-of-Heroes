
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';

export default function CapitolCityMapPage() {
    const router = useRouter();
    const capitolCityMapUrl = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FCapital%20City%20Map%20-%20Winter.png?alt=media&token=b2dc0a99-b397-4f77-aed0-a712faea8353";

    // NOTE: The map's original dimensions are 2048x1152.
    // The coordinates are converted to percentages to maintain position on different screen sizes.
    // X: 710 -> (710 / 2048) * 100 = 34.67%
    // Y: 200 -> (200 / 1152) * 100 = 17.36%
    const chapter1Node = {
      name: 'Chapter 1 - A Summons from the Throne',
      href: '#', // Placeholder link
      style: {
        left: '34.67%',
        top: '17.36%',
      },
    };

    return (
        <div className="flex flex-col items-center justify-start bg-background p-2">
            <Card className="w-full max-w-7xl shadow-2xl">
                <CardHeader className="py-4">
                    <CardTitle className="text-3xl font-bold text-center text-primary">Capitol City of Luminaria</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                    <div className="relative aspect-[2048/1152] rounded-lg overflow-hidden bg-muted/50">
                        <Image
                            src={capitolCityMapUrl}
                            alt="Capitol City Map"
                            fill
                            className="object-contain"
                            priority
                         />
                         {/* Quest Node */}
                         <Link href={chapter1Node.href} passHref>
                            <div
                                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                style={chapter1Node.style}
                            >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-white font-bold text-shadow-lg transition-transform duration-300 group-hover:scale-110 bg-black/50 rounded px-2 py-1">
                                    {chapter1Node.name}
                                </div>
                                <div className="w-5 h-5 bg-yellow-400 rounded-full ring-2 ring-white shadow-xl animate-pulse-glow"></div>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>
             <Button 
                onClick={() => router.back()} 
                className="mt-4"
                variant="outline"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to World Map
            </Button>
        </div>
    );
}
