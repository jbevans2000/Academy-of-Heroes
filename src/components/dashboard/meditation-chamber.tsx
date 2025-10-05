
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { Timestamp } from 'firebase/firestore';
import { setMeditationStatus } from '@/ai/flows/manage-student';

interface MeditationChamberProps {
    student: Student;
    teacherUid: string;
}

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function MeditationChamber({ student, teacherUid }: MeditationChamberProps) {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isTimerFinished, setIsTimerFinished] = useState(false);

    useEffect(() => {
        if (!student.meditationDuration) {
            setTimeLeft(null);
            setIsTimerFinished(false);
            return;
        }

        const initialSeconds = student.meditationDuration * 60;
        setTimeLeft(initialSeconds);

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    setIsTimerFinished(true); // Set finished state instead of auto-releasing
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(interval);

    }, [student.meditationDuration]);

    const handleRelease = async () => {
        await setMeditationStatus({
            teacherUid: teacherUid,
            studentUid: student.uid,
            isInMeditation: false
        });
        // The dashboard component will handle the re-render automatically.
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4">
             <Image
                src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FMeditation%20Chamber.jpg?alt=media&token=0496e561-c1df-425b-9384-81b5ada03853"
                alt="Meditation Chamber"
                fill
                className="object-cover -z-10"
                priority
            />
            <div className="absolute inset-0 bg-black/60 -z-10" />
            <div className="z-10 text-center w-full max-w-2xl bg-black/70 p-8 rounded-xl shadow-2xl backdrop-blur-sm text-white">
                <h1 className="text-4xl font-headline text-primary">The Meditation Chamber</h1>
                <p className="mt-4 text-lg">The Guild Leader has placed you here to reflect on the following:</p>
                <div className="mt-4 text-2xl font-semibold border-t border-b border-primary/50 py-4">
                    {student.meditationMessage || "A moment of quiet contemplation."}
                </div>
                
                {timeLeft !== null && timeLeft > 0 && !isTimerFinished && (
                    <div className="mt-6">
                        <p className="text-lg">Time Remaining:</p>
                        <p className="text-6xl font-mono font-bold">{formatTime(timeLeft)}</p>
                    </div>
                )}
                
                {isTimerFinished && (
                     <div className="mt-6 animate-pulse space-y-4">
                        <p className="text-2xl font-bold text-green-400">Your meditation is complete.</p>
                        <Button size="lg" onClick={handleRelease}>Return to Dashboard</Button>
                    </div>
                )}

                {timeLeft === null && (
                    <p className="mt-4 text-sm text-muted-foreground">You may not access your dashboard until the Guild Leader releases you.</p>
                )}

                 <Button onClick={() => auth.signOut()} className="mt-6">Logout</Button>
            </div>
        </div>
    );
}
