
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Swords, CheckCircle, XCircle, Trophy, Loader2, Shield } from 'lucide-react';
import type { Student } from '@/lib/data';
import type { DuelQuestion, DuelQuestionSection } from '@/lib/duels';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logGameEvent } from '@/lib/gamelog';
import { calculateLevel } from '@/lib/game-mechanics';

interface DuelState {
    status: 'pending' | 'active' | 'declined' | 'finished';
    challengerUid: string;
    opponentUid: string;
    challengerName: string;
    opponentName: string;
    questions?: DuelQuestion[];
    answers?: { [uid: string]: number[] }; // { studentUid: [answerForQ1, answerForQ2, ...] }
    currentQuestionIndex: number;
    winnerUid?: string;
}

const DuelPlayerCard = ({ player, answers, isCurrentUser }: { player: Student | null, answers: number[], isCurrentUser: boolean }) => {
    if (!player) return <Skeleton className="h-24 w-full" />;
    return (
        <Card className={cn("text-center", isCurrentUser && "border-primary ring-2 ring-primary")}>
            <CardHeader className="p-2">
                 <Image src={player.avatarUrl} alt={player.characterName} width={100} height={100} className="mx-auto rounded-full border-4" />
                 <CardTitle>{player.characterName}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex justify-center gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={cn(
                        "h-6 w-6 rounded-full border-2",
                        answers[i] === undefined ? 'bg-muted' : answers[i] === 1 ? 'bg-green-500' : 'bg-red-500'
                    )} />
                ))}
            </CardContent>
        </Card>
    );
};

