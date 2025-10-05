
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Swords, Loader2, RefreshCw } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Company } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Checkbox } from '@/components/ui/checkbox';

const guildNames = [
    "The Griffin Guard", "The Shadow Syndicate", "The Crimson Blades", "The Golden Lions",
    "The Azure Order", "The Iron Wolves", "The Serpent's Coil", "The Dragon Riders",
    "The Phoenix Fellowship", "The Obsidian Circle", "The Emerald Enclave", "The Silver Hand",
    "The Nightfall Guild", "The Sunstone Clan", "The Stormbringers", "The Whisperwind Society",
    "The Astral Vanguard", "The Onyx Legion", "The Wyvern Watch", "The Runic Scribes"
];

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


export default function GroupGeneratorPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [groupSize, setGroupSize] = useState<number | string>(2);
    const [generatedGroups, setGeneratedGroups] = useState<Student[][]>([]);
    const [generatedGuildNames, setGeneratedGuildNames] = useState<string[]>([]);
    const [teacher, setTeacher] = useState<User | null>(null);
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(['all']);


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
                const studentsSnapshot = await getDocs(collection(db, "teachers", teacher.uid, "students"));
                const studentsData = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
                setStudents(studentsData);

                const companiesSnapshot = await getDocs(collection(db, 'teachers', teacher.uid, 'companies'));
                const companiesData = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
                setCompanies(companiesData);

            } catch (error) {
                console.error("Error fetching data: ", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch student or company data.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudentsAndCompanies();
    }, [teacher, toast]);

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

    const handleGenerateGroups = () => {
        const size = Number(groupSize);
        if (isNaN(size) || size <= 1) {
            toast({ variant: 'destructive', title: 'Invalid Size', description: 'Please enter a valid group size of 2 or more.' });
            return;
        }
        
        let activeStudents = students.filter(student => !student.isHidden);

        if (!selectedCompanyIds.includes('all') && selectedCompanyIds.length > 0) {
             activeStudents = activeStudents.filter(student => selectedCompanyIds.includes(student.companyId || ''));
        } else if (selectedCompanyIds.length === 0 && !selectedCompanyIds.includes('all')) {
             toast({ variant: 'destructive', title: 'No Selection', description: 'Please select at least one company or "All Companies".' });
            return;
        }


        if (activeStudents.length < size) {
            toast({ variant: 'destructive', title: 'Not Enough Students', description: `You need at least ${size} active students to form a group.` });
            return;
        }

        const shuffledStudents = shuffleArray(activeStudents);
        const newGroups: Student[][] = [];
        
        for (let i = 0; i < shuffledStudents.length; i += size) {
            newGroups.push(shuffledStudents.slice(i, i + size));
        }

        // Check for a remainder group and distribute its members if it exists
        if (newGroups.length > 1 && newGroups[newGroups.length - 1].length < size) {
            const remainderGroup = newGroups.pop();
            if (remainderGroup) {
                remainderGroup.forEach(student => {
                    const randomIndex = Math.floor(Math.random() * newGroups.length);
                    newGroups[randomIndex].push(student);
                });
            }
        }
        
        const shuffledGuildNames = shuffleArray(guildNames);
        setGeneratedGuildNames(shuffledGuildNames.slice(0, newGroups.length));
        setGeneratedGroups(newGroups);
    };


    return (
        <div 
            className="flex min-h-screen w-full flex-col"
             style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-9fea0033-c484-4895-89c9-96ebfc378536.jpg?alt=media&token=c79f89e7-5a39-4816-8ad2-a0a22ec316d4')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center">
                <div className="w-full max-w-4xl space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                    <Card className="shadow-2xl text-center bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex justify-center mb-2">
                                <Swords className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl">Group Guilder</CardTitle>
                            <CardDescription>Randomly assign students to guilds for their next great quest!</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Filter by Company</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-wrap justify-center gap-4">
                                     <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="filter-all"
                                            checked={selectedCompanyIds.includes('all')}
                                            onCheckedChange={() => handleCompanyFilterChange('all')}
                                        />
                                        <Label htmlFor="filter-all" className="font-semibold">All Companies</Label>
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
                           <div className="flex justify-center items-end gap-4">
                             <div className="w-full max-w-xs space-y-2">
                                <Label htmlFor="group-size">Students per Guild</Label>
                                <Input 
                                    id="group-size"
                                    type="number"
                                    value={groupSize}
                                    onChange={(e) => setGroupSize(e.target.value)}
                                    placeholder="e.g., 4"
                                    min="2"
                                />
                             </div>
                              <Button onClick={handleGenerateGroups} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Generate Guilds
                              </Button>
                           </div>
                        </CardContent>
                    </Card>

                    {generatedGroups.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in-50">
                            {generatedGroups.map((group, index) => (
                                <Card key={index} className="bg-card/90">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-primary">{generatedGuildNames[index] || `Guild ${index + 1}`}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-4 text-left">
                                            {group.map(student => (
                                                <li key={student.uid}>
                                                    <p className="font-bold text-lg">{student.studentName}</p>
                                                    <p className="text-sm text-muted-foreground">{student.characterName}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
