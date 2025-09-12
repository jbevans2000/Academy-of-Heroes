
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Loader2, ShieldCheck, Users } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Company } from '@/lib/data';
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

export default function FindTheChampionPage() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isShuffling, setIsShuffling] = useState(false);
    const [pickedChampions, setPickedChampions] = useState<Student[]>([]);
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
        
        const studentsQuery = query(collection(db, "teachers", teacher.uid, "students"), where('isArchived', '!=', true));
        const studentsUnsubscribe = onSnapshot(studentsQuery, (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
            setStudents(studentsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching students in real-time:", error);
            setIsLoading(false);
        });

        const companiesQuery = collection(db, "teachers", teacher.uid, "companies");
        const companiesUnsubscribe = onSnapshot(companiesQuery, (snapshot) => {
             const companiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
            setCompanies(companiesData);
        }, (error) => {
            console.error("Error fetching companies in real-time:", error);
        });

        return () => {
            studentsUnsubscribe();
            companiesUnsubscribe();
        };
    }, [teacher]);
    
    const handleSelectChampions = (mode: 'guild' | 'company') => {
        setIsShuffling(true);
        setPickedChampions([]);
        setPickedCaption('');

        setTimeout(() => {
            const candidates = students.filter(s => s.isChampion && !s.isHidden);

            if (candidates.length === 0) {
                setPickedCaption("No champions have volunteered! Make sure students have toggled their Champion Status ON in their dashboard.");
                setPickedChampions([]);
                setIsShuffling(false);
                return;
            }

            const caption = selectionCaptions[Math.floor(Math.random() * selectionCaptions.length)];
            let champions: Student[] = [];

            if (mode === 'guild') {
                const randomIndex = Math.floor(Math.random() * candidates.length);
                champions = [candidates[randomIndex]];
            } else { // 'company' mode
                const championsByCompany: { [companyId: string]: Student[] } = {};
                candidates.forEach(c => {
                    if (c.companyId) {
                        if (!championsByCompany[c.companyId]) {
                            championsByCompany[c.companyId] = [];
                        }
                        championsByCompany[c.companyId].push(c);
                    }
                });

                for (const companyId in championsByCompany) {
                    const companyCandidates = championsByCompany[companyId];
                    if (companyCandidates.length > 0) {
                        const randomIndex = Math.floor(Math.random() * companyCandidates.length);
                        champions.push(companyCandidates[randomIndex]);
                    }
                }

                if (champions.length === 0) {
                    setPickedCaption("No champions in any company have volunteered.");
                }
            }
            
            setPickedChampions(champions);
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
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2FFind%20The%20Champion.jpg?alt=media&token=5b2b2a63-a2a4-4f0f-8f81-2292f2c8d2c8')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-4xl space-y-6">
                     <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => router.push('/teacher/tools')} className="bg-background/80">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to All Tools
                        </Button>
                     </div>
                    <Card className="shadow-2xl text-center bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex justify-center mb-2">
                                <ShieldCheck className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl">Find The Champion</CardTitle>
                            <CardDescription>Select a champion to answer on behalf of their company or the entire guild.</CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-[450px] flex flex-col items-center justify-center overflow-hidden p-6">
                             {isLoading ? (
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            ) : (
                                <div className="relative w-full h-full flex flex-col items-center justify-center">
                                    <div className={cn(
                                        "absolute inset-0 flex items-center justify-center transition-opacity duration-500",
                                        isShuffling ? "opacity-100" : "opacity-0 pointer-events-none",
                                    )}>
                                        <div className="grid grid-cols-4 gap-4 animate-in fade-in-50">
                                            {Array.from({ length: numRunes }).map((_, i) => (
                                                <div key={i} className="animate-pulse">
                                                    <Image 
                                                        src={runeImageSrc}
                                                        alt="A glowing rune"
                                                        width={120}
                                                        height={120}
                                                        className="object-contain rounded-lg"
                                                        style={{ animation: `shuffle ${Math.random() * 2 + 2}s linear infinite` }}
                                                    />
                                                </div>
                                            ))}
                                            <style jsx global>{`
                                                @keyframes shuffle {
                                                    0% { transform: translate(0, 0) rotate(0deg); }
                                                    25% { transform: translate(${'${Math.random() * 200 - 100}'}px, ${'${Math.random() * 200 - 100}'}px) rotate(${'${Math.random() * 180}'}deg); }
                                                    50% { transform: translate(${'${Math.random() * 200 - 100}'}px, ${'${Math.random() * 200 - 100}'}px) rotate(${'${Math.random() * 360}'}deg); }
                                                    75% { transform: translate(${'${Math.random() * 200 - 100}'}px, ${'${Math.random() * 200 - 100}'}px) rotate(${'${Math.random() * 180}'}deg); }
                                                    100% { transform: translate(0, 0) rotate(0deg); }
                                                }
                                            `}</style>
                                        </div>
                                    </div>
                                    
                                    <div className={cn(
                                        "absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500",
                                        !isShuffling && pickedCaption ? "opacity-100" : "opacity-0 pointer-events-none",
                                        "animate-in fade-in-50"
                                    )}>
                                        <div className="space-y-4">
                                            <h3 className="text-2xl font-bold font-headline text-black">{pickedCaption}</h3>
                                            {pickedChampions.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {pickedChampions.map(champion => {
                                                        const companyName = companies.find(c => c.id === champion.companyId)?.name;
                                                        return (
                                                        <div key={champion.uid} className="flex flex-col items-center space-y-2 p-4 bg-background/50 rounded-lg">
                                                            <div className="relative w-24 h-24">
                                                                <Image src={champion.avatarUrl} alt={champion.characterName} fill className="object-contain drop-shadow-lg" />
                                                            </div>
                                                            <h4 className="text-xl font-bold">{champion.characterName}</h4>
                                                            <p className="text-sm text-muted-foreground">{champion.studentName}</p>
                                                            {companyName && <p className="text-sm font-semibold text-primary">{companyName}</p>}
                                                        </div>
                                                    )})}
                                                </div>
                                            ) : (
                                                <p className="text-destructive font-semibold">No champions were found.</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className={cn(
                                        "flex flex-col items-center justify-center transition-opacity duration-500",
                                        isShuffling || pickedCaption ? "opacity-0 pointer-events-none" : "opacity-100"
                                    )}>
                                        <p className="text-muted-foreground text-lg mb-4">Choose how to select your champion(s)!</p>
                                    </div>

                                </div>
                            )}
                        </CardContent>
                    </Card>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button size="lg" className="text-lg py-8" onClick={() => handleSelectChampions('guild')} disabled={isLoading || isShuffling}>
                            {isShuffling ? <Loader2 className="h-6 w-6 animate-spin" /> : <Users className="mr-4 h-6 w-6" />}
                            Choose Guild Champion
                        </Button>
                        <Button size="lg" className="text-lg py-8" onClick={() => handleSelectChampions('company')} disabled={isLoading || isShuffling}>
                             {isShuffling ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="mr-4 h-6 w-6" />}
                            Choose Company Champions
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
