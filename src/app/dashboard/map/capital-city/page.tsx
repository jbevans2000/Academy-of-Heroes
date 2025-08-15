
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';

export default function CapitalCityMapPage() {
    const router = useRouter();
    const capitalCityMapUrl = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FCapital%20City%20Map%20-%20Winter.png?alt=media&token=b2dc0a99-b397-4f77-aed0-a712faea8353";

    return (
        <div className="flex flex-col items-center justify-start bg-background p-2">
            <Card className="w-full max-w-7xl shadow-2xl">
                <CardHeader className="py-4">
                    <CardTitle className="text-3xl font-bold text-center text-primary">Capital City of Luminaria</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                    <div className="relative aspect-[2048/1152] rounded-lg overflow-hidden bg-muted/50">
                        <Image
                            src={capitalCityMapUrl}
                            alt="Capital City Map"
                            fill
                            className="object-contain"
                            priority
                         />
                         {/* Quest nodes for the city will go here */}
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
