
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Swords, CheckCircle, XCircle, Trophy, Loader2, Save, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { logGameEvent } from '@/lib/gamelog';
import type { Student, Company } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
    participants: string[]; // UIDs of students who got it right
}

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


export default function GroupBattlePage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const battleId = params.id as string;
    const { toast } = useToast();

    const [battle, setBattle] = useState<Battle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [teacher, setTeacher] = useState<User | null>(null);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);

    // Game State
    const [gameState, setGameState<'setup' | 'battle' | 'finished'>('setup');
    const [absentStudentUids, setAbsentStudentUids] = useState<string[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [battleResults, setBattleResults] = useState<BattleResult[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Mode-specific state
    const mode = searchParams.get('mode') || 'guild';
    const xpPerAnswer = Number(searchParams.get('xp') || 0);
    const goldPerAnswer = Number(searchParams.get('gold') || 0);
    const xpParticipation = Number(searchParams.get('xpParticipation') || 0);
    const goldParticipation = Number(searchParams.get('goldParticipation') || 0);

    const [companyRotation, setCompanyRotation] = useState<Company[]>([]);
    const [individualRotation, setIndividualRotation] = useState<Student[]>([]);
    
    const presentStudents = useMemo(() => allStudents.filter(s => !absentStudentUids.includes(s.uid)), [allStudents, absentStudentUids]);


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
        if (!battleId || !teacher) return;
        const fetchBattleData = async () => {
            setIsLoading(true);
            try {
                const battleRef = doc(db, 'teachers', teacher.uid, 'bossBattles', battleId);
                const battleSnap = await getDoc(battleRef);
                if (battleSnap.exists()) {
                    setBattle(battleSnap.data() as Battle);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Battle not found.' });
                    router.push('/teacher/battles');
                }

                const studentsSnapshot = await getDocs(collection(db, 'teachers', teacher.uid, 'students'));
                setAllStudents(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));

                 const companiesSnapshot = await getDocs(collection(db, 'teachers', teacher.uid, 'companies'));
                setAllCompanies(companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));

            } catch (error) {
                console.error("Error fetching battle data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load the battle.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchBattleData();
    }, [battleId, teacher, router, toast]);
    
    const handleStartBattle = () => {
        if (mode === 'company') {
            const companiesWithPresentMembers = allCompanies.filter(c => 
                presentStudents.some(s => s.companyId === c.id)
            );
            if (companiesWithPresentMembers.length === 0) {
                toast({ variant: 'destructive', title: 'No Companies Present', description: 'There are no companies with members marked as present.'});
                return;
            }
            setCompanyRotation(shuffleArray(companiesWithPresentMembers));
        }
        if (mode === 'individual') {
            if (presentStudents.length === 0) {
                toast({ variant: 'destructive', title: 'No Heroes Present', description: 'No students were marked as present for this battle.'});
                return;
            }
            setIndividualRotation(shuffleArray(presentStudents));
        }
        setGameState('battle');
    };


    const handleSubmitAnswer = () => {
        if (selectedAnswerIndex === null || !battle) return;
        const isCorrect = selectedAnswerIndex === battle.questions[currentQuestionIndex].correctAnswerIndex;
        
        let participants: string[] = [];

        if(isCorrect) {
            if (mode === 'guild') {
                participants = presentStudents.map(s => s.uid);
            } else if (mode === 'company') {
                const currentCompany = companyRotation[currentQuestionIndex % companyRotation.length];
                participants = presentStudents.filter(s => s.companyId === currentCompany.id).map(s => s.uid);
            } else if (mode === 'individual') {
                const currentStudent = individualRotation[currentQuestionIndex % individualRotation.length];
                participants = [currentStudent.uid];
            }
        }
        
        setBattleResults(prev => [...prev, { questionIndex: currentQuestionIndex, isCorrect, participants }]);
        setIsSubmitted(true);
    };

    const handleNextQuestion = () => {
        setIsSubmitted(false);
        setSelectedAnswerIndex(null);
        
        if (mode === 'individual' && currentQuestionIndex >= presentStudents.length - 1) {
            setIndividualRotation(shuffleArray(presentStudents));
        }

        if (currentQuestionIndex >= battle!.questions.length - 1) {
            setGameState('finished');
        } else {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };
    
    const handleSaveSummary = async () => {
        if (!teacher || !battle) return;
        setIsSaving(true);
        
        const batch = writeBatch(db);
        const correctAnswersByStudent: { [uid: string]: number } = {};

        battleResults.forEach(result => {
            if (result.isCorrect) {
                result.participants.forEach(uid => {
                    if (!correctAnswersByStudent[uid]) correctAnswersByStudent[uid] = 0;
                    correctAnswersByStudent[uid]++;
                });
            }
        });

        presentStudents.forEach(student => {
            const studentRef = doc(db, 'teachers', teacher.uid, 'students', student.uid);
            const correctCount = correctAnswersByStudent[student.uid] || 0;
            const xpToAdd = (correctCount * xpPerAnswer) + xpParticipation;
            const goldToAdd = (correctCount * goldPerAnswer) + goldParticipation;

            if(xpToAdd > 0) batch.update(studentRef, { xp: (student.xp || 0) + xpToAdd });
            if(goldToAdd > 0) batch.update(studentRef, { gold: (student.gold || 0) + goldToAdd });
        });

        try {
            await batch.commit();

            const score = battleResults.filter(r => r.isCorrect).length;
            const summaryRef = collection(db, 'teachers', teacher.uid, 'groupBattleSummaries');
            await addDoc(summaryRef, {
                battleName: battle.battleName,
                battleId: battleId,
                score: score,
                totalQuestions: battle.questions.length,
                completedAt: serverTimestamp(),
            });

            await logGameEvent(teacher.uid, 'BOSS_BATTLE', `Group Battle "${battle.battleName}" completed with a score of ${score}/${battle.questions.length}.`);
            toast({ title: 'Summary Saved & Rewards Bestowed!', description: 'Student XP and Gold have been updated.' });
            router.push('/teacher/battles/summary');

        } catch (error) {
            console.error("Error saving summary and rewards:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the battle summary or bestow rewards.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleToggleStudentAbsence = (uid: string) => {
        setAbsentStudentUids(prev => 
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    if (isLoading || !battle || !teacher) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }
    
    if (gameState === 'setup') {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-muted/40">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Mark Heroes who are Absent Today!</CardTitle>
                        <CardDescription>Check the box next to any students who are not present. They will be excluded from participation and rewards.</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[50vh] overflow-y-auto space-y-2">
                        {allStudents.map(student => (
                            <div key={student.uid} className="flex items-center space-x-2 p-2 rounded-md border">
                                <Checkbox
                                    id={`student-${student.uid}`}
                                    checked={absentStudentUids.includes(student.uid)}
                                    onCheckedChange={() => handleToggleStudentAbsence(student.uid)}
                                />
                                <Label htmlFor={`student-${student.uid}`} className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {student.characterName} ({student.studentName})
                                </Label>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleStartBattle}>Begin Battle ({presentStudents.length} Present)</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    const isBattleFinished = gameState === 'finished';
    const currentQuestion = battle.questions[currentQuestionIndex];
    let activeParticipantDisplay: React.ReactNode = null;
    
    if (mode === 'company' && companyRotation.length > 0) {
        const currentCompany = companyRotation[currentQuestionIndex % companyRotation.length];
        activeParticipantDisplay = <h3 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6"/> Company: {currentCompany.name}</h3>;
    } else if (mode === 'individual' && individualRotation.length > 0) {
        const currentStudent = individualRotation[currentQuestionIndex % individualRotation.length];
        activeParticipantDisplay = <h3 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6"/> Hero: {currentStudent.characterName}</h3>;
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gray-900 p-4">
            <Image
                src={battle.bossImageUrl || 'https://placehold.co/1200x800.png'}
                alt={battle.battleName}
                fill
                className="object-cover opacity-30"
                priority
            />
            <div className="absolute top-4 left-4 z-10">
                 <Button variant="outline" onClick={() => router.push('/teacher/battles')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    End Battle Early
                </Button>
            </div>
            
            <div className="z-10 w-full max-w-4xl">
                {isBattleFinished ? (
                     <Card className="text-center shadow-2xl bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <Trophy className="h-16 w-16 mx-auto text-yellow-400" />
                            <CardTitle className="text-4xl font-bold">Battle Complete!</CardTitle>
                            <CardDescription className="text-lg">Your guild fought valiantly against {battle.battleName}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-6xl font-bold">{battleResults.filter(r=>r.isCorrect).length} / {battle.questions.length}</p>
                            <p className="text-muted-foreground">Correct Answers</p>
                        </CardContent>
                        <CardFooter className="flex-col gap-4">
                            <Button size="lg" onClick={handleSaveSummary} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save to Archives & Bestow Rewards
                            </Button>
                            <Button variant="link" onClick={() => router.push('/teacher/battles')}>
                                Exit Without Saving
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            {activeParticipantDisplay || <Swords className="h-12 w-12 mx-auto text-primary" />}
                            <CardTitle className="text-2xl font-semibold">Question {currentQuestionIndex + 1} / {battle.questions.length}</CardTitle>
                            <CardTitle className="text-4xl font-bold">{currentQuestion.questionText}</CardTitle>
                        </CardHeader>
                        <CardContent className="mt-6">
                            {isSubmitted ? (
                                <div className="text-center p-8 rounded-lg animate-in fade-in-50">
                                    {selectedAnswerIndex === currentQuestion.correctAnswerIndex ? (
                                        <>
                                            <CheckCircle className="h-24 w-24 mx-auto text-green-400" />
                                            <p className="text-5xl font-bold mt-4 text-green-300">Correct!</p>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-24 w-24 mx-auto text-red-400" />
                                            <p className="text-5xl font-bold mt-4 text-red-300">Incorrect!</p>
                                            <p className="text-xl mt-2 text-white">The correct answer was: <span className="font-bold">{currentQuestion.answers[currentQuestion.correctAnswerIndex]}</span></p>
                                        </>
                                    )}
                                     <Button size="lg" className="mt-8" onClick={handleNextQuestion}>
                                        {currentQuestionIndex === battle.questions.length - 1 ? 'View Summary' : 'Next Question'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.answers.map((answer, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        className={cn(
                                            "text-lg h-auto py-6 whitespace-normal justify-start text-left text-white border-gray-400 hover:bg-primary/90 hover:text-primary-foreground",
                                            selectedAnswerIndex === index && "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary"
                                        )}
                                        onClick={() => setSelectedAnswerIndex(index)}
                                    >
                                        <span className="font-bold mr-4">{String.fromCharCode(65 + index)}.</span>
                                        {answer}
                                    </Button>
                                ))}
                                </div>
                            )}
                        </CardContent>
                         {!isSubmitted && (
                            <CardFooter className="justify-center">
                                <Button size="lg" onClick={handleSubmitAnswer} disabled={selectedAnswerIndex === null}>
                                    Submit Answer
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                )}
            </div>
        </div>
    )
}

    