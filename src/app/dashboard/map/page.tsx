
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { LayoutDashboard } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { collection, getDocs, doc, onSnapshot, query, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { QuestHub } from '@/lib/quests';
import type { Student } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';


export default function WorldMapPage() {
    const router = useRouter();
    const [hubs, setHubs] = useState<QuestHub[]>([]);
    const [student, setStudent] = useState<Student | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const defaultWorldMapImageUrl = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FWorld%20Map.JPG?alt=media&token=2d88af7d-a54c-4f34-b4c7-1a7c04485b8b";
    const [worldMapUrl, setWorldMapUrl] = useState(defaultWorldMapImageUrl);

    useEffect(() => {
        const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const studentMetaRef = doc(db, 'students', user.uid);
                const studentMetaSnap = await getDoc(studentMetaRef);

                if (studentMetaSnap.exists()) {
                    const foundTeacherUid = studentMetaSnap.data().teacherUid;
                    setTeacherUid(foundTeacherUid);
                    
                    const teacherRef = doc(db, 'teachers', foundTeacherUid);
                    const teacherSnap = await getDoc(teacherRef);
                    if (teacherSnap.exists() && teacherSnap.data().worldMapUrl) {
                        setWorldMapUrl(teacherSnap.data().worldMapUrl);
                    }

                    const studentRef = doc(db, 'teachers', foundTeacherUid, 'students', user.uid);
                    const studentUnsubscribe = onSnapshot(studentRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setStudent(docSnap.data() as Student);
                        } else {
                            router.push('/');
                        }
                        setIsLoading(false);
                    });
                    return () => studentUnsubscribe();
                } else {
                     router.push('/');
                     setIsLoading(false);
                }
            } else {
                router.push('/');
                setIsLoading(false);
            }
        });
        return () => authUnsubscribe();
    }, [router]);

    useEffect(() => {
        if (!teacherUid) return;

        const fetchHubs = async () => {
            try {
                const hubsQuery = query(collection(db, 'teachers', teacherUid, 'questHubs'), orderBy('hubOrder'));
                const querySnapshot = await getDocs(hubsQuery);
                const hubsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
                setHubs(hubsData);
            } catch (error) {
                console.error("Error fetching quest hubs:", error);
            }
        };
        fetchHubs();
    }, [teacherUid]);

    const unlockedHubs = student
      ? hubs.filter(hub => {
          // New logic: Check isActive status
          const isActive = hub.isActive ?? true; // Default to active if not set
          if (!isActive) return false;

          // Check if it's a side quest hub, which is always visible if active
          if (hub.hubType === 'sidequest') {
              return true;
          }

          // Existing logic for standard hubs
          const isVisible = hub.isVisibleToAll ?? true;
          if (isVisible) return true;
          return hub.assignedCompanyIds?.includes(student.companyId || '') ?? false;
      })
      : [];

    return (
        <div className="relative flex flex-col items-center justify-start bg-background p-2">
            <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FWorld%20Maps%2FWorld%20Map%20(3).jpg?alt=media&token=f46483bd-849a-45cc-9e28-fe59372017b6')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.5,
                }}
            />
            <Card className="w-full max-w-7xl shadow-2xl">
                <CardHeader className="py-4">
                    <CardTitle className="text-3xl font-bold text-center text-primary">The World of Luminaria</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                    <div className="relative aspect-[2048/1536] rounded-lg overflow-hidden bg-muted/50">
                        <Image
                            src={worldMapUrl}
                            alt="World Map"
                            fill
                            className="object-contain"
                            priority
                         />
                         {isLoading || !student ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                               <Skeleton className="w-24 h-8" />
                            </div>
                         ) : (
                            unlockedHubs.map(hub => {
                                const isSideQuest = hub.hubType === 'sidequest';
                                const isCompleted = !isSideQuest && hub.hubOrder <= (student.hubsCompleted || 0);
                                const isCurrent = !isSideQuest && hub.hubOrder === (student.hubsCompleted || 0) + 1;
                                
                                if (!isSideQuest && !isCompleted && !isCurrent) return null;

                                let markerColorClass = "bg-gray-400";
                                if (isSideQuest) {
                                    markerColorClass = "bg-purple-500";
                                } else if (isCurrent) {
                                    markerColorClass = "bg-yellow-400 animate-pulse-glow";
                                } else if (isCompleted) {
                                    markerColorClass = "bg-green-500";
                                }

                                return (
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
                                        <div className={cn("w-5 h-5 rounded-full ring-2 ring-white shadow-xl", markerColorClass)}></div>
                                    </div>
                                </Link>
                            )})
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
