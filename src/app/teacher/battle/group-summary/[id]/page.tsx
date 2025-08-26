
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Swords, CheckCircle, XCircle, Trophy, Loader2, Users, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Student, Company } from '@/lib/data';
import { Separator } from '@/components/ui/separator';

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
}

interface Battle {
  battleName: string;
  bossImageUrl: string;
  questions: Question[];
}

interface BattleResult {
    questionIndex: number;
    isCorrect: boolean;
    participants: string[]; 
}

interface GroupBattleSummary {
    id: string;
    battleId: string;
    battleName: string;
    score: number;
    totalQuestions: number;
    completedAt: { seconds: number; nanoseconds: number; };
    mode: 'guild' | 'company' | 'individual';
    xpPerAnswer: number;
    goldPerAnswer: number;
    xpParticipation: number;
    goldParticipation: number;
    results: BattleResult[];
    presentStudentUids: string[];
}

export default function GroupBattleSummaryPage() {
    const router = useRouter();
    const params = useParams();
    const summaryId = params.id as string;
    const { toast } = useToast();

    const [summary, setSummary] = useState<GroupBattleSummary | null>(null);
    const [battle, setBattle] = useState<Battle | null>(null);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
        if (!summaryId || !teacher) return;
        const fetchBattleData = async () => {
            setIsLoading(true);
            try {
                // Fetch summary
                const summaryRef = doc(db, 'teachers', teacher.uid, 'groupBattleSummaries', summaryId);
                const summarySnap = await getDoc(summaryRef);
                if (!summarySnap.exists()) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Summary not found.' });
                    router.push('/teacher/battles/summary');
                    return;
                }
                const summaryData = { id: summarySnap.id, ...summarySnap.data() } as GroupBattleSummary;
                setSummary(summaryData);

                // Fetch original battle for questions
                const battleRef = doc(db, 'teachers', teacher.uid, 'bossBattles', summaryData.battleId);
                const battleSnap = await getDoc(battleRef);
                 if (battleSnap.exists()) {
                    setBattle(battleSnap.data() as Battle);
                }

                // Fetch all students and companies for mapping
                const studentsSnapshot = await getDocs(collection(db, 'teachers', teacher.uid, 'students'));
                setAllStudents(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));

                 const companiesSnapshot = await getDocs(collection(db, 'teachers', teacher.uid, 'companies'));
                setAllCompanies(companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));

            } catch (error) {
                console.error("Error fetching battle data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load the summary.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchBattleData();
    }, [summaryId, teacher, router, toast]);

    const presentStudents = useMemo(() => {
        return allStudents.filter(s => summary?.presentStudentUids.includes(s.uid));
    }, [allStudents, summary]);

    if (isLoading || !summary || !battle) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }
    
    const getQuestionText = (index: number) => battle.questions[index]?.questionText || 'Question not found';
    
    const renderGuildSummary = () => (
        <Card>
            <CardHeader>
                <CardTitle>Guild Performance</CardTitle>
                <CardDescription>All present students answered as one guild.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ul className="space-y-2">
                    {summary.results.map(result => (
                        <li key={result.questionIndex} className="flex items-center gap-4 p-2 bg-secondary rounded-md">
                            {result.isCorrect ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                            <p><strong>Q{result.questionIndex + 1}:</strong> {getQuestionText(result.questionIndex)}</p>
                        </li>
                    ))}
                </ul>
                <Separator className="my-4" />
                <h4 className="font-bold">Rewards Awarded to {presentStudents.length} Present Students:</h4>
                <p><strong>Participation Bonus:</strong> {summary.xpParticipation} XP and {summary.goldParticipation} Gold each.</p>
                <p><strong>Correct Answer Bonus:</strong> {summary.xpPerAnswer} XP and {summary.goldPerAnswer} Gold for each of the {summary.score} correct answers.</p>
            </CardContent>
        </Card>
    );

    const renderCompanySummary = () => {
         const companyResults: { [companyId: string]: { name: string, logoUrl?: string, correct: number, incorrect: number } } = {};
         
         summary.results.forEach(result => {
            const studentId = result.participants[0];
            const student = allStudents.find(s => s.uid === studentId);
            if (!student?.companyId) return;

            if (!companyResults[student.companyId]) {
                 const company = allCompanies.find(c => c.id === student.companyId);
                 companyResults[student.companyId] = { name: company?.name || 'Unknown Company', logoUrl: company?.logoUrl, correct: 0, incorrect: 0 };
            }

            if (result.isCorrect) companyResults[student.companyId].correct++;
            else companyResults[student.companyId].incorrect++;
         });

        return (
            <div className="space-y-4">
                {Object.entries(companyResults).map(([companyId, data]) => (
                    <Card key={companyId}>
                        <CardHeader className="flex-row items-center gap-2">
                             {data.logoUrl && <Image src={data.logoUrl} alt={data.name} width={40} height={40} className="rounded-full" />}
                            <CardTitle>{data.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p><strong>Correct Answers:</strong> {data.correct}</p>
                             <p><strong>Incorrect Answers:</strong> {data.incorrect}</p>
                             <p className="mt-2 text-sm"><strong>Rewards per Present Member:</strong> {data.correct * summary.xpPerAnswer} XP and {data.correct * summary.goldPerAnswer} Gold.</p>
                        </CardContent>
                    </Card>
                ))}
                <Separator />
                <h4 className="font-bold text-center">All present students also received a participation bonus of {summary.xpParticipation} XP and {summary.goldParticipation} Gold.</h4>
            </div>
        );
    };

    const renderIndividualSummary = () => (
         <Card>
            <CardHeader><CardTitle>Individual Hero Performance</CardTitle></CardHeader>
            <CardContent>
                 <ul className="space-y-3">
                    {summary.results.map(result => {
                         const student = allStudents.find(s => s.uid === result.participants[0]);
                         if (!student) return null;
                         return (
                            <li key={result.questionIndex} className="flex items-center gap-4 p-2 bg-secondary rounded-md">
                                {result.isCorrect ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                                <p><strong>Q{result.questionIndex + 1}:</strong> {student.characterName} answered "{getQuestionText(result.questionIndex)}"</p>
                                {result.isCorrect && <p className="ml-auto font-semibold text-green-600">+{summary.xpPerAnswer} XP, +{summary.goldPerAnswer} Gold</p>}
                            </li>
                         );
                    })}
                </ul>
                <Separator className="my-4" />
                <h4 className="font-bold text-center">All present students also received a participation bonus of {summary.xpParticipation} XP and {summary.goldParticipation} Gold.</h4>
            </CardContent>
        </Card>
    );
    
    let content;
    switch(summary.mode) {
        case 'guild': content = renderGuildSummary(); break;
        case 'company': content = renderCompanySummary(); break;
        case 'individual': content = renderIndividualSummary(); break;
        default: content = <p>Unknown battle mode.</p>;
    }


    return (
        <div className="relative flex min-h-screen w-full flex-col bg-gray-900 p-4">
             <Image
                src={battle.bossImageUrl || 'https://placehold.co/1200x800.png'}
                alt={battle.battleName}
                fill
                className="object-cover opacity-30"
                priority
            />
            <div className="absolute top-4 left-4 z-10">
                 <Button variant="outline" onClick={() => router.push('/teacher/battles/summary')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Battle Archives
                </Button>
            </div>
            <main className="z-10 w-full max-w-4xl mx-auto my-auto space-y-6">
                 <Card className="text-center shadow-2xl bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <Trophy className="h-16 w-16 mx-auto text-yellow-400" />
                        <CardTitle className="text-4xl font-bold">Summary: {summary.battleName}</CardTitle>
                        <CardDescription className="text-lg">Overall Score: {summary.score} / {summary.totalQuestions}</CardDescription>
                    </CardHeader>
                </Card>

                {content}
                
            </main>
        </div>
    )
}
