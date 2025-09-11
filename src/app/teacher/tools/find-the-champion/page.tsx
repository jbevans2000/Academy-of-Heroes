
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Loader2, ShieldCheck, Users } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Company } from '@/lib/data';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';

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
        const fetchStudentsAndCompanies = async () => {
            setIsLoading(true);
            try {
                const studentsQuery = query(collection(db, "teachers", teacher.uid, "students"), where('isArchived', '!=', true));
                const studentsSnapshot = await getDocs(studentsQuery);
                const studentsData = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
                setStudents(studentsData);

                const companiesSnapshot = await getDocs(collection(db, "teachers", teacher.uid, "companies"));
                const companiesData = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
                setCompanies(companiesData);
            } catch (error) {
                console.error("Error fetching data: ", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudentsAndCompanies();
    }, [teacher]);
    
    const getChampionCandidates = () => students.filter(s => s.isChampion);

    const handleSelectChampions = (mode: 'guild' | 'company') => {
        const candidates = getChampionCandidates();
        if (candidates.length === 0) {
            setPickedChampions([]);
            setPickedCaption("No champions have volunteered!");
            return;
        }

        setPickedChampions([]);
        setIsShuffling(true);
        const caption = selectionCaptions[Math.floor(Math.random() * selectionCaptions.length)];
        setPickedCaption(caption);

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
                const randomIndex = Math.floor(Math.random() * companyCandidates.length);
                champions.push(companyCandidates[randomIndex]);
            }
        }

        setTimeout(() => {
            setPickedChampions(champions);
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
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                    <Card className="shadow-2xl text-center bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex justify-center mb-2">
                                <ShieldCheck className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl">Find The Champion</CardTitle>
                            <CardDescription>Select a champion to represent their company or the entire guild.</CardDescription>
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
                                                    25% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) rotate(${Math.random() * 180}deg); }
                                                    50% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) rotate(${Math.random() * 360}deg); }
                                                    75% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) rotate(${Math.random() * 180}deg); }
                                                    100% { transform: translate(0, 0) rotate(0deg); }
                                                }
                                            `}</style>
                                        </div>
                                    </div>
                                    
                                    <div className={cn("transition-opacity duration-500", isShuffling ? "opacity-0" : "opacity-100")}>
                                        {pickedChampions.length > 0 ? (
                                            <div className="space-y-4 animate-in fade-in-50">
                                                <h3 className="text-2xl font-bold font-headline text-black">{pickedCaption}</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {pickedChampions.map(champion => {
                                                        const companyName = companies.find(c => c.id === champion.companyId)?.name;
                                                        return (
                                                        <div key={champion.uid} className="flex flex-col items-center space-y-2 p-4 bg-background/50 rounded-lg">
                                                             <div className="relative w-24 h-24">
                                                                <Image src={champion.avatarUrl} alt={champion.characterName} fill className="object-contain drop-shadow-lg" />
                                                            </div>
                                                            <h4 className="text-xl font-bold">{champion.characterName}</h4>
                                                            {companyName && <p className="text-sm font-semibold text-primary">{companyName}</p>}
                                                        </div>
                                                    )})}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <p className="text-muted-foreground text-lg mb-4">
                                                    {pickedCaption || "Choose how to select your champion(s)!"}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            )}
                        </CardContent>
                    </Card>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button size="lg" className="text-lg py-8" onClick={() => handleSelectChampions('guild')} disabled={isLoading || isShuffling}>
                            <Users className="mr-4 h-6 w-6" />
                            Choose Guild Champion
                        </Button>
                        <Button size="lg" className="text-lg py-8" onClick={() => handleSelectChampions('company')} disabled={isLoading || isShuffling}>
                            <ShieldCheck className="mr-4 h-6 w-6" />
                            Choose Company Champions
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
