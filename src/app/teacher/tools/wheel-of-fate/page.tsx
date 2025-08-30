
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface WheelEvent {
    id: string;
    text: string;
}

export default function WheelOfFatePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [events, setEvents] = useState<WheelEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState<WheelEvent | null>(null);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                setTeacher(user);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!teacher) return;
        const eventsRef = collection(db, 'teachers', teacher.uid, 'wheelOfFateEvents');
        const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WheelEvent)));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [teacher]);

    const handleSpin = () => {
        if (events.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Events',
                description: 'Please add some events to the wheel before spinning.',
            });
            return;
        }
        
        setIsSpinning(true);
        setResult(null);

        // Calculate a random end rotation. More spins make it feel slower over the duration.
        const newRotation = rotation + 360 * 6 + Math.random() * 360; 
        setRotation(newRotation);

        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * events.length);
            setResult(events[randomIndex]);
            setIsSpinning(false);
        }, 5000); // Duration of the spin animation
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
            <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-a83d7350-f8d1-4e49-980b-2200a7b4588e.jpg?alt=media&token=81c15f9d-50b2-4d9a-9e19-58b6bd27f525')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
             <div className="absolute inset-0 bg-black/30 -z-10" />
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center text-white">
                <div className="absolute top-24 left-4">
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                </div>
                <div className="relative flex items-center justify-center w-[600px] h-[600px]">
                    <Image
                        src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2FThe%20Wheel%20of%20Fate%202.png?alt=media&token=1e4b790b-a126-4c23-9960-fb2ce9d89896"
                        alt="The Wheel of Fate"
                        width={600}
                        height={600}
                        className="transition-transform duration-[5000ms] ease-out"
                        style={{ transform: `rotate(${rotation}deg)` }}
                        priority
                    />
                    <div 
                        className="absolute w-0 h-0 top-[38px] left-1/2 -translate-x-1/2"
                        style={{
                            borderLeft: '20px solid transparent',
                            borderRight: '20px solid transparent',
                            borderTop: '30px solid hsl(var(--primary))',
                        }}
                    />
                </div>
                
                <div className="mt-8 text-center min-h-[120px] w-full max-w-2xl bg-black/50 p-6 rounded-xl">
                    {result ? (
                        <div className="animate-in fade-in-50">
                            <h2 className="text-xl font-headline text-primary">The Wheel has Chosen!</h2>
                            <p className="text-3xl font-bold mt-2">{result.text}</p>
                        </div>
                    ) : (
                        <p className="text-xl text-white/80">Click the button to spin the wheel!</p>
                    )}
                </div>

                <div className="mt-8">
                    <Button size="lg" className="text-xl py-8 px-10" onClick={handleSpin} disabled={isSpinning}>
                        {isSpinning ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <RefreshCw className="mr-2 h-6 w-6" />}
                        Spin the Wheel
                    </Button>
                </div>
            </main>
        </div>
    );
}
