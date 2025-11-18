
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Company } from '@/lib/data';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
    const { toast } = useToast();
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isShuffling, setIsShuffling] = useState(false);
    const [pickedStudent, setPickedStudent] = useState<Student | null>(null);
    const [pickedCaption, setPickedCaption] = useState('');
    const [teacher, setTeacher] = useState<User | null>(null);
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

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
        const fetchStudentsAndCompanies = () => {
            setIsLoading(true);
            try {
                const studentsQuery = query(collection(db, "teachers", teacher.uid, "students"));
                const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
                    const studentsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
                    setAllStudents(studentsData);
                });

                const companiesQuery = query(collection(db, 'teachers', teacher.uid, 'companies'));
                const unsubCompanies = onSnapshot(companiesQuery, (snapshot) => {
                    const companiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
                    setCompanies(companiesData);
                });
                
                setIsLoading(false);
                return [unsubStudents, unsubCompanies];
            } catch (error) {
                console.error("Error fetching data: ", error);
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch student or company data.' });
                 setIsLoading(false);
                 return [];
            }
        };
        const unsubs = fetchStudentsAndCompanies();
        return () => unsubs.forEach(unsub => unsub && unsub());
    }, [teacher, toast]);

    const activeStudents = useMemo(() => {
        if (selectedCompanyIds.length === 0) return [];
        
        let filtered = allStudents.filter(student => !student.isHidden);

        if (!selectedCompanyIds.includes('all')) {
             filtered = filtered.filter(student => selectedCompanyIds.includes(student.companyId || ''));
        }
        
        return filtered;
    }, [allStudents, selectedCompanyIds]);

    const handleCompanyFilterChange = (companyId: string) => {
        if (companyId === 'all') {
            setSelectedCompanyIds(prev => prev.includes('all') ? [] : ['all']);
            return;
        }

        setSelectedCompanyIds(prev => {
            const newFilters = prev.filter(id => id !== 'all');
            if (newFilters.includes(companyId)) {
                return newFilters.filter(id => id !== companyId);
            } else {
                return [...newFilters, companyId];
            }
        });
    };

    const generateStudent = () => {
        if (activeStudents.length === 0) {
            toast({ variant: 'destructive', title: 'No Students Found', description: 'There are no active students matching the current filter. Please select at least one group.' });
            return;
        };
        
        setPickedStudent(null); 
        setIsShuffling(true);

        const randomIndex = Math.floor(Math.random() * activeStudents.length);
        const student = activeStudents[randomIndex];

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
            <div className="absolute inset-0 bg-black/30 -z-10" />
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
                            <CardDescription>Draw from the runes to summon a hero for a task.</CardDescription>
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
                                                        style={{ animation: `shuffle ${'${Math.random() * 2 + 2}'}s linear infinite` }}
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
                                        !isShuffling && pickedStudent ? "opacity-100" : "opacity-0 pointer-events-none",
                                        "animate-in fade-in-50"
                                    )}>
                                        {pickedStudent && (
                                            <div className="space-y-4">
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
                                        )}
                                    </div>
                                    
                                    <div className={cn(
                                        "flex flex-col items-center justify-center transition-opacity duration-500 w-full pointer-events-auto",
                                        isShuffling || pickedStudent ? "opacity-0 pointer-events-none" : "opacity-100"
                                    )}>
                                         <Card className="p-4 mb-4 bg-background/50 w-full">
                                            <CardTitle className="text-lg mb-2">Filter by Company</CardTitle>
                                            <CardContent className="flex flex-wrap justify-center gap-x-4 gap-y-2 p-0">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="filter-all"
                                                        checked={selectedCompanyIds.includes('all')}
                                                        onCheckedChange={() => handleCompanyFilterChange('all')}
                                                    />
                                                    <Label htmlFor="filter-all" className="font-semibold">All Students</Label>
                                                </div>
                                                {companies.map(company => (
                                                    <div key={company.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`filter-${company.id}`}
                                                            checked={selectedCompanyIds.includes(company.id)}
                                                            onCheckedChange={() => handleCompanyFilterChange(company.id)}
                                                            disabled={selectedCompanyIds.includes('all')}
                                                        />
                                                        <Label htmlFor={`filter-${company.id}`}>{company.name}</Label>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                        <p className="text-muted-foreground text-lg mb-4">Click the button to consult the runes!</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="text-center">
                        <Button size="lg" className="w-full max-w-xs text-xl py-8" onClick={generateStudent} disabled={isLoading || isShuffling || selectedCompanyIds.length === 0}>
                            {isShuffling ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCw className="mr-4 h-6 w-6" />}
                            {pickedStudent ? 'Consult Again' : 'Consult the Runes!'}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
