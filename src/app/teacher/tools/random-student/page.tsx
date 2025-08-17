'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { onAuthStateChanged, type User } from 'firebase/auth';

const runeImageSrc = 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-1b1a5535-ccec-4d95-b6ba-5199715edc4c.jpg?alt=media&token=b0a366fe-a4d4-46d7-b5f3-c13df8c2e69a';
const numRunes = 12; // Number of runes to display in the animation

const selectionCaptions = [
    "The runes have chosen a champion!",
    "The stones reveal a name!",
    "A mysterious glyph glows, calling you forth!",
    "Destiny calls! Step forward, hero!",
    "The ancient symbols align to choose you!",
];

export default function RandomStudentPage() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isShuffling, setIsShuffling] = useState(false);
    const [pickedStudent, setPickedStudent] = useState<Student | null>(null);
    const [pickedCaption, setPickedCaption] = useState('');
    const [teacher, setTeacher] = useState<User | null>(null);

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
        const fetchStudents = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "teachers", teacher.uid, "students"));
                const studentsData = querySnapshot.docs.map(doc => ({ ...doc.data() } as Student));
                setStudents(studentsData);
            } catch (error) {
                console.error("Error fetching students: ", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudents();
    }, [teacher]);

    const generateStudent = () => {
        if (students.length === 0) return;
        setPickedStudent(null);
        setIsShuffling(true);

        const randomIndex = Math.floor(Math.random() * students.length);
        const student = students[randomIndex];

        const randomCaptionIndex = Math.floor(Math.random() * selectionCaptions.length);
        const caption = selectionCaptions[randomCaptionIndex];
        
        setTimeout(() => {
            setPickedStudent(student);
            setPickedCaption(caption);
            setIsShuffling(false);
        }, 3000); // 3-second animation
    };

    return (
        <div 
            className="relative flex min-h-screen w-full flex-col"
        >
             <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('${runeImageSrc}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
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
                                <Sparkles className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl">The Runes of Destiny</CardTitle>
                            <CardDescription>Draw from the runes to select a student for a task.</CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-[450px] flex flex-col items-center justify-center overflow-hidden">
                             {isLoading ? (
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            ) : isShuffling ? (
                                <div className="grid grid-cols-4 gap-4 animate-in fade-in-50">
                                    {Array.from({ length: numRunes }).map((_, i) => (
                                        <div key={i} className="animate-pulse">
                                            <Image 
                                                src={runeImageSrc}
                                                alt="A glowing rune"
                                                width={80}
                                                height={80}
                                                className="object-contain"
                                                style={{ animation: `spin ${Math.random() * 2 + 1}s linear infinite, float ${Math.random() * 3 + 2}s ease-in-out infinite` }}
                                            />
                                        </div>
                                    ))}
                                    <style jsx global>{`
                                        @keyframes spin {
                                            from { transform: rotate(0deg); }
                                            to { transform: rotate(360deg); }
                                        }
                                        @keyframes float {
                                            0% { transform: translateY(0px); }
                                            50% { transform: translateY(-10px); }
                                            100% { transform: translateY(0px); }
                                        }
                                    `}</style>
                                </div>
                            ) : pickedStudent ? (
                                <div className="space-y-4 animate-in fade-in-50 zoom-in-75">
                                    <h3 className="text-2xl font-bold font-headline text-black">{pickedCaption}</h3>
                                    <div className="relative w-64 h-64 mx-auto">
                                        <Image 
                                            src={pickedStudent.avatarUrl}
                                            alt={pickedStudent.characterName}
                                            fill
                                            className="object-contain drop-shadow-lg"
                                            priority
                                        />
                                    </div>
                                    <h4 className="text-3xl font-bold">{pickedStudent.characterName}</h4>
                                    <p className="text-lg text-muted-foreground">{pickedStudent.studentName}</p>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-lg">Click the button to consult the runes!</p>
                            )}
                        </CardContent>
                    </Card>
                     <Button size="lg" className="w-full text-xl py-8" onClick={generateStudent} disabled={isLoading || isShuffling || students.length === 0}>
                        <RefreshCw className="mr-4 h-6 w-6" />
                        {students.length === 0 ? 'No Students in Roster' : 'Consult the Runes!'}
                    </Button>
                </div>
            </main>
        </div>
    );
}
