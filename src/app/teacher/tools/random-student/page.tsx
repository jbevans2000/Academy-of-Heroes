
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, RefreshCw, Loader2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { StudentCard } from '@/components/teacher/student-card';
import { Skeleton } from '@/components/ui/skeleton';

const selectionCaptions = [
    "The King has chosen you for a quest!",
    "The Oracle's gaze falls upon you!",
    "A mysterious scroll has appeared with your name on it!",
    "Destiny calls! Step forward, hero!",
    "The Council of Elders summons you!",
];

export default function RandomStudentPage() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pickedStudent, setPickedStudent] = useState<Student | null>(null);
    const [pickedCaption, setPickedCaption] = useState('');

    useEffect(() => {
        const fetchStudents = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "students"));
                const studentsData = querySnapshot.docs.map(doc => ({ ...doc.data() } as Student));
                setStudents(studentsData);
            } catch (error) {
                console.error("Error fetching students: ", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const generateStudent = () => {
        if (students.length === 0) return;
        const randomIndex = Math.floor(Math.random() * students.length);
        setPickedStudent(students[randomIndex]);

        const randomCaptionIndex = Math.floor(Math.random() * selectionCaptions.length);
        setPickedCaption(selectionCaptions[randomCaptionIndex]);
    };

    return (
        <div 
            className="flex min-h-screen w-full flex-col"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Aug%2016%2C%202025%2C%2009_52_37%20PM.png?alt=media&token=c138d6cf-3580-4161-9f93-1678122d25d1')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                    <Card className="shadow-2xl text-center bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex justify-center mb-2">
                                <Users className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl">Call to Duty</CardTitle>
                            <CardDescription>Click the button below to randomly select a student from your class roster.</CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-[450px] flex flex-col items-center justify-center">
                            {isLoading ? (
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            ) : pickedStudent ? (
                                <div className="space-y-4 animate-in fade-in-50">
                                    <h3 className="text-2xl font-bold font-headline text-primary">{pickedCaption}</h3>
                                     <div className="scale-75">
                                        <StudentCard 
                                            student={pickedStudent}
                                            isSelected={false}
                                            onSelect={() => {}} // No-op for this view
                                            setStudents={setStudents}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">Click the button to select a student!</p>
                            )}
                        </CardContent>
                    </Card>
                     <Button size="lg" className="w-full text-xl py-8" onClick={generateStudent} disabled={isLoading || students.length === 0}>
                        <RefreshCw className="mr-4 h-6 w-6" />
                        {students.length === 0 ? 'No Students in Roster' : 'Select a Random Student!'}
                    </Button>
                </div>
            </main>
        </div>
    );
}
