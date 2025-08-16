
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, MicOff, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type DragonState = 'green' | 'yellow' | 'red';

const dragonData: { [key in DragonState]: { src: string; caption: string; } } = {
    green: {
        src: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2FSleeping%20Dragon.jpg?alt=media&token=97f4f83a-f195-47ca-9a8f-bde50dfa5e48',
        caption: "The Dragon is Sleeping Peacefully! Keep up the good work and stay QUIET!"
    },
    yellow: {
        src: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2FStirring%20Dragon.jpg?alt=media&token=dc81a7e2-1868-49b2-904a-90b671a80ddb',
        caption: "The Dragon is beginning to stir!! Keep your voices down!"
    },
    red: {
        src: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2FRoaring%20Dragon.jpg?alt=media&token=b2f04d75-ae44-4328-8173-a0040f7f0627',
        caption: "The Dragon has awakened! Sing a lullaby to put it back to sleep....then HUSH!"
    }
}

export default function SleepingDragonPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [dragonState, setDragonState] = useState<DragonState>('green');
    const [volume, setVolume] = useState(0);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        const getMicPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setHasPermission(true);
                setupAudioProcessing(stream);
            } catch (err) {
                console.error("Error accessing microphone:", err);
                setHasPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Microphone Access Denied',
                    description: 'Please enable microphone permissions in your browser settings to use this tool.',
                    duration: 10000,
                });
            }
        };

        getMicPermission();

        return () => {
            // Cleanup on unmount
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setupAudioProcessing = (stream: MediaStream) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
            
            // Normalize volume to a 0-100 scale
            const normalizedVolume = Math.min(100, Math.floor(average));
            setVolume(normalizedVolume);

            // Update dragon state based on volume
            if (normalizedVolume > 50) {
                setDragonState('red');
            } else if (normalizedVolume > 25) {
                setDragonState('yellow');
            } else {
                setDragonState('green');
            }

            animationFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
    };

    const currentDragon = dragonData[dragonState];

    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-900 text-white">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col">
                <div className="flex-shrink-0">
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')} className="bg-background/20 hover:bg-background/50 border-gray-500">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                </div>

                <div className="flex-grow flex flex-col items-center justify-center text-center relative">
                    <Image
                        src={currentDragon.src}
                        alt={dragonState + " dragon"}
                        fill
                        className="object-cover opacity-40"
                        priority
                    />
                    <div className="z-10 p-8 rounded-xl bg-black/50 backdrop-blur-sm">
                        <h1 className="text-4xl md:text-5xl font-bold font-headline text-shadow-lg">
                            {currentDragon.caption}
                        </h1>
                    </div>
                </div>

                <div className="flex-shrink-0 pt-8 space-y-4">
                     {hasPermission === false && (
                         <Alert variant="destructive" className="max-w-xl mx-auto">
                            <MicOff className="h-4 w-4" />
                            <AlertTitle>Microphone Access Required</AlertTitle>
                            <AlertDescription>
                                This tool needs microphone access to measure classroom volume. Please enable it in your browser's settings and refresh the page.
                            </AlertDescription>
                        </Alert>
                     )}
                     {hasPermission === true && (
                        <div className="w-full max-w-xl mx-auto bg-black/30 rounded-lg p-4 text-center space-y-2">
                           <div className="flex items-center justify-center gap-2 text-muted-foreground">
                             <Volume2 className="h-5 w-5"/>
                             <p>Classroom Noise Level</p>
                           </div>
                            <div className="w-full bg-gray-700 rounded-full h-8 overflow-hidden border-2 border-gray-600">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-300",
                                        dragonState === 'green' && 'bg-green-500',
                                        dragonState === 'yellow' && 'bg-yellow-500',
                                        dragonState === 'red' && 'bg-red-600'
                                    )}
                                    style={{ width: `${volume}%` }}
                                ></div>
                            </div>
                        </div>
                     )}
                     {hasPermission === null && (
                         <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Mic className="h-5 w-5 animate-pulse" />
                            <p>Initializing microphone...</p>
                         </div>
                     )}
                </div>
            </main>
        </div>
    );
}
