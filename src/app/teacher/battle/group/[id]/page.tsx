
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Swords, CheckCircle, XCircle, Trophy, Loader2, Save, Users, Shield, Music, VolumeX, Volume1, Volume2 as VolumeIcon, MessageSquareOff, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { logGameEvent } from '@/lib/gamelog';
import type { Student, Company } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { updateStudentStats } from '@/ai/flows/manage-student-stats';
import { logAvatarEvent } from '@/lib/avatar-log';

interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
  damage: number;
}

interface Battle {
  battleName: string;
  bossImageUrl: string;
  questions: Question[];
  musicUrl?: string;
}

interface BattleResult {
    questionIndex: number;
    isCorrect: boolean;
    participants: string[]; // UIDs of students who got it right/wrong
}

// New type for reward accumulation
interface AccumulatedRewards {
    [studentUid: string]: {
        xp: number;
        gold: number;
    };
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

function VolumeControl({ audioRef }: { audioRef: React.RefObject<HTMLAudioElement> }) {
    const [volume, setVolume] = useState(20); // Start at a reasonable volume

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume / 100;
        }
    };
    
    const getVolumeIcon = () => {
        if (volume === 0) return <VolumeX className="h-6 w-6" />;
        if (volume <= 50) return <Volume1 className="h-6 w-6" />;
        return <VolumeIcon className="h-6 w-6" />;
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 w-48 p-4 rounded-lg bg-black/50 backdrop-blur-sm text-white">
            <p className="text-xs text-center mb-1">Volume</p>
            <div className="flex items-center gap-2">
                {getVolumeIcon()}
                <Slider
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                />
            </div>
        </div>
    );
}


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
    const [gameState, setGameState] = useState<'setup' | 'battle' | 'finished'>('setup');
    const [absentStudentUids, setAbsentStudentUids] = useState<string[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [battleResults, setBattleResults] = useState<BattleResult[]>([]);
    const [lastRoundDamageDealt, setLastRoundDamageDealt] = useState<{ amount: number; recipients: string } | null>(null);
    const [lastRoundRewardGiven, setLastRoundRewardGiven] = useState<{ xp: number; gold: number; recipients: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [accumulatedRewards, setAccumulatedRewards] = useState<AccumulatedRewards>({});

    // Mode-specific state
    const mode = searchParams.get('mode') || 'guild';
    const companyIds = useMemo(() => searchParams.get('companies')?.split(',') || [], [searchParams]);
    const xpPerAnswer = Number(searchParams.get('xp') || 0);
    const goldPerAnswer = Number(searchParams.get('gold') || 0);
    const xpParticipation = Number(searchParams.get('xpParticipation') || 0);
    const goldParticipation = Number(searchParams.get('goldParticipation') || 0);

    const [companyRotation, setCompanyRotation] = useState<Company[]>([]);
    const [individualRotation, setIndividualRotation] = useState<Student[]>([]);

    const audioRef = useRef<HTMLAudioElement>(null);
    
    // This is the list of students relevant for the current battle setup.
    const relevantStudents = useMemo(() => {
        let studentsToList = allStudents.filter(student => !student.isHidden);

        if (mode === 'company' || mode === 'individual') { // Also filter by company for individual mode now
            studentsToList = studentsToList.filter(student => companyIds.includes(student.companyId || ''));
        }

        // Alphabetize by student name
        studentsToList.sort((a, b) => a.studentName.localeCompare(b.studentName));
        
        return studentsToList;
    }, [allStudents, mode, companyIds]);

    const presentStudents = useMemo(() => {
        return relevantStudents.filter(s => !absentStudentUids.includes(s.uid));
    }, [relevantStudents, absentStudentUids]);


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

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !battle?.musicUrl) return;

        if (gameState === 'battle' || gameState === 'finished') {
            if (audio.src !== battle.musicUrl) {
                audio.src = battle.musicUrl;
            }
             audio.play().catch(e => console.error("Audio play failed:", e));
        } else {
            audio.pause();
        }
    }, [gameState, battle?.musicUrl]);
    
    const handleStartBattle = () => {
        if (mode === 'company') {
            const participatingCompanies = allCompanies.filter(c => companyIds.includes(c.id));
            const companiesWithPresentMembers = participatingCompanies.filter(c => 
                presentStudents.some(s => s.companyId === c.id)
            );
            if (companiesWithPresentMembers.length === 0) {
                toast({ variant: 'destructive', title: 'No Companies Present', description: 'There are no selected companies with members marked as present.'});
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

    const finalizeAndLogRewards = async () => {
        if (!teacher || !battle) return;

        for (const studentUid in accumulatedRewards) {
            const rewards = accumulatedRewards[studentUid];
            if (rewards.xp > 0 || rewards.gold > 0) {
                await logAvatarEvent(teacher.uid, studentUid, {
                    source: 'Group Battle',
                    xp: rewards.xp,
                    gold: rewards.gold,
                    reason: `For performance in ${battle.battleName}`
                });
            }
        }
    };
    
    const handleEndBattleEarly = async () => {
        await finalizeAndLogRewards();
        router.push('/teacher/battles');
    };


    const handleSubmitAnswer = async () => {
        if (selectedAnswerIndex === null || !battle || !teacher) return;
        const isCorrect = selectedAnswerIndex === battle.questions[currentQuestionIndex].correctAnswerIndex;
        
        let participants: string[] = [];
        let participantGroupName = '';

        if (mode === 'guild') {
            participants = presentStudents.map(s => s.uid);
            participantGroupName = "The entire guild";
        } else if (mode === 'company') {
            const currentCompany = companyRotation[currentQuestionIndex % companyRotation.length];
            participants = presentStudents.filter(s => s.companyId === currentCompany.id).map(s => s.uid);
            participantGroupName = `Company: ${currentCompany.name}`;
        } else if (mode === 'individual') {
            const currentStudent = individualRotation[currentQuestionIndex % individualRotation.length];
            participants = [currentStudent.uid];
            participantGroupName = `Hero: ${currentStudent.characterName}`;
        }

        if(isCorrect) {
            if (participants.length > 0 && (xpPerAnswer > 0 || goldPerAnswer > 0)) {
                await updateStudentStats({
                    teacherUid: teacher.uid,
                    studentUids: participants,
                    xp: xpPerAnswer,
                    gold: goldPerAnswer,
                    reason: `Correct answer in group battle: ${battle.battleName}`
                });
                 setLastRoundRewardGiven({ xp: xpPerAnswer, gold: goldPerAnswer, recipients: participantGroupName });
                 setAccumulatedRewards(prev => {
                    const newRewards = { ...prev };
                    participants.forEach(uid => {
                        if (!newRewards[uid]) newRewards[uid] = { xp: 0, gold: 0 };
                        newRewards[uid].xp += xpPerAnswer;
                        newRewards[uid].gold += goldPerAnswer;
                    });
                    return newRewards;
                });
            }
        } else {
            const damageAmount = battle.questions[currentQuestionIndex].damage || 1;
            if (participants.length > 0 && damageAmount > 0) {
                await updateStudentStats({
                    teacherUid: teacher.uid,
                    studentUids: participants,
                    hp: -damageAmount,
                    reason: `Incorrect answer in group battle: ${battle.battleName}`
                });
                setLastRoundDamageDealt({ amount: damageAmount, recipients: participantGroupName });
            }
        }
        
        setBattleResults(prev => [...prev, { questionIndex: currentQuestionIndex, isCorrect, participants }]);
        setIsSubmitted(true);
    };

    const handleNextQuestion = () => {
        setIsSubmitted(false);
        setSelectedAnswerIndex(null);
        setLastRoundDamageDealt(null);
        setLastRoundRewardGiven(null);
        
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
        
        const finalBatch = writeBatch(db);
        
        const presentUids = presentStudents.map(s => s.uid);

        presentStudents.forEach(student => {
            const studentRef = doc(db, 'teachers', teacher.uid, 'students', student.uid);

            let xpToAdd = 0;
            let goldToAdd = 0;
            
            if (xpParticipation > 0) xpToAdd += xpParticipation;
            if (goldParticipation > 0) goldToAdd += goldParticipation;

            if (xpToAdd > 0) {
                 setAccumulatedRewards(prev => {
                    const newRewards = { ...prev };
                    if (!newRewards[student.uid]) newRewards[student.uid] = { xp: 0, gold: 0 };
                    newRewards[student.uid].xp += xpToAdd;
                    return newRewards;
                });
            }
            if (goldToAdd > 0) {
                 setAccumulatedRewards(prev => {
                    const newRewards = { ...prev };
                    if (!newRewards[student.uid]) newRewards[student.uid] = { xp: 0, gold: 0 };
                    newRewards[student.uid].gold += goldToAdd;
                    return newRewards;
                });
            }
             if (xpToAdd > 0 || goldToAdd > 0) {
                finalBatch.update(studentRef, { xp: student.xp + xpToAdd, gold: student.gold + goldToAdd });
            }
        });
        
        try {
            await finalBatch.commit();
            await finalizeAndLogRewards();

            const summaryRef = collection(db, 'teachers', teacher.uid, 'groupBattleSummaries');
            const newSummaryDoc = await addDoc(summaryRef, {
                battleName: battle.battleName,
                battleId: battleId,
                score: battleResults.filter(r => r.isCorrect).length,
                totalQuestions: battle.questions.length,
                mode: mode,
                xpPerAnswer,
                goldPerAnswer,
                xpParticipation,
                goldParticipation,
                responsesByRound: battleResults,
                presentStudentUids: presentUids,
                completedAt: serverTimestamp(),
            });

            await logGameEvent(teacher.uid, 'BOSS_BATTLE', `Group Battle "${battle.battleName}" completed.`);
            toast({ title: 'Summary Saved & Rewards Bestowed!', description: 'Student participation rewards have been awarded.' });
            router.push(`/teacher/battle/group-summary/${newSummaryDoc.id}`);

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
                        {relevantStudents.map(student => (
                            <div key={student.uid} className="flex items-center space-x-2 p-2 rounded-md border">
                                <Checkbox
                                    id={`student-${student.uid}`}
                                    checked={absentStudentUids.includes(student.uid)}
                                    onCheckedChange={() => handleToggleStudentAbsence(student.uid)}
                                />
                                <Label htmlFor={`student-${student.uid}`} className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {student.studentName} ({student.characterName})
                                </Label>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button className="w-full" onClick={handleStartBattle}>Begin Battle ({presentStudents.length} Present)</Button>
                        <div className="flex w-full gap-2">
                             <Button variant="outline" className="w-full" onClick={() => router.push('/teacher/battles')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to All Battles
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => router.push('/teacher/dashboard')}>
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Return to Podium
                            </Button>
                        </div>
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
            <audio ref={audioRef} loop />
            {battle.musicUrl && <VolumeControl audioRef={audioRef} />}
            <Image
                src={battle.bossImageUrl || 'https://placehold.co/1200x800.png'}
                alt={battle.battleName}
                fill
                className="object-cover opacity-30"
                priority
            />
            <div className="absolute top-4 left-4 z-10">
                 <Button variant="outline" onClick={handleEndBattleEarly}>
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
                                Save to Archives & Bestow Participation Reward
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
                                            {lastRoundRewardGiven && (
                                                <p className="text-lg mt-2 text-yellow-300">{lastRoundRewardGiven.recipients} gained {lastRoundRewardGiven.xp} XP and {lastRoundRewardGiven.gold} Gold!</p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-24 w-24 mx-auto text-red-400" />
                                            <p className="text-5xl font-bold mt-4 text-red-300">Incorrect!</p>
                                            <p className="text-xl mt-2 text-white">The correct answer was: <span className="font-bold">{currentQuestion.answers[currentQuestion.correctAnswerIndex]}</span></p>
                                            {lastRoundDamageDealt && (
                                                <p className="text-lg mt-2 text-yellow-300">{lastRoundDamageDealt.recipients} took {lastRoundDamageDealt.amount} damage!</p>
                                            )}
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


    