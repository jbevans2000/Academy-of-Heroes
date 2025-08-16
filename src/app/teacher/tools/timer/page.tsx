
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Play, Pause, RotateCcw, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MysticalClockPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer');
    
    // Timer state
    const [timerInputMinutes, setTimerInputMinutes] = useState('5');
    const [timerInputSeconds, setTimerInputSeconds] = useState('00');
    const [timerSeconds, setTimerSeconds] = useState(300);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isTimerFinished, setIsTimerFinished] = useState(false);

    // Stopwatch state
    const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
    const [isStopwatchActive, setIsStopwatchActive] = useState(false);
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Timer Logic
    useEffect(() => {
        if (isTimerActive && timerSeconds > 0) {
            intervalRef.current = setInterval(() => {
                setTimerSeconds(prev => prev - 1);
            }, 1000);
        } else if (timerSeconds === 0 && isTimerActive) {
            setIsTimerActive(false);
            setIsTimerFinished(true);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isTimerActive, timerSeconds]);

    // Stopwatch Logic
    useEffect(() => {
        if (isStopwatchActive) {
            intervalRef.current = setInterval(() => {
                setStopwatchSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isStopwatchActive]);
    
    const handleStartTimer = () => {
        const minutes = parseInt(timerInputMinutes, 10) || 0;
        const seconds = parseInt(timerInputSeconds, 10) || 0;
        const totalSeconds = minutes * 60 + seconds;
        if (totalSeconds > 0) {
            setTimerSeconds(totalSeconds);
            setIsTimerActive(true);
            setIsTimerFinished(false);
        }
    };
    
    const handlePauseTimer = () => setIsTimerActive(false);
    const handleResumeTimer = () => setIsTimerActive(true);
    
    const handleResetTimer = () => {
        setIsTimerActive(false);
        setIsTimerFinished(false);
        const minutes = parseInt(timerInputMinutes, 10) || 0;
        const seconds = parseInt(timerInputSeconds, 10) || 0;
        setTimerSeconds(minutes * 60 + seconds);
    };

    const handleStartStopwatch = () => setIsStopwatchActive(true);
    const handlePauseStopwatch = () => setIsStopwatchActive(false);
    const handleResetStopwatch = () => {
        setIsStopwatchActive(false);
        setStopwatchSeconds(0);
    };

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };


    return (
        <div className="flex min-h-screen w-full flex-col">
            <video
                autoPlay
                loop
                muted
                className="fixed top-0 left-0 w-full h-full object-cover -z-10 opacity-30"
            >
                <source src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fmystical%20clock.mp4?alt=media&token=cf18c172-b935-4610-b8d5-0a769001f531" type="video/mp4" />
            </video>
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
                 <div className="w-full max-w-lg space-y-4">
                     <Button variant="outline" onClick={() => router.push('/teacher/tools')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                    <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
                        <Tabs value={mode} onValueChange={(value) => setMode(value as 'timer' | 'stopwatch')} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="timer">Timer</TabsTrigger>
                                <TabsTrigger value="stopwatch">Stopwatch</TabsTrigger>
                            </TabsList>
                            <TabsContent value="timer">
                                <CardHeader className="text-center">
                                    <CardTitle>Mystical Timer</CardTitle>
                                    <CardDescription>Set a duration for your quest.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {isTimerFinished ? (
                                        <div className="text-center p-4 rounded-lg bg-primary/20 border-2 border-dashed border-primary animate-in fade-in-50">
                                            <BellRing className="mx-auto h-12 w-12 text-primary mb-2" />
                                            <p className="text-2xl font-bold font-headline text-primary">Your destiny is complete! Time has expired!</p>
                                        </div>
                                    ) : (
                                        <div className="text-8xl font-mono text-center font-bold text-shadow-lg">
                                            {formatTime(timerSeconds)}
                                        </div>
                                    )}

                                    {!isTimerActive && !isTimerFinished && (
                                        <div className="flex items-end justify-center gap-4">
                                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                                <Label htmlFor="minutes">Minutes</Label>
                                                <Input type="number" id="minutes" value={timerInputMinutes} onChange={(e) => setTimerInputMinutes(e.target.value)} />
                                            </div>
                                             <div className="grid w-full max-w-sm items-center gap-1.5">
                                                <Label htmlFor="seconds">Seconds</Label>
                                                <Input type="number" id="seconds" value={timerInputSeconds} onChange={(e) => setTimerInputSeconds(e.target.value)} />
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-center gap-4">
                                        {!isTimerActive ? (
                                            <Button size="lg" onClick={handleStartTimer} disabled={isTimerFinished}>
                                                <Play className="mr-2" /> Start
                                            </Button>
                                        ) : (
                                            <Button size="lg" onClick={handlePauseTimer}>
                                                <Pause className="mr-2" /> Pause
                                            </Button>
                                        )}
                                        <Button size="lg" variant="outline" onClick={handleResetTimer}>
                                            <RotateCcw className="mr-2" /> Reset
                                        </Button>
                                    </div>
                                </CardContent>
                            </TabsContent>
                            <TabsContent value="stopwatch">
                                 <CardHeader className="text-center">
                                    <CardTitle>Chronometer of Ages</CardTitle>
                                    <CardDescription>Measure the passage of time.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                     <div className="text-8xl font-mono text-center font-bold text-shadow-lg">
                                        {formatTime(stopwatchSeconds)}
                                    </div>
                                    <div className="flex justify-center gap-4">
                                         {!isStopwatchActive ? (
                                            <Button size="lg" onClick={handleStartStopwatch}>
                                                <Play className="mr-2" /> Start
                                            </Button>
                                        ) : (
                                            <Button size="lg" onClick={handlePauseStopwatch}>
                                                <Pause className="mr-2" /> Pause
                                            </Button>
                                        )}
                                        <Button size="lg" variant="outline" onClick={handleResetStopwatch}>
                                            <RotateCcw className="mr-2" /> Reset
                                        </Button>
                                    </div>
                                </CardContent>
                            </TabsContent>
                        </Tabs>
                    </Card>
                 </div>
            </main>
        </div>
    );
}
