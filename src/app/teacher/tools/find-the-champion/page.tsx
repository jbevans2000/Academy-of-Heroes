
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Loader2, ShieldCheck, Users } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, getDocs, documentId } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Company } from '@/lib/data';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const runeImageSrc = 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-1b1a5535-ccec-4d95-b6ba-5199715edc4c.jpg?alt=media&token=b0a366fe-a4d4-46d7-b5f3-c13df8c2e69a';
const numRunes = 12;

const selectionCaptions = [
    "The runes have chosen a champion!",
    "The stones reveal a name!",
    "A mysterious glyph glows, calling you forth!",
    "Destiny calls! Step forward, hero!",
    "The ancient symbols align to choose you!",
];

export default function FindTheChampionPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [championData, setChampionData] = useState<{ championsByCompany: Record<string, string[]>, freelancerChampions: string[] }>({ championsByCompany: {}, freelancerChampions: [] });
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isShuffling, setIsShuffling] = useState(false);
    const [pickedChampions, setPickedChampions] = useState<Student[]>([]);
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
        
        const unsubStudents = onSnapshot(collection(db, "teachers", teacher.uid, "students"), (snapshot) => {
            setAllStudents(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));
        });

        const championsRef = doc(db, "teachers", teacher.uid, "champions", "active");
        const unsubChampions = onSnapshot(championsRef, (docSnap) => {
            if (docSnap.exists()) {
                setChampionData(docSnap.data() as any);
            } else {
                setChampionData({ championsByCompany: {}, freelancerChampions: [] });
            }
            setIsLoading(false);
        });

        const companiesQuery = collection(db, "teachers", teacher.uid, "companies");
        const unsubCompanies = onSnapshot(companiesQuery, (snapshot) => {
             const companiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
            setCompanies(companiesData);
        });

        return () => {
            unsubStudents();
            unsubChampions();
            unsubCompanies();
        };
    }, [teacher]);
    
     const handleCompanyFilterChange = (companyId: string) => {
        if (companyId === 'all') {
            setSelectedCompanyIds(prev => prev.length === companies.length + 1 ? [] : ['freelancers', ...companies.map(c => c.id)]);
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

    const handleSelectChampions = (mode: 'guild' | 'company') => {
        setIsShuffling(true);
        setPickedChampions([]);

        setTimeout(() => {
            const freelancers = championData?.freelancerChampions || [];
            const companyChampions = championData?.championsByCompany || {};

            let candidateUids: string[] = [];

            if (selectedCompanyIds.includes('all') || selectedCompanyIds.length === 0) {
                 candidateUids = [
                    ...freelancers,
                    ...Object.values(companyChampions).flat()
                ];
            } else {
                if (selectedCompanyIds.includes('freelancers')) {
                    candidateUids.push(...freelancers);
                }
                selectedCompanyIds.forEach(id => {
                    if(companyChampions[id]) {
                        candidateUids.push(...companyChampions[id]);
                    }
                });
            }
            
            const candidates = allStudents.filter(s => candidateUids.includes(s.uid) && s.isChampion === true && !s.isHidden);

            if (candidates.length === 0) {
                toast({
                    variant: 'destructive',
                    title: 'No Champions Found',
                    description: 'No champions have volunteered from the selected groups. Make sure students have toggled their Champion Status ON.',
                    duration: 6000
                });
                setPickedChampions([]);
                setIsShuffling(false);
                return;
            }

            let champions: Student[] = [];

            if (mode === 'guild') {
                const randomIndex = Math.floor(Math.random() * candidates.length);
                champions = [candidates[randomIndex]];
            } else { // 'company' mode
                const championsByCompany: { [companyId: string]: Student[] } = {};
                candidates.forEach(c => {
                    const companyId = c.companyId || 'freelancers';
                    if (!championsByCompany[companyId]) {
                        championsByCompany[companyId] = [];
                    }
                    championsByCompany[companyId].push(c);
                });
                
                const companiesToSelectFrom = (selectedCompanyIds.includes('all') || selectedCompanyIds.length === 0)
                    ? ['freelancers', ...companies.map(c => c.id)] 
                    : selectedCompanyIds;
                
                companiesToSelectFrom.forEach(companyId => {
                    const companyCandidates = championsByCompany[companyId];
                    if (companyCandidates && companyCandidates.length > 0) {
                        const randomIndex = Math.floor(Math.random() * companyCandidates.length);
                        champions.push(companyCandidates[randomIndex]);
                    }
                });

                if (champions.length === 0) {
                    toast({
                        title: 'No Champions Found',
                        description: 'No champions in any of the selected companies have volunteered.',
                        duration: 6000
                    });
                }
            }
            
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
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChooseChampion.jpg?alt=media&token=9d8a8624-c352-415e-84d8-827cebc711a5')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <div className="absolute inset-0 bg-black/30 -z-10" />
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-5xl space-y-6">
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
                                        !isShuffling && pickedChampions.length > 0 ? "opacity-100" : "opacity-0 pointer-events-none",
                                        "animate-in fade-in-50"
                                    )}>
                                        <div className="space-y-4">
                                            <h3 className="text-2xl font-bold font-headline text-black">The runes have chosen!</h3>
                                            <div className="flex justify-center flex-wrap gap-4">
                                                {pickedChampions.map(champion => {
                                                    const companyName = companies.find(c => c.id === champion.companyId)?.name;
                                                    return (
                                                    <div key={champion.uid} className="flex flex-col items-center space-y-1 p-2 bg-background/50 rounded-lg w-40">
                                                        <div className="relative w-20 h-20">
                                                            <Image src={champion.avatarUrl} alt={champion.characterName} fill className="object-contain drop-shadow-lg" />
                                                        </div>
                                                        <h4 className="text-lg font-bold truncate">{champion.characterName}</h4>
                                                        <p className="text-xs text-muted-foreground">{champion.studentName}</p>
                                                        {companyName && <p className="text-xs font-semibold text-primary">{companyName}</p>}
                                                    </div>
                                                )})}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={cn(
                                        "flex flex-col items-center justify-center transition-opacity duration-500 w-full",
                                        isShuffling || pickedChampions.length > 0 ? "opacity-0 pointer-events-none" : "opacity-100"
                                    )}>
                                        <Card className="p-4 mb-4 bg-background/50 w-full">
                                            <CardTitle className="text-lg mb-2">Filter by Company</CardTitle>
                                            <CardContent className="flex flex-wrap justify-center gap-x-4 gap-y-2 p-0">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="filter-all"
                                                        checked={selectedCompanyIds.includes('all') || selectedCompanyIds.length === companies.length + 1}
                                                        onCheckedChange={() => handleCompanyFilterChange('all')}
                                                    />
                                                    <Label htmlFor="filter-all" className="font-semibold">All Companies</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="filter-freelancers"
                                                        checked={selectedCompanyIds.includes('freelancers')}
                                                        onCheckedChange={() => handleCompanyFilterChange('freelancers')}
                                                        disabled={selectedCompanyIds.includes('all')}
                                                    />
                                                    <Label htmlFor="filter-freelancers">Freelancers</Label>
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
                                        <p className="text-muted-foreground text-lg mb-4">Click a button below to begin the selection!</p>
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
