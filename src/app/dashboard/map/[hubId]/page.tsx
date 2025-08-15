
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { QuestHub, Chapter } from '@/lib/quests';
import { Skeleton } from '@/components/ui/skeleton';

export default function HubMapPage() {
    const router = useRouter();
    const params = useParams();
    const hubId = params.hubId as string;

    const [hub, setHub] = useState<QuestHub | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!hubId) return;

        const fetchHubData = async () => {
            setIsLoading(true);
            try {
                // Fetch hub details
                const hubDocRef = doc(db, 'questHubs', hubId);
                const hubDocSnap = await getDoc(hubDocRef);
                if (hubDocSnap.exists()) {
                    setHub({ id: hubDocSnap.id, ...hubDocSnap.data() } as QuestHub);
                }

                // Fetch chapters for this hub
                const chaptersQuery = query(collection(db, 'chapters'), where('hubId', '==', hubId));
                const chaptersSnapshot = await getDocs(chaptersQuery);
                const chaptersData = chaptersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
                setChapters(chaptersData);

            } catch (error) {
                console.error("Error fetching hub data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHubData();
    }, [hubId]);


    if (isLoading) {
        return (
             <div className="flex flex-col items-center justify-start bg-background p-2">
                <Skeleton className="h-24 w-full max-w-7xl" />
                <div className="flex justify-center gap-4 mt-4">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-48" />
                </div>
            </div>
        )
    }

    if (!hub) {
        return <p>Hub not found.</p>;
    }

    return (
        <div className="flex flex-col items-center justify-start bg-background p-2">
            <Card className="w-full max-w-7xl shadow-2xl">
                <CardHeader className="py-4">
                    <CardTitle className="text-3xl font-bold text-center text-primary">{hub.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                    <div className="relative aspect-[2048/1152] rounded-lg overflow-hidden bg-muted/50">
                        <Image
                            src={hub.worldMapUrl}
                            alt={`${hub.name} Map`}
                            fill
                            className="object-contain"
                            priority
                         />
                         {chapters.map(chapter => (
                             <Link key={chapter.id} href={`/dashboard/map/${hubId}/${chapter.id}`} passHref>
                                <div
                                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                    style={{
                                        left: `${chapter.coordinates.x}%`,
                                        top: `${chapter.coordinates.y}%`,
                                    }}
                                >
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                                        <div className="text-white font-bold text-shadow-lg bg-black/50 rounded px-2 py-1 mb-1">
                                            Chapter {chapter.chapterNumber}
                                        </div>
                                        <div className="text-white font-semibold text-shadow-lg bg-black/50 rounded px-2 py-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                                            {chapter.title}
                                        </div>
                                    </div>
                                    <div className="w-5 h-5 bg-yellow-400 rounded-full ring-2 ring-white shadow-xl animate-pulse-glow"></div>
                                </div>
                            </Link>
                         ))}
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-center gap-4 mt-4">
                <Button 
                    onClick={() => router.push('/dashboard/map')} 
                    variant="outline"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Return to World Map
                </Button>
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
