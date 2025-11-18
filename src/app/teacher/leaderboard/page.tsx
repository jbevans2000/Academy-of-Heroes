
'use client';

import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, ClassType, Company } from '@/lib/data';
import type { Hairstyle, ArmorPiece, BaseBody } from '@/lib/forge';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trophy, Star, Coins, Crown, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const CharacterCanvas = lazy(() => import('@/components/dashboard/character-canvas'));

const ChampionCard = ({ student, rank, assets, type }: { student: Student | null; rank: 'Guardian' | 'Healer' | 'Mage'; assets: any, type: 'Guild' | 'Company' }) => {
    if (!student) {
        return (
            <Card className="flex flex-col items-center justify-center p-4 min-h-[300px] bg-secondary/50">
                <Trophy className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground font-semibold">No {rank} Champion Yet</p>
            </Card>
        );
    }
    
    const equipment = {
        bodyId: student.equippedBodyId, hairstyleId: student.equippedHairstyleId, hairstyleColor: student.equippedHairstyleColor,
        backgroundUrl: student.backgroundUrl, headId: student.equippedHeadId, shouldersId: student.equippedShouldersId,
        chestId: student.equippedChestId, handsId: student.equippedHandsId, legsId: student.equippedLegsId,
        feetId: student.equippedFeetId, petId: student.equippedPetId,
    };
    const equippedPet = assets.allArmor.find((p: ArmorPiece) => p.id === equipment.petId);

    return (
        <Card className="p-4 bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/50 dark:to-amber-800/50 border-2 border-amber-400">
             <div className="text-center mb-2">
                <p className="text-sm font-bold text-muted-foreground">LEVEL</p>
                <p className="text-3xl font-bold">{student.level}</p>
            </div>
            <CardTitle className="text-center text-xl font-headline flex items-center justify-center gap-2">
                <Crown className="text-amber-500" /> {type} {rank} Champion
            </CardTitle>
            <div className="w-full h-80 relative mt-2 rounded-md overflow-hidden bg-black/10">
                 <Suspense fallback={<div className="w-full h-full bg-gray-200 animate-pulse" />}>
                    <CharacterCanvas 
                        student={student}
                        allBodies={assets.allBodies}
                        equipment={equipment}
                        allHairstyles={assets.allHairstyles}
                        allArmor={assets.allArmor}
                        equippedPet={equippedPet}
                        selectedStaticAvatarUrl={student.useCustomAvatar ? null : student.avatarUrl}
                        isPreviewMode={true}
                        localHairstyleTransforms={student.equippedHairstyleTransforms}
                        localArmorTransforms={student.armorTransforms}
                        localArmorTransforms2={student.armorTransforms2}
                        localPetTransforms={student.petTransforms}
                    />
                </Suspense>
            </div>
            <div className="text-center mt-2">
                <p className="text-2xl font-bold">{student.characterName}</p>
                <div className="flex justify-center gap-4 text-lg">
                    <span className="flex items-center gap-1"><Star className="h-5 w-5 text-yellow-500"/> {student.xp.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Coins className="h-5 w-5 text-amber-600"/> {student.gold.toLocaleString()}</span>
                </div>
            </div>
        </Card>
    )
}


export default function TeacherLeaderboardPage() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [teacher, setTeacher] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Assets for rendering characters
    const [allHairstyles, setAllHairstyles] = useState<Hairstyle[]>([]);
    const [allArmor, setAllArmor] = useState<ArmorPiece[]>([]);
    const [allBodies, setAllBodies] = useState<BaseBody[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

        const unsubs: (()=>void)[] = [];

        const studentsQuery = collection(db, 'teachers', teacher.uid, 'students');
        unsubs.push(onSnapshot(studentsQuery, (snapshot) => {
            const allStudentsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
            const activeStudents = allStudentsData.filter(s => !s.isArchived && !s.isHidden);
            setStudents(activeStudents);
        }));

        const companiesQuery = query(collection(db, 'teachers', teacher.uid, 'companies'));
        unsubs.push(onSnapshot(companiesQuery, (snapshot) => {
            setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
        }));

        // Fetch assets
        unsubs.push(onSnapshot(collection(db, 'hairstyles'), s => setAllHairstyles(s.docs.map(d => ({id: d.id, ...d.data()} as Hairstyle)))));
        unsubs.push(onSnapshot(collection(db, 'armorPieces'), s => setAllArmor(s.docs.map(d => ({id: d.id, ...d.data()} as ArmorPiece)))));
        unsubs.push(onSnapshot(collection(db, 'baseBodies'), s => setAllBodies(s.docs.map(d => ({id: d.id, ...d.data()} as BaseBody)))));

        setIsLoading(false);

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [teacher]);

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => b.xp - a.xp);
    }, [students]);

    const guildChampions = useMemo(() => {
        const getTop = (characterClass: ClassType) => {
            return sortedStudents
                .filter(s => s.class === characterClass)
                .reduce((top, current) => (!top || current.xp > top.xp) ? current : top, null as Student | null);
        };
        return {
            Guardian: getTop('Guardian'),
            Healer: getTop('Healer'),
            Mage: getTop('Mage'),
        };
    }, [sortedStudents]);

    const companyChampions = useMemo(() => {
        const champions: { [companyId: string]: { Guardian: Student | null, Healer: Student | null, Mage: Student | null } } = {};
        companies.forEach(company => {
            const members = sortedStudents.filter(s => s.companyId === company.id);
            const getTop = (characterClass: ClassType) => members.filter(s => s.class === characterClass).reduce((top, current) => (!top || current.xp > top.xp) ? current : top, null as Student | null);
            champions[company.id] = {
                Guardian: getTop('Guardian'),
                Healer: getTop('Healer'),
                Mage: getTop('Mage'),
            };
        });
        return champions;
    }, [sortedStudents, companies]);

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <TeacherHeader />
                <main className="flex-1 flex items-center justify-center p-4">
                    <Loader2 className="h-16 w-16 animate-spin" />
                </main>
            </div>
        );
    }
    
    const assets = { allArmor, allBodies, allHairstyles };

    return (
        <div 
            className="flex min-h-screen w-full flex-col"
            style={{ 
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Sep%2027%2C%202025%2C%2009_04_40%20AM.png?alt=media&token=94ba1150-487b-4a2e-8b52-d64f5f504572')`,
                backgroundSize: '100% 100%',
                backgroundAttachment: 'fixed'
            }}
        >
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                     <Button variant="outline" onClick={() => router.push('/teacher/dashboard')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Podium
                    </Button>

                    <Card className="bg-card/80 backdrop-blur-sm text-center">
                        <CardHeader>
                            <Trophy className="h-16 w-16 mx-auto text-yellow-400"/>
                            <CardTitle className="text-4xl font-headline mt-2">Hall of Heroes</CardTitle>
                            <CardDescription>A testament to the mightiest adventurers in the guild.</CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-2xl text-center">Champions of the Guild</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <ChampionCard student={guildChampions.Guardian} rank="Guardian" assets={assets} type="Guild" />
                           <ChampionCard student={guildChampions.Healer} rank="Healer" assets={assets} type="Guild" />
                           <ChampionCard student={guildChampions.Mage} rank="Mage" assets={assets} type="Guild" />
                        </CardContent>
                    </Card>

                    {companies.length > 0 && (
                        <Card className="bg-card/80 backdrop-blur-sm">
                             <CardHeader>
                                <CardTitle className="text-2xl text-center">Company Champions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {companies.map(company => (
                                    <div key={company.id}>
                                        <div className="flex items-center gap-4 mb-2">
                                            {company.logoUrl && <Image src={company.logoUrl} alt={company.name} width={40} height={40} className="rounded-full" />}
                                            <h3 className="text-xl font-bold">{company.name}</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <ChampionCard student={companyChampions[company.id]?.Guardian} rank="Guardian" assets={assets} type="Company" />
                                            <ChampionCard student={companyChampions[company.id]?.Healer} rank="Healer" assets={assets} type="Company" />
                                            <ChampionCard student={companyChampions[company.id]?.Mage} rank="Mage" assets={assets} type="Company" />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                    
                     <Card className="bg-card/80 backdrop-blur-sm">
                         <CardHeader>
                            <CardTitle className="text-2xl text-center">Guild Rankings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Avatar</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Level</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>XP</TableHead>
                                        <TableHead>Gold</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedStudents.map((student, index) => {
                                        const equipment = {
                                            bodyId: student.equippedBodyId, hairstyleId: student.equippedHairstyleId, hairstyleColor: student.equippedHairstyleColor,
                                            backgroundUrl: student.backgroundUrl, headId: student.equippedHeadId, shouldersId: student.equippedShouldersId,
                                            chestId: student.equippedChestId, handsId: student.equippedHandsId, legsId: student.equippedLegsId,
                                            feetId: student.equippedFeetId, petId: student.equippedPetId,
                                        };
                                        const equippedPet = allArmor.find(p => p.id === equipment.petId);
                                        const companyName = companies.find(c => c.id === student.companyId)?.name || 'Freelancer';

                                        return (
                                        <TableRow key={student.uid}>
                                            <TableCell className="font-bold text-lg">{index + 1}</TableCell>
                                            <TableCell>
                                                 <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary border">
                                                    <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
                                                        <CharacterCanvas 
                                                            student={student} allBodies={allBodies} equipment={equipment} allHairstyles={allHairstyles}
                                                            allArmor={allArmor} equippedPet={equippedPet} isPreviewMode={true}
                                                            selectedStaticAvatarUrl={student.useCustomAvatar ? null : student.avatarUrl}
                                                            localHairstyleTransforms={student.equippedHairstyleTransforms}
                                                            localArmorTransforms={student.armorTransforms} localArmorTransforms2={student.armorTransforms2}
                                                            localPetTransforms={student.petTransforms}
                                                        />
                                                    </Suspense>
                                                </div>
                                            </TableCell>
                                            <TableCell>{student.characterName}</TableCell>
                                            <TableCell>{student.class}</TableCell>
                                            <TableCell>{student.level}</TableCell>
                                            <TableCell>{companyName}</TableCell>
                                            <TableCell>{student.xp.toLocaleString()}</TableCell>
                                            <TableCell>{student.gold.toLocaleString()}</TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                </div>
            </main>
        </div>
    );
}
