

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { collection, getDocs, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { QuestHub, Chapter } from '@/lib/quests';
import type { Student } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

export default function HubMapPage() {
    const router = useRouter();
    const params = useParams();
    const hubId = params.hubId as string;

    const [hub, setHub] = useState<QuestHub | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [student, setStudent] = useState<Student | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // This logic seems complex, let's simplify. A student belongs to one teacher.
                const studentMetaRef = doc(db, 'students', user.uid);
                const studentMetaSnap = await getDoc(studentMetaRef);

                if (studentMetaSnap.exists()) {
                    const teacherUid = studentMetaSnap.data().teacherUid;
                    setTeacherUid(teacherUid);
                    const studentDocRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
                    const studentUnsubscribe = onSnapshot(studentDocRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setStudent(docSnap.data() as Student);
                        } else {
                            router.push('/');
                        }
                    });
                    return () => studentUnsubscribe();
                } else {
                    router.push('/');
                }
            } else {
                router.push('/');
            }
        });
        return () => authUnsubscribe();
    }, [router]);


    useEffect(() => {
        if (!hubId || !teacherUid) return;

        const fetchHubData = async () => {
            setIsLoading(true);
            try {
                // Fetch hub details
                const hubDocRef = doc(db, 'teachers', teacherUid, 'questHubs', hubId);
                const hubDocSnap = await getDoc(hubDocRef);
                if (hubDocSnap.exists()) {
                    setHub({ id: hubDocSnap.id, ...hubDocSnap.data() } as QuestHub);
                }

                // Fetch chapters for this hub, ordered by chapter number
                const chaptersQuery = query(collection(db, 'teachers', teacherUid, 'chapters'), where('hubId', '==', hubId));
                const chaptersSnapshot = await getDocs(chaptersQuery);
                let chaptersData = chaptersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
                chaptersData.sort((a, b) => a.chapterNumber - b.chapterNumber);
                setChapters(chaptersData);

            } catch (error) {
                console.error("Error fetching hub data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHubData();
    }, [hubId, teacherUid]);

    const lastCompletedChapter = student?.questProgress?.[hubId] || 0;
    const unlockedChapters = chapters.filter(chapter => chapter.chapterNumber <= lastCompletedChapter + 1);

    if (isLoading || !student) {
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
    
    const completedChapters = unlockedChapters.filter(c => c.chapterNumber <= lastCompletedChapter);
    const currentChapter = unlockedChapters.find(c => c.chapterNumber === lastCompletedChapter + 1);

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
                         <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                            {completedChapters.slice(0, -1).map((chapter, index) => {
                                const nextChapter = completedChapters[index + 1];
                                return (
                                    <line
                                        key={`line-${chapter.id}`}
                                        x1={`${chapter.coordinates.x}%`}
                                        y1={`${chapter.coordinates.y}%`}
                                        x2={`${nextChapter.coordinates.x}%`}
                                        y2={`${nextChapter.coordinates.y}%`}
                                        stroke="#10B981"
                                        strokeWidth="3"
                                    />
                                );
                            })}
                         </svg>
                         {completedChapters.map(chapter => (
                             <Link key={`completed-${chapter.id}`} href={`/dashboard/map/${hubId}/${chapter.id}`} passHref>
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
                                    <div className="w-5 h-5 bg-green-500 rounded-full ring-2 ring-white shadow-xl"></div>
                                </div>
                             </Link>
                         ))}
                          {currentChapter && (
                             <Link key={`current-${currentChapter.id}`} href={`/dashboard/map/${hubId}/${currentChapter.id}`} passHref>
                                <div
                                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                    style={{
                                        left: `${currentChapter.coordinates.x}%`,
                                        top: `${currentChapter.coordinates.y}%`,
                                    }}
                                >
                                     <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                                        <div className="text-white font-bold text-shadow-lg bg-black/50 rounded px-2 py-1 mb-1">
                                            Chapter {currentChapter.chapterNumber}
                                        </div>
                                        <div className="text-white font-semibold text-shadow-lg bg-black/50 rounded px-2 py-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                                            {currentChapter.title}
                                        </div>
                                    </div>
                                    <div className="w-5 h-5 bg-yellow-400 rounded-full ring-2 ring-white shadow-xl animate-pulse-glow"></div>
                                </div>
                            </Link>
                         )}
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
