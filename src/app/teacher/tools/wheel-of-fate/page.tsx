
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
    const [key, setKey] = useState(0); // Key to re-trigger animation

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
        
        setKey(prevKey => prevKey + 1); // Reset animation state
        setIsSpinning(true);
        setResult(null);

        // Calculate final rotation
        const randomIndex = Math.floor(Math.random() * events.length);
        const segmentAngle = 360 / (events.length || 1);
        const randomOffset = Math.random() * segmentAngle;
        // 6 full spins + the random result
        const finalAngle = 360 * 6 + (360 - (randomIndex * segmentAngle + randomOffset));

        setRotation(finalAngle);

        setTimeout(() => {
            setResult(events[randomIndex]);
            setIsSpinning(false);
        }, 5000); // Duration of the spin animation
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
             <style jsx global>{`
                @keyframes spin-wheel {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(var(--final-rotation));
                    }
                }
                .animate-spin-wheel {
                    animation: spin-wheel 5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
            `}</style>
            <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2FWheel%20of%20Fate%20Background.jpg?alt=media&token=b5fe255d-9897-495d-bbde-1ddcb2d05e49')`,
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
                <div className="relative flex items-center justify-center w-[700px] h-[700px]">
                    <Image
                        key={key} // Use key to re-mount the component and restart animation
                        src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2FThe%20Wheel%20of%20Fate%202.png?alt=media&token=1e4b790b-a126-4c23-9960-fb2ce9d89896"
                        alt="The Wheel of Fate"
                        width={700}
                        height={700}
                        className={isSpinning ? 'animate-spin-wheel' : ''}
                        style={{ '--final-rotation': `${rotation}deg` } as React.CSSProperties}
                        priority
                    />
                    <div 
                        className="absolute w-0 h-0 top-[44px] left-1/2 -translate-x-1/2"
                        style={{
                            borderLeft: '25px solid transparent',
                            borderRight: '25px solid transparent',
                            borderTop: '35px solid hsl(var(--primary))',
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
