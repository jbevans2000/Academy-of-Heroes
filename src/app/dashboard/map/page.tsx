
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { LayoutDashboard } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { QuestHub } from '@/lib/quests';
import { Skeleton } from '@/components/ui/skeleton';

export default function WorldMapPage() {
    const router = useRouter();
    const [hubs, setHubs] = useState<QuestHub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const worldMapImageUrl = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FWorld%20Map.JPG?alt=media&token=2d88af7d-a54c-4f34-b4c7-1a7c04485b8b";

    useEffect(() => {
        const fetchHubs = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, 'questHubs'));
                const hubsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
                setHubs(hubsData);
            } catch (error) {
                console.error("Error fetching quest hubs:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHubs();
    }, []);

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
                         {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                               <Skeleton className="w-24 h-8" />
                            </div>
                         ) : (
                            hubs.map(hub => (
                                <Link key={hub.id} href={`/dashboard/map/${hub.id}`} passHref>
                                    <div
                                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                        style={{
                                            left: `${hub.coordinates.x}%`,
                                            top: `${hub.coordinates.y}%`,
                                        }}
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-white font-bold text-shadow-lg transition-transform duration-300 group-hover:scale-110 bg-black/50 rounded px-2 py-1">
                                            {hub.name}
                                        </div>
                                        <div className="w-5 h-5 bg-yellow-400 rounded-full ring-2 ring-white shadow-xl animate-pulse-glow"></div>
                                    </div>
                                </Link>
                            ))
                         )}
                    </div>
                </CardContent>
            </Card>
             <div className="flex justify-center gap-4 mt-4">
                <Button 
                    onClick={() => router.push('/dashboard')}
                    variant="outline"
                >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Return to Dashboard
                </Button>
            </div>
        </div>
    );
}