export default function DuelPage() {
    const router = useRouter();
    const params = useParams();
    const duelId = params.id as string;
    const { toast } = useToast();
    
    const [user, setUser] = useState<User | null>(null);
    const [duel, setDuel] = useState<DuelState | null>(null);
    const [challenger, setChallenger] = useState<Student | null>(null);
    const [opponent, setOpponent] = useState<Student | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, currentUser => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router]);

    // Fetch teacher UID
    useEffect(() => {
        if (!user) return;
        const getTeacher = async () => {
            const studentMetaRef = doc(db, 'students', user.uid);
            const studentMetaSnap = await getDoc(studentMetaRef);
            if (studentMetaSnap.exists()) {
                setTeacherUid(studentMetaSnap.data().teacherUid);
            }
        }
        getTeacher();
    }, [user]);

    // Set up duel listener
    useEffect(() => {
        if (!teacherUid || !duelId) return;
        
        const duelRef = doc(db, 'teachers', teacherUid, 'duels', duelId);
        const unsubscribe = onSnapshot(duelRef, async (docSnap) => {
            if (docSnap.exists()) {
                const duelData = docSnap.data() as DuelState;
                // If it's the first time loading an active duel, fetch questions
                if (duelData.status === 'active' && !duelData.questions) {
                    const activeSectionsSnapshot = await getDocs(query(collection(db, 'teachers', teacherUid, 'duelQuestionSections'), where('isActive', '==', true)));
                    const allQuestions: DuelQuestion[] = [];
                    for (const sectionDoc of activeSectionsSnapshot.docs) {
                        const questionsSnapshot = await getDocs(collection(sectionDoc.ref, 'questions'));
                        questionsSnapshot.forEach(qDoc => allQuestions.push(qDoc.data() as DuelQuestion));
                    }
                    
                    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
                    const selectedQuestions = shuffled.slice(0, 10);
                    
                    await updateDoc(duelRef, { 
                        questions: selectedQuestions,
                        currentQuestionIndex: 0,
                        answers: { [duelData.challengerUid]: [], [duelData.opponentUid]: [] }
                    });
                } else {
                    setDuel(duelData);
                }
            } else {
                toast({ variant: 'destructive', title: 'Duel not found.' });
                router.push('/dashboard');
            }
        });

        return () => unsubscribe();
    }, [teacherUid, duelId, router, toast]);

    // Fetch player data once duel is loaded
    useEffect(() => {
        if (!duel || !teacherUid) return;
        const fetchPlayers = async () => {
            const challengerRef = doc(db, 'teachers', teacherUid, 'students', duel.challengerUid);
            const opponentRef = doc(db, 'teachers', teacherUid, 'students', duel.opponentUid);
            const [challengerSnap, opponentSnap] = await Promise.all([getDoc(challengerRef), getDoc(opponentRef)]);
            if (challengerSnap.exists()) setChallenger(challengerSnap.data() as Student);
            if (opponentSnap.exists()) setOpponent(opponentSnap.data() as Student);
            setIsLoading(false);
        };
        fetchPlayers();
    }, [duel, teacherUid]);
    
    // Check if current user has answered this question
    useEffect(() => {
        if (user && duel?.answers && duel.answers[user.uid] && duel.answers[user.uid].length > duel.currentQuestionIndex) {
            setHasAnswered(true);
        } else {
            setHasAnswered(false);
        }
        setSelectedAnswer(null);
    }, [user, duel]);
    
    const handleSubmitAnswer = async () => {
        if (selectedAnswer === null || !user || !duel || hasAnswered) return;
        
        const duelRef = doc(db, 'teachers', teacherUid!, 'duels', duelId);
        const currentQuestion = duel.questions![duel.currentQuestionIndex];
        const isCorrect = selectedAnswer === currentQuestion.correctAnswerIndex;

        const newAnswers = [...(duel.answers![user.uid] || [])];
        newAnswers[duel.currentQuestionIndex] = isCorrect ? 1 : 0;
        
        const batch = writeBatch(db);
        batch.update(duelRef, { [`answers.${user.uid}`]: newAnswers });
        
        // Check if both players have answered
        const otherPlayerUid = user.uid === duel.challengerUid ? duel.opponentUid : duel.challengerUid;
        if (duel.answers![otherPlayerUid].length > duel.currentQuestionIndex) {
             if (duel.currentQuestionIndex >= 9) { // Last question
                // Determine winner
                const userScore = newAnswers.filter(a => a === 1).length;
                const opponentScore = duel.answers![otherPlayerUid].filter(a => a === 1).length;
                let winnerUid = '';
                if (userScore > opponentScore) winnerUid = user.uid;
                else if (opponentScore > userScore) winnerUid = otherPlayerUid;
                else winnerUid = 'draw';
                
                batch.update(duelRef, { status: 'finished', winnerUid });
                
                const winnerStudent = students.find(s => s.uid === winnerUid);
                const xpGained = 25;
                const goldGained = 10;
                
                if (winnerStudent) {
                    const studentRef = doc(db, 'teachers', teacherUid!, 'students', winnerUid);
                    const currentXp = winnerStudent.xp || 0;
                    const newXp = currentXp + xpGained;
                    const currentLevel = winnerStudent.level || 1;
                    const newLevel = calculateLevel(newXp);
                    
                    const updates: any = { xp: newXp, gold: (winnerStudent.gold || 0) + goldGained };
                    if (newLevel > currentLevel) updates.level = newLevel;
                    
                    batch.update(studentRef, updates);
                }

            } else {
                batch.update(duelRef, { currentQuestionIndex: duel.currentQuestionIndex + 1 });
            }
        }
        
        await batch.commit();
    };
    
    const currentUserAnswers = user && duel?.answers ? (duel.answers[user.uid] || []) : [];
    const opponentUid = user?.uid === duel?.challengerUid ? duel?.opponentUid : duel?.challengerUid;
    const opponentAnswers = opponentUid && duel?.answers ? (duel.answers[opponentUid] || []) : [];
    const bothAnswered = user && duel?.answers && duel.answers[user.uid].length > duel.currentQuestionIndex && opponentUid && duel.answers[opponentUid].length > duel.currentQuestionIndex;

    if (isLoading || !duel) {
        return <div className="flex h-screen items-center justify-center bg-gray-900"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }

    if (duel.status === 'finished') {
        const winner = duel.winnerUid === 'draw' ? 'The duel was a draw!' : (duel.winnerUid === user?.uid ? 'You are victorious!' : 'You have been defeated!');
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
                <Card className="text-center p-8 bg-card/80 backdrop-blur-sm">
                    <Trophy className="h-16 w-16 mx-auto text-yellow-400" />
                    <CardTitle className="text-4xl mt-4">{winner}</CardTitle>
                    <CardContent>
                        <Button className="mt-4" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const currentQuestion = duel.questions ? duel.questions[duel.currentQuestionIndex] : null;

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-900 p-4 text-white">
            <div className="w-full max-w-4xl">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <DuelPlayerCard player={challenger} answers={duel.answers?.[duel.challengerUid] || []} isCurrentUser={user?.uid === challenger?.uid} />
                    <DuelPlayerCard player={opponent} answers={duel.answers?.[duel.opponentUid] || []} isCurrentUser={user?.uid === opponent?.uid} />
                </div>
                
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader className="text-center">
                        <CardTitle>Question {duel.currentQuestionIndex + 1} / 10</CardTitle>
                        <CardDescription>{currentQuestion?.questionText}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {hasAnswered ? (
                            <div className="text-center text-yellow-400 font-bold text-lg">
                                Your answer is locked in! Waiting for your opponent...
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    {currentQuestion?.answers.map((answer, index) => (
                                        <Button
                                            key={index}
                                            variant={selectedAnswer === index ? 'default' : 'outline'}
                                            onClick={() => setSelectedAnswer(index)}
                                            className="h-auto py-4"
                                        >
                                            {answer}
                                        </Button>
                                    ))}
                                </div>
                                <div className="text-center mt-4">
                                     <Button onClick={handleSubmitAnswer} disabled={selectedAnswer === null}>Submit</Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
