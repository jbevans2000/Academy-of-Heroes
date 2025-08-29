

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, collection, query, updateDoc, getDocs, writeBatch, serverTimestamp, setDoc, deleteDoc, arrayUnion, arrayRemove, addDoc, orderBy, increment, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Download, Timer, HeartCrack, Video, ShieldCheck, Sparkles, Skull, Trash2, VolumeX, Volume1, Volume2 as VolumeIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RoundResults, type Result } from '@/components/teacher/round-results';
import { downloadCsv } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { calculateLevel, calculateHpGain, calculateMpGain, calculateBaseMaxHp } from '@/lib/game-mechanics';
import type { Student } from '@/lib/data';
import { logGameEvent } from '@/lib/gamelog';
import { BattleChatBox } from '@/components/battle/chat-box';
import { BattleDisplay } from '@/components/battle/battle-display';
import { BattleLog } from '@/components/battle/battle-log';
import { useToast } from '@/hooks/use-toast';
import { classPowers } from '@/lib/powers';
import { Slider } from '@/components/ui/slider';


interface QueuedPower {
    casterUid: string;
    powerName: 'Wildfire' | 'Chaos Storm' | 'Berserker Strike' | 'Martial Sacrifice';
    damage: number;
}

interface TargetedEvent {
    targetUid: string;
    message: string;
}

interface RoundEvent {
    studentUid: string;
    message: string;
}

interface VoteState {
    isActive: boolean;
    casterName: string;
    votesFor: string[]; // Votes for "Empower Party"
    votesAgainst: string[]; // Votes for "Damage Boss"
    endsAt: { seconds: number; nanoseconds: number; };
    totalVoters: number;
}

interface LiveBattleState {
  battleId: string | null;
  parentArchiveId: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'ROUND_ENDING' | 'SHOWING_RESULTS' | 'BATTLE_ENDED';
  currentQuestionIndex: number;
  timerEndsAt?: { seconds: number; nanoseconds: number; } | null;
  lastRoundDamage?: number;
  lastRoundBaseDamage?: number;
  lastRoundPowerDamage?: number;
  lastRoundPowersUsed?: string[];
  totalDamage?: number;
  totalBaseDamage?: number;
  totalPowerDamage?: number;
  removedAnswerIndices?: number[];
  powerEventMessage?: string;
  targetedEvent?: TargetedEvent | null;
  roundEvents?: RoundEvent[];
  powerUsersThisRound?: { [key: string]: string[] }; // { studentUid: [powerName, ...] }
  queuedPowers?: QueuedPower[];
  fallenPlayerUids?: string[];
  empoweredMageUids?: string[]; // For Solar Empowerment
  divineJudgmentUses?: { [studentUid: string]: number };
  voteState?: VoteState | null; 
  sorcerersIntuitionUses?: { [key: string]: number }; // For Sorcerer's Intuition
  elementalFusionCasts?: { [studentUid: string]: number };
  globalElementalFusionCasts?: number;
  shielded?: { [uid: string]: { roundsRemaining: number; casterName: string; } }; // uid -> shield info
  chaosStormCasts?: { [studentUid: string]: number }; // For Chaos Storm
  intercepting?: { [casterUid: string]: string }; // casterUid -> targetUid
  damageShields?: { [uid: string]: number };
  zenShieldCasts?: { [studentUid: string]: number }; // For Zen Shield
  inspiringStrikeCasts?: { [studentUid: string]: number };
  immuneToRevival?: string[]; // For Martial Sacrifice
  martialSacrificeCasterUid?: string | null; // Tracks if the power has been used
  arcaneSacrificeCasterUid?: string | null; // Tracks if the power has been used
  divineSacrificeCasterUid?: string | null;
}

interface PowerActivation {
    id?: string;
    studentUid: string;
    studentName: string;
    powerName: string;
    powerMpCost: number;
    targets: string[];
    timestamp: any;
    inputValue?: number;
}


interface Question {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
  damage: number;
}

interface Battle {
    id: string;
    battleName: string;
    questions: Question[];
    videoUrl?: string;
    musicUrl?: string;
}

interface StudentResponse {
    studentUid: string;
    characterName: string;
    answer: string;
    answerIndex: number;
    isCorrect: boolean;
}

interface TeacherData {
    name: string;
}

interface PowerLogEntry {
    round: number;
    casterName: string;
    powerName: string;
    description: string;
    timestamp: any;
}

function CountdownTimer({ expiryTimestamp }: { expiryTimestamp: Date }) {
    const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.round((expiryTimestamp.getTime() - new Date().getTime()) / 1000)));

    useEffect(() => {
        const interval = setInterval(() => {
            const newTimeLeft = Math.max(0, Math.round((expiryTimestamp.getTime() - new Date().getTime()) / 1000));
            setTimeLeft(newTimeLeft);
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTimestamp]);

    return (
        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/80 border border-yellow-300 dark:border-yellow-700">
            <Timer className="h-12 w-12 text-yellow-500 mb-2" />
            <p className="text-4xl font-bold text-yellow-700 dark:text-yellow-300">{timeLeft}</p>
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Round ending...</p>
        </div>
    );
}

const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1];
    } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1];
    }
    const ampersandPosition = videoId.indexOf('&');
    if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
    }
    // Add autoplay and mute for the teacher's view
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
};

function VolumeControl({ audioRef }: { audioRef: React.RefObject<HTMLAudioElement> }) {
    const [volume, setVolume] = useState(0); // Start muted

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


export default function TeacherLiveBattlePage() {
  const params = useParams();
  const router = useRouter();
  const battleId = params.id as string;
  const { toast } = useToast();

  const [battle, setBattle] = useState<Battle | null>(null);
  const [liveState, setLiveState] = useState<LiveBattleState | null>(null);
  const [roundResults, setRoundResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndingRound, setIsEndingRound] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isEndingBattle, setIsEndingBattle] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [redirectId, setRedirectId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            setTeacherUid(currentUser.uid); // Set teacher UID
            const teacherDoc = await getDoc(doc(db, 'teachers', currentUser.uid));
            if (teacherDoc.exists()) {
                setTeacherData(teacherDoc.data() as TeacherData);
            }
        } else {
            router.push('/teacher/login');
        }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!teacherUid) return;
    const fetchStudents = async () => {
        const studentsRef = collection(db, 'teachers', teacherUid, 'students');
        // Use onSnapshot to listen for real-time updates
        const unsubscribe = onSnapshot(studentsRef, (studentsSnapshot) => {
            setAllStudents(studentsSnapshot.docs.map(doc => ({uid: doc.id, ...doc.data()} as Student)));
        });
        return () => unsubscribe(); // Cleanup listener
    }
    fetchStudents();
  }, [teacherUid]);

  const activeParticipants = allStudents.filter(s => s.inBattle);

  // Fetch the static battle definition once
  useEffect(() => {
    if (!battleId || !teacherUid) return;
    const fetchBattle = async () => {
      const docRef = doc(db, 'teachers', teacherUid, 'bossBattles', battleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBattle({ id: docSnap.id, ...docSnap.data() } as Battle);
      } else {
        // Handle battle not found
      }
    };
    fetchBattle();
  }, [battleId, teacherUid]);

  // Listen for real-time updates on the live battle state
  useEffect(() => {
    if (!teacherUid) return;
    setIsLoading(true);
    const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
    const unsubscribe = onSnapshot(liveBattleRef, (docSnap) => {
      if (docSnap.exists()) {
        const newState = docSnap.data() as LiveBattleState;
        setLiveState(newState);
         if (newState.status === 'BATTLE_ENDED') {
            setRedirectId(newState.parentArchiveId);
        }
      } else {
        if (redirectId === null) {
          router.push('/teacher/battles');
        }
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening for live battle state:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [battleId, router, teacherUid, redirectId]);
  
    // Audio playback effect for teacher
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !battle || !battle.musicUrl) return;

        if (liveState?.status === 'IN_PROGRESS' || liveState?.status === 'ROUND_ENDING' || liveState?.status === 'SHOWING_RESULTS') {
            if (audio.src !== battle.musicUrl) {
                audio.src = battle.musicUrl;
            }
            audio.volume = 0; // Start muted
            audio.play().catch(e => console.error("Audio play failed:", e));
        } else {
            audio.pause();
        }
    }, [liveState?.status, battle, battle?.musicUrl]);

  // Real-time listener for current round responses
  useEffect(() => {
      if (!teacherUid || !liveState) {
          return;
      }

      const roundDocRef = doc(db, 'teachers', teacherUid, `liveBattles/active-battle/responses/${liveState.currentQuestionIndex}`);

      const unsubscribe = onSnapshot(roundDocRef, (docSnap) => {
          if (docSnap.exists()) {
              const submittedResponses: StudentResponse[] = docSnap.data().responses || [];
              const results: Result[] = submittedResponses.map(res => ({
                  studentUid: res.studentUid,
                  studentName: res.characterName,
                  answer: res.answer,
                  isCorrect: res.isCorrect,
                  powerUsed: liveState.powerUsersThisRound?.[res.studentUid]?.join(', ') || undefined,
              }));
              setRoundResults(results);
          } else {
              setRoundResults([]); // Reset if document doesn't exist (e.g., new round)
          }
      }, (error) => {
          console.error("Error listening to round responses:", error);
      });

      return () => unsubscribe();
  }, [teacherUid, liveState, liveState?.currentQuestionIndex]);

  const handleEndBattleAndAggregate = async () => {
    if (!liveState || !battle || !teacherUid || !liveState.parentArchiveId) return;
    setIsEndingBattle(true);

    try {
        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const batch = writeBatch(db);
        const parentArchiveRef = doc(db, 'teachers', teacherUid, 'savedBattles', liveState.parentArchiveId);
        
        const finalLiveStateSnap = await getDoc(liveBattleRef);
        if (!finalLiveStateSnap.exists()) throw new Error("Live battle document disappeared before aggregation.");
        const finalLiveState = finalLiveStateSnap.data() as LiveBattleState;
        
        const totalDamageDealt = finalLiveState.totalDamage || 0;
        const totalRounds = battle.questions.length;
        
        // Fetch all rounds data to calculate participation
        const roundsArchiveRef = collection(db, 'teachers', teacherUid, 'savedBattles', liveState.parentArchiveId, 'rounds');
        const roundsSnap = await getDocs(roundsArchiveRef);
        const battleLogRef = collection(db, 'teachers', teacherUid, 'liveBattles/active-battle/battleLog');
        const battleLogSnap = await getDocs(battleLogRef);

        const rewardsByStudent: { [uid: string]: any } = {};
        const participationCount: { [uid: string]: number } = {};
        const powerUsageCount: { [uid: string]: number } = {};
        const participantUids = new Set<string>();
        
        const wasMartialSacrificeUsed = !!finalLiveState.martialSacrificeCasterUid;
        const wasArcaneSacrificeUsed = !!finalLiveState.arcaneSacrificeCasterUid;
        const wasDivineSacrificeUsed = !!finalLiveState.divineSacrificeCasterUid;
        const sacrificedPlayerUids = [
            finalLiveState.martialSacrificeCasterUid, 
            finalLiveState.arcaneSacrificeCasterUid,
            finalLiveState.divineSacrificeCasterUid
        ].filter(Boolean) as string[];

        // 1. Tally correct answers and participation from archived rounds
        roundsSnap.docs.forEach(roundDoc => {
            const roundData = roundDoc.data();
            (roundData.responses || []).forEach((res: any) => {
                participantUids.add(res.studentUid);
                if (!participationCount[res.studentUid]) participationCount[res.studentUid] = 0;
                participationCount[res.studentUid]++;

                if (!rewardsByStudent[res.studentUid]) {
                    rewardsByStudent[res.studentUid] = { xp: 0, gold: 0, correctAnswers: 0, powersUsed: 0 };
                }
                if (res.isCorrect) {
                    rewardsByStudent[res.studentUid].correctAnswers++;
                }
            });
        });
        
        // 2. Tally power usage from the battle log
        battleLogSnap.docs.forEach(logDoc => {
            const logData = logDoc.data();
            const caster = allStudents.find(s => s.characterName === logData.casterName);
            if (caster) {
                 if (!powerUsageCount[caster.uid]) powerUsageCount[caster.uid] = 0;
                 powerUsageCount[caster.uid]++;
                 if (rewardsByStudent[caster.uid]) {
                    rewardsByStudent[caster.uid].powersUsed = (rewardsByStudent[caster.uid].powersUsed || 0) + 1;
                 }
            }
        });
        
        const currentlyFallenUids = finalLiveState.fallenPlayerUids || [];

        // 3. Calculate final rewards for each participant
        for (const uid of participantUids) {
            const studentRewards = rewardsByStudent[uid];
            
            if (sacrificedPlayerUids.includes(uid) || currentlyFallenUids.includes(uid)) {
                studentRewards.xpGained = 0;
                studentRewards.goldGained = 0;
                studentRewards.breakdown = { hadFullParticipation: false, totalDamageDealt };
                continue; // Skip to next student
            }
            
            const xpFromAnswers = studentRewards.correctAnswers * 5;
            const goldFromAnswers = studentRewards.correctAnswers * 10;
            
            const xpFromPowers = studentRewards.powersUsed * 2;
            const goldFromPowers = studentRewards.powersUsed * 1;

            let xpFromParticipation = 0;
            let goldFromParticipation = 0;
            let xpFromDamageShare = 0;

            const hasFullParticipation = participationCount[uid] === totalRounds;

            if (hasFullParticipation) {
                xpFromParticipation = 25;
                goldFromParticipation = 10;
                xpFromDamageShare = Math.floor(totalDamageDealt * 0.25);
            }
            
            const baseTotalXp = xpFromAnswers + xpFromPowers + xpFromParticipation + xpFromDamageShare;
            const baseTotalGold = goldFromAnswers + goldFromPowers + goldFromParticipation;

            let xpBonus = 0;
            let goldBonus = 0;
            
            if (wasMartialSacrificeUsed) {
                xpBonus += Math.ceil(baseTotalXp * 0.25);
                goldBonus += Math.ceil(baseTotalGold * 0.25);
            }
            if (wasArcaneSacrificeUsed) {
                 xpBonus += Math.ceil(baseTotalXp * 0.25);
            }
             if (wasDivineSacrificeUsed) {
                 xpBonus += Math.ceil(baseTotalXp * 0.25);
            }
            
            studentRewards.xpGained = baseTotalXp + xpBonus;
            studentRewards.goldGained = baseTotalGold + goldBonus;
            
            studentRewards.breakdown = {
                xpFromAnswers, goldFromAnswers,
                xpFromPowers, goldFromPowers,
                xpFromParticipation, goldFromParticipation,
                xpFromDamageShare,
                hadFullParticipation: hasFullParticipation,
                totalDamageDealt,
                martialSacrificeBonus: wasMartialSacrificeUsed,
                arcaneSacrificeBonus: wasArcaneSacrificeUsed,
                divineSacrificeBonus: wasDivineSacrificeUsed,
            };
        }

        batch.update(parentArchiveRef, {
            status: 'BATTLE_ENDED',
            fallenAtEnd: finalLiveState.fallenPlayerUids || [],
            rewardsByStudent: rewardsByStudent,
            participantUids: Array.from(participantUids),
            totalDamage: finalLiveState.totalDamage || 0,
            totalBaseDamage: finalLiveState.totalBaseDamage || 0,
            totalPowerDamage: finalLiveState.totalPowerDamage || 0,
            martialSacrificeCasterUid: finalLiveState.martialSacrificeCasterUid || null,
            arcaneSacrificeCasterUid: finalLiveState.arcaneSacrificeCasterUid || null,
            divineSacrificeCasterUid: finalLiveState.divineSacrificeCasterUid || null,
        });

        const studentDocs = await getDocs(collection(db, 'teachers', teacherUid, 'students'));
        for (const studentDoc of studentDocs.docs) {
             const studentData = studentDoc.data() as Student;
             const rewards = rewardsByStudent[studentDoc.id];
             if (rewards && !currentlyFallenUids.includes(studentDoc.id) && !sacrificedPlayerUids.includes(studentDoc.id)) {
                 const studentRef = doc(db, 'teachers', teacherUid, 'students', studentDoc.id);
                 const currentXp = studentData.xp || 0;
                 const newXp = currentXp + rewards.xpGained;
                 const currentLevel = studentData.level || 1;
                 const newLevel = calculateLevel(newXp);
                 
                 const updates: any = {
                    xp: newXp,
                    gold: (studentData.gold || 0) + rewards.goldGained,
                 };

                 if (newLevel > currentLevel) {
                    updates.level = newLevel;
                    updates.maxHp = calculateBaseMaxHp(studentData.class, newLevel, 'hp');
                    updates.maxMp = calculateBaseMaxHp(studentData.class, newLevel, 'mp');
                 }
                 
                 batch.update(studentRef, updates);
             }
        }
        
        await batch.commit();

        await updateDoc(liveBattleRef, { status: 'BATTLE_ENDED' });

        await logGameEvent(teacherUid, 'BOSS_BATTLE', `Battle '${battle.battleName}' ended.`);
        router.push(`/teacher/battle/summary/${liveState.parentArchiveId}`);
    } catch (e) {
        console.error("Error ending battle:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to end battle and aggregate results.' });
        setIsEndingBattle(false);
    }
};


    const calculateAndSetResults = async ({ isDivinationSkip = false }: { isDivinationSkip?: boolean } = {}) => {
        if (!liveState || !battle || !teacherUid || !allStudents.length) return;

        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const batch = writeBatch(db);
        
        const currentLiveSnap = await getDoc(liveBattleRef);
        if (!currentLiveSnap.exists()) return;
        const currentLiveState = currentLiveSnap.data() as LiveBattleState;
        
        // --- PRE-CALCULATION PHASE ---
        let sacrificeThisRound = false;
        const roundEvents: RoundEvent[] = [];

        // Decrement shield timers at the start of result calculation
        const currentShields = currentLiveState.shielded || {};
        const newShields: { [uid: string]: { roundsRemaining: number; casterName: string; } } = {};
        for (const uid in currentShields) {
            const shield = currentShields[uid];
            if (shield.roundsRemaining > 1) {
                newShields[uid] = { ...shield, roundsRemaining: shield.roundsRemaining - 1 };
            }
        }
        
        if (currentLiveState.martialSacrificeCasterUid && !currentLiveState.powerEventMessage?.includes("has already sacrificed")) {
            sacrificeThisRound = true;
            for (const uid in newShields) {
                newShields[uid].roundsRemaining += 1;
            }
        }
        batch.update(liveBattleRef, { shielded: newShields });

        const studentMap = new Map(allStudents.map(doc => [doc.uid, doc]));
        const newlyFallenUids: string[] = [];
        
        const studentsInBattle = allStudents.filter(s => s.inBattle);
        const roundResponses = (await getDoc(doc(liveBattleRef, `responses/${liveState.currentQuestionIndex}`))).data()?.responses || [];

        const sorcerersThisRound = new Set<string>();
        for (const studentUid in liveState.powerUsersThisRound) {
            if (liveState.powerUsersThisRound[studentUid].includes('Sorcerer’s Intuition')) {
                sorcerersThisRound.add(studentUid);
            }
        }
        
        let powerDamage = isDivinationSkip ? (liveState.lastRoundPowerDamage || 0) : 0;
        const powersUsedThisRound: string[] = isDivinationSkip ? (liveState.lastRoundPowersUsed || []) : [];
        const battleLogRef = collection(db, 'teachers', teacherUid, 'liveBattles/active-battle/battleLog');
        
        let baseDamageFromAnswers = 0;
        let finalRoundResponses = [...roundResponses];

        // --- INTERCEPT LOGIC ---
        const interceptors = currentLiveState.intercepting || {};
        let redirectedDamageForGuardians: { [uid: string]: number } = {};

        for (const interceptorUid in interceptors) {
            const targetUid = interceptors[interceptorUid];
            const interceptorResponse = roundResponses.find(r => r.studentUid === interceptorUid);
            const targetResponse = roundResponses.find(r => r.studentUid === targetUid);
            const currentQuestion = battle.questions[liveState.currentQuestionIndex];

            const interceptorName = studentMap.get(interceptorUid)?.characterName || 'A Guardian';
            const targetName = studentMap.get(targetUid)?.characterName || 'an ally';
            roundEvents.push({ studentUid: interceptorUid, message: `You bravely intercepted the attack for ${targetName}!` });
            roundEvents.push({ studentUid: targetUid, message: `${interceptorName} bravely intercepted the attack for you!` });


            if (interceptorResponse?.isCorrect) {
                powerDamage += 5; // Intercept bonus damage
                if (targetResponse && !targetResponse.isCorrect) {
                    // Flip target's answer to correct
                    finalRoundResponses = finalRoundResponses.map(res => 
                        res.studentUid === targetUid ? { ...res, isCorrect: true } : res
                    );
                }
            } else { // Interceptor is wrong
                if (targetResponse && !targetResponse.isCorrect) {
                    // Redirect damage from target to Guardian
                    const damageToRedirect = currentQuestion.damage || 0;
                    if (!redirectedDamageForGuardians[interceptorUid]) redirectedDamageForGuardians[interceptorUid] = 0;
                    redirectedDamageForGuardians[interceptorUid] += damageToRedirect;
                }
            }
        }
        
        // --- ABSORB & DAMAGE CALCULATION ---
        const studentDamageShields = { ...(currentLiveState.damageShields || {}) };

        // --- DAMAGE CALCULATION ---
        if (!isDivinationSkip) {
            const currentQuestion = battle.questions[liveState.currentQuestionIndex];
            const damageOnIncorrect = currentQuestion.damage || 0;
            const damageToTakeByStudent: { [uid: string]: number } = {};

            // Calculate initial damage for each student
            if (damageOnIncorrect > 0) {
                 for (const student of studentsInBattle) {
                     const studentResponse = finalRoundResponses.find(r => r.studentUid === student.uid);

                     // Damage for own incorrect answer
                     if (!studentResponse || !studentResponse.isCorrect) {
                        damageToTakeByStudent[student.uid] = (damageToTakeByStudent[student.uid] || 0) + damageOnIncorrect;
                     }
                 }
            }
            
            // Handle damage redirection from Guard
            for(const student of studentsInBattle) {
                if (student.guardedBy && damageToTakeByStudent[student.uid] > 0) {
                    const guardianUid = student.guardedBy;
                    const guardianName = studentMap.get(guardianUid)?.characterName || 'A Guardian';
                    
                    roundEvents.push({ studentUid: student.uid, message: `You were protected by ${guardianName}'s Guard!` });
                    if(guardianUid) roundEvents.push({ studentUid: guardianUid, message: `Your Guard protected ${student.characterName}!` });
                    
                    // Add the guarded student's damage to the guardian's total for this round
                    if (guardianUid) {
                        if (!redirectedDamageForGuardians[guardianUid]) redirectedDamageForGuardians[guardianUid] = 0;
                        redirectedDamageForGuardians[guardianUid] += damageToTakeByStudent[student.uid];
                    }
                    
                    delete damageToTakeByStudent[student.uid]; // The guarded student takes no damage
                }
            }

            // Add redirected damage to the main damage calculation
            for (const guardianUid in redirectedDamageForGuardians) {
                damageToTakeByStudent[guardianUid] = (damageToTakeByStudent[guardianUid] || 0) + redirectedDamageForGuardians[guardianUid];
            }


            // Apply all damage after redirection calculations
            for (const studentUid in damageToTakeByStudent) {
                const student = studentMap.get(studentUid);
                if(!student) continue;

                let damageToApply = damageToTakeByStudent[studentUid];
                const isShielded = newShields[student.uid]?.roundsRemaining > 0;
                
                if (isShielded) {
                     const casterName = newShields[student.uid]?.casterName || "An ally";
                     roundEvents.push({ studentUid: student.uid, message: `Your shield from ${casterName} absorbed all damage!` });
                     continue; // Skip damage application
                }
                
                if (studentDamageShields[student.uid] && studentDamageShields[student.uid] > 0) {
                    const shieldAmount = studentDamageShields[student.uid];
                    roundEvents.push({ studentUid: student.uid, message: `Your Absorb shield negated some damage!` });
                    if (damageToApply <= shieldAmount) {
                        studentDamageShields[student.uid] -= damageToApply;
                        damageToApply = 0;
                    } else {
                        damageToApply -= shieldAmount;
                        delete studentDamageShields[student.uid];
                    }
                }

                if (damageToApply > 0) {
                    const studentRef = doc(db, 'teachers', teacherUid, 'students', student.uid);
                    const newHp = Math.max(0, student.hp - damageToApply);
                    batch.update(studentRef, { hp: newHp });
                    if (newHp === 0 && !liveState.fallenPlayerUids?.includes(student.uid)) {
                        newlyFallenUids.push(student.uid);
                    }
                }
            }
        }
        
        finalRoundResponses.forEach(res => {
            if (res.isCorrect || sorcerersThisRound.has(res.studentUid)) {
                baseDamageFromAnswers++;
            }
        });

        // Elemental Fusion & Inspiring Strike damage calculation
        const elementalFusionCasters = new Set<string>();
        if(currentLiveState.powerUsersThisRound) {
            for (const studentUid in currentLiveState.powerUsersThisRound) {
                if (currentLiveState.powerUsersThisRound[studentUid].includes('Elemental Fusion')) {
                    elementalFusionCasters.add(studentUid);
                }
            }
        }
        const inspiringStrikeCasters = new Set<string>();
        if(currentLiveState.powerUsersThisRound) {
            for (const studentUid in currentLiveState.powerUsersThisRound) {
                if (currentLiveState.powerUsersThisRound[studentUid].includes('Inspiring Strike')) {
                    inspiringStrikeCasters.add(studentUid);
                }
            }
        }
        
        if (elementalFusionCasters.size > 0) {
            const bonusDamage = baseDamageFromAnswers * 2;
            powerDamage += bonusDamage;
            powersUsedThisRound.push(`Elemental Fusion (+${bonusDamage} dmg)`);
        }
        if (inspiringStrikeCasters.size > 0) {
            const bonusDamage = baseDamageFromAnswers * 2;
            powerDamage += bonusDamage;
            powersUsedThisRound.push(`Inspiring Strike (+${bonusDamage} dmg)`);
        }


        if (!isDivinationSkip) {
            for (const power of liveState.queuedPowers || []) {
                const casterResponse = finalRoundResponses.find(res => res.studentUid === power.casterUid);
                const casterName = casterResponse?.characterName || studentMap.get(power.casterUid)?.characterName || 'Unknown Hero';
                
                let shouldApplyDamage = power.powerName === 'Martial Sacrifice' || casterResponse?.isCorrect;

                if (shouldApplyDamage) {
                    powerDamage += power.damage;
                    powersUsedThisRound.push(`${power.powerName} (${power.damage} dmg)`);
                    batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: casterName,
                        powerName: power.powerName,
                        description: `Dealt ${power.damage} damage.`,
                        timestamp: serverTimestamp()
                    });
                } else {
                    batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: casterName,
                        powerName: power.powerName,
                        description: 'Fizzled due to incorrect answer.',
                        timestamp: serverTimestamp()
                    });
                }
            }
        }

        const totalDamageThisRound = baseDamageFromAnswers + powerDamage;

        const updatePayload: Partial<LiveBattleState> = {
            status: 'SHOWING_RESULTS',
            timerEndsAt: null,
            lastRoundDamage: totalDamageThisRound,
            lastRoundBaseDamage: baseDamageFromAnswers,
            lastRoundPowerDamage: powerDamage,
            lastRoundPowersUsed: powersUsedThisRound,
            totalDamage: (currentLiveState.totalDamage || 0) + totalDamageThisRound,
            totalBaseDamage: (currentLiveState.totalBaseDamage || 0) + baseDamageFromAnswers,
            totalPowerDamage: (currentLiveState.totalPowerDamage || 0) + powerDamage,
            voteState: null,
            damageShields: studentDamageShields,
            roundEvents: roundEvents
        };

        if (newlyFallenUids.length > 0) {
            updatePayload.fallenPlayerUids = arrayUnion(...newlyFallenUids);
        }

        batch.update(liveBattleRef, updatePayload);
        await batch.commit();

        const updatedLiveSnap = await getDoc(liveBattleRef);
        if (updatedLiveSnap.exists() && liveState.parentArchiveId) {
             const stateToSave = {
                ...updatedLiveSnap.data(),
                responses: finalRoundResponses
             };

            const archiveRoundRef = doc(db, 'teachers', teacherUid, 'savedBattles', liveState.parentArchiveId, 'rounds', String(liveState.currentQuestionIndex));
            await setDoc(archiveRoundRef, stateToSave);
        }
    };

    // Effect for Divine Judgment vote resolution
    useEffect(() => {
        if (!liveState?.voteState?.isActive || !liveState?.voteState?.endsAt || !teacherUid) return;

        const expiryDate = new Date(liveState.voteState.endsAt.seconds * 1000);
        const now = new Date();
        const timeUntilExpiry = expiryDate.getTime() - now.getTime();
        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');

        const timer = setTimeout(async () => {
            const battleSnap = await getDoc(liveBattleRef);
            if (!battleSnap.exists()) return;
            const currentVoteState = battleSnap.data().voteState as VoteState;
            const caster = allStudents.find(s => s.characterName === currentVoteState.casterName);

            let empowerVotes = currentVoteState.votesFor.length;
            let damageVotes = currentVoteState.votesAgainst.length;
            let outcome: 'empower' | 'damage';

            if (empowerVotes > damageVotes) {
                outcome = 'empower';
            } else if (damageVotes > empowerVotes) {
                outcome = 'damage';
            } else {
                outcome = Math.random() < 0.5 ? 'empower' : 'damage'; // Random on tie
            }

            const batch = writeBatch(db);
            const battleLogRef = collection(db, 'teachers', teacherUid, 'liveBattles/active-battle/battleLog');

            if (outcome === 'empower') {
                 const buffAmount = Math.ceil((caster?.level || 1) * 0.25);
                 const livingStudents = allStudents.filter(s => s.inBattle && s.hp > 0);
                 livingStudents.forEach(student => {
                     const studentRef = doc(db, 'teachers', teacherUid, 'students', student.uid);
                     batch.update(studentRef, {
                         maxHp: increment(buffAmount),
                         hp: increment(buffAmount)
                     });
                 });
                 batch.update(liveBattleRef, { 
                     powerEventMessage: `Divine Judgment: The party chose to empower! All heroes gain +${buffAmount} HP!`,
                     voteState: null 
                 });
                  batch.set(doc(battleLogRef), {
                    round: liveState.currentQuestionIndex + 1,
                    casterName: caster?.characterName || 'A Healer',
                    powerName: 'Divine Judgment (Empower)',
                    description: `Empowered party for +${buffAmount} HP.`,
                    timestamp: serverTimestamp()
                });
            } else { // Damage
                let totalDamage = 0;
                for (let i = 0; i < 4; i++) totalDamage += Math.floor(Math.random() * 20) + 1;
                totalDamage += (caster?.level || 1);
                
                batch.update(liveBattleRef, { 
                    totalPowerDamage: increment(totalDamage),
                    powerEventMessage: `Divine Judgment: The party chose to attack! The boss takes ${totalDamage} divine damage!`,
                    voteState: null 
                });
                batch.set(doc(battleLogRef), {
                    round: liveState.currentQuestionIndex + 1,
                    casterName: caster?.characterName || 'A Healer',
                    powerName: 'Divine Judgment (Damage)',
                    description: `Dealt ${totalDamage} damage to the boss.`,
                    timestamp: serverTimestamp()
                });
            }
            await batch.commit();
            setTimeout(() => updateDoc(liveBattleRef, { powerEventMessage: '' }), 5000);

        }, timeUntilExpiry > 0 ? timeUntilExpiry : 0);

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveState?.voteState, teacherUid, allStudents]);

    // Power Activation Listener
    useEffect(() => {
        if (!liveState || !battle || !teacherUid || (liveState.status !== 'IN_PROGRESS' && liveState.status !== 'ROUND_ENDING')) return;

        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const powerActivationsRef = collection(db, 'teachers', teacherUid, `liveBattles/active-battle/powerActivations`);
        const battleLogRef = collection(db, 'teachers', teacherUid!, 'liveBattles/active-battle/battleLog');
        const q = query(powerActivationsRef);

        const handlePowerActivation = async (activation: PowerActivation) => {
             const studentRef = doc(db, 'teachers', teacherUid!, 'students', activation.studentUid);
             const battleDoc = await getDoc(liveBattleRef);
             const studentDoc = await getDoc(studentRef);

             if (!battleDoc.exists() || !studentDoc.exists()) return;
             const battleData = battleDoc.data() as LiveBattleState;
             const studentData = studentDoc.data() as Student;

             if (studentData.mp < activation.powerMpCost) return;
             if ((battleData.powerUsersThisRound?.[activation.studentUid] || []).length > 0) return;

            const batch = writeBatch(db);

            if (activation.powerName === 'Nature’s Guidance') {
                const baseChance = 0.20;
                const levelBonus = (studentData.level || 1) * 0.01;
                const successChance = baseChance + levelBonus;
                const roll = Math.random();

                if (roll <= successChance) {
                    // Success
                    const currentQuestion = battle!.questions[battleData!.currentQuestionIndex];
                    const incorrectAnswerIndices = currentQuestion.answers
                        .map((_, i) => i)
                        .filter(i => i !== currentQuestion.correctAnswerIndex);

                    const removableIndices = incorrectAnswerIndices.filter(i => !(battleData!.removedAnswerIndices || []).includes(i));

                    if (removableIndices.length > 0) {
                        const indexToRemove = removableIndices[Math.floor(Math.random() * removableIndices.length)];
                        batch.update(liveBattleRef, {
                            removedAnswerIndices: arrayUnion(indexToRemove),
                            powerEventMessage: `${activation.studentName} used Nature's Guidance successfully!`
                        });
                        batch.set(doc(battleLogRef), {
                            round: liveState.currentQuestionIndex + 1,
                            casterName: activation.studentName,
                            powerName: activation.powerName,
                            description: 'Removed one incorrect answer.',
                            timestamp: serverTimestamp()
                        });
                    }
                } else {
                    // Failure
                    batch.update(liveBattleRef, {
                        powerEventMessage: `The spirits of nature do not answer ${activation.studentName}'s call! The power fizzles!`,
                        targetedEvent: { targetUid: activation.studentUid, message: "Your plea to nature went unanswered!" }
                    });
                     batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: 'Fizzled and had no effect.',
                        timestamp: serverTimestamp()
                    });
                }
            } else if (activation.powerName === 'Absorb') {
                if (!activation.targets || activation.targets.length === 0 || !activation.inputValue) return;
                const absorbAmount = activation.inputValue;
                const selfDamage = Math.floor(absorbAmount * 0.8);
                
                // Deal self-damage
                if (selfDamage > 0) {
                    const newHp = Math.max(0, studentData.hp - selfDamage);
                    batch.update(studentRef, { hp: newHp });
                     if (newHp === 0 && !(battleData.fallenPlayerUids || []).includes(activation.studentUid)) {
                        batch.update(liveBattleRef, { fallenPlayerUids: arrayUnion(activation.studentUid) });
                    }
                }
                
                // Distribute shield
                const damagePerTarget = Math.floor(absorbAmount / activation.targets.length);
                const updates: { [key: string]: any } = {};
                for (const targetUid of activation.targets) {
                    updates[`damageShields.${targetUid}`] = increment(damagePerTarget);
                }
                
                batch.update(liveBattleRef, updates);
                
                batch.set(doc(battleLogRef), {
                    round: liveState.currentQuestionIndex + 1,
                    casterName: activation.studentName,
                    powerName: activation.powerName,
                    description: `Absorbed up to ${absorbAmount} damage for ${activation.targets.length} allies, taking ${selfDamage} damage.`,
                    timestamp: serverTimestamp()
                });
            } else if (activation.powerName === 'Martial Sacrifice') {
                if (battleData.martialSacrificeCasterUid) {
                     batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: `${allStudents.find(s => s.uid === battleData.martialSacrificeCasterUid)?.characterName || 'A hero'} has already sacrificed themself for the glory of the group! Don't let it be in vain!` } });
                } else {
                    const roll1 = Math.floor(Math.random() * 20) + 1;
                    const roll2 = Math.floor(Math.random() * 20) + 1;
                    const damage = roll1 + roll2 + (studentData.level || 1);
                    const newQueuedPower: QueuedPower = { casterUid: activation.studentUid, powerName: 'Martial Sacrifice', damage: damage };
                    
                    batch.update(liveBattleRef, {
                        queuedPowers: arrayUnion(newQueuedPower),
                        martialSacrificeCasterUid: activation.studentUid,
                        immuneToRevival: arrayUnion(activation.studentUid),
                        fallenPlayerUids: arrayUnion(activation.studentUid),
                        powerEventMessage: `${activation.studentName} has made the ultimate sacrifice!`,
                        targetedEvent: { targetUid: activation.studentUid, message: "You brace yourself for the ultimate sacrifice. Your vision fades as you pour your life force into a final, heroic strike for the sake of your allies!"}
                    });
                    batch.update(studentRef, { hp: 0, mp: 0 });
                }
            } else if (activation.powerName === 'Arcane Sacrifice') {
                if (battleData.arcaneSacrificeCasterUid) {
                    batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: `${allStudents.find(s => s.uid === battleData.arcaneSacrificeCasterUid)?.characterName || 'A mage'} has already sacrificed themself for the glory of the group! Don't let their sacrifice be in vain!` } });
                } else {
                    // Apply buff to all LIVING students
                    const livingStudents = allStudents.filter(s => s.inBattle && s.hp > 0 && s.uid !== activation.studentUid);
                    for (const student of livingStudents) {
                        const targetRef = doc(db, 'teachers', teacherUid!, 'students', student.uid);
                        const newMaxMp = student.maxMp + 5;
                        const newMp = Math.min(newMaxMp, student.mp + 15);
                        batch.update(targetRef, { maxMp: newMaxMp, mp: newMp });
                    }

                    batch.update(liveBattleRef, {
                        arcaneSacrificeCasterUid: activation.studentUid,
                        immuneToRevival: arrayUnion(activation.studentUid),
                        fallenPlayerUids: arrayUnion(activation.studentUid),
                        powerEventMessage: `${activation.studentName} has sacrificed their life force, unleashing a wave of raw magical power that empowers the party!`,
                        targetedEvent: { targetUid: activation.studentUid, message: "You pull upon the leylines, letting an overwhelming surge of arcane energy flow through you and into your allies before your vision fades to black."}
                    });
                    batch.update(studentRef, { hp: 0, mp: 0 });
                }
            } else if (activation.powerName === 'Divine Sacrifice') {
                if (battleData.divineSacrificeCasterUid) {
                    batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: `${allStudents.find(s => s.uid === battleData.divineSacrificeCasterUid)?.characterName || 'A Healer'} has already sacrificed themselves for the glory of the group! Don't let their sacrifice be in vain!` } });
                } else {
                    const livingStudents = allStudents.filter(s => s.inBattle && s.hp > 0 && s.uid !== activation.studentUid);
                    for (const student of livingStudents) {
                        const targetRef = doc(db, 'teachers', teacherUid!, 'students', student.uid);
                        const newMaxHp = student.maxHp + 5;
                        const newHp = Math.min(newMaxHp, student.hp + 15);
                        batch.update(targetRef, { maxHp: newMaxHp, hp: newHp });
                    }

                    batch.update(liveBattleRef, {
                        divineSacrificeCasterUid: activation.studentUid,
                        immuneToRevival: arrayUnion(activation.studentUid),
                        fallenPlayerUids: arrayUnion(activation.studentUid),
                        powerEventMessage: `${activation.studentName} has made the Divine Sacrifice! A wave of healing light washes over the party, strengthening their resolve!`,
                        targetedEvent: { targetUid: activation.studentUid, message: "You channel all of your life's energy into a final, selfless act, sending a wave of pure vitality to your allies as your spirit departs the battlefield." }
                    });
                    batch.update(studentRef, { hp: 0, mp: 0 });
                }
            } else if (activation.powerName === 'Wildfire') {
                const roll1 = Math.floor(Math.random() * 6) + 1;
                const roll2 = Math.floor(Math.random() * 6) + 1;
                const damage = roll1 + roll2 + (studentData.level || 1);

                const newQueuedPower: QueuedPower = {
                    casterUid: activation.studentUid,
                    powerName: 'Wildfire',
                    damage: damage,
                };

                batch.update(liveBattleRef, {
                    queuedPowers: arrayUnion(newQueuedPower),
                    powerEventMessage: `${activation.studentName} has cast Wildfire! Their foe will receive ${damage} points of damage if their spell strikes true!`
                });
            } else if (activation.powerName === 'Berserker Strike') {
                const roll = Math.floor(Math.random() * 20) + 1;
                if (roll >= 6) {
                    const damage = roll + (studentData.level || 1);
                    const newQueuedPower: QueuedPower = { casterUid: activation.studentUid, powerName: 'Berserker Strike', damage: damage };
                    batch.update(liveBattleRef, {
                        queuedPowers: arrayUnion(newQueuedPower),
                        powerEventMessage: `${activation.studentName} flies into a berserker rage!`,
                        targetedEvent: { targetUid: activation.studentUid, message: `You charge into the fray in a berserker rage, and strike the enemy for ${damage} damage!` }
                    });
                     batch.set(doc(battleLogRef), { round: liveState.currentQuestionIndex + 1, casterName: activation.studentName, powerName: activation.powerName, description: `Dealt ${damage} damage.`, timestamp: serverTimestamp() });
                } else {
                    const selfDamage = studentData.level || 1;
                    const newHp = Math.max(0, studentData.hp - selfDamage);
                    batch.update(studentRef, { hp: newHp });
                    if (newHp === 0 && !(battleData.fallenPlayerUids || []).includes(activation.studentUid)) {
                        batch.update(liveBattleRef, { fallenPlayerUids: arrayUnion(activation.studentUid) });
                    }
                    batch.update(liveBattleRef, {
                        targetedEvent: { targetUid: activation.studentUid, message: `You charge in to the fray with reckless abandon and pay the price, taking ${selfDamage} damage from the enemy!` }
                    });
                     batch.set(doc(battleLogRef), { round: liveState.currentQuestionIndex + 1, casterName: activation.studentName, powerName: activation.powerName, description: `Took ${selfDamage} self-inflicted damage.`, timestamp: serverTimestamp() });
                }
            } else if (activation.powerName === 'Chaos Storm') {
                const casts = battleData.chaosStormCasts?.[activation.studentUid] || 0;
                if (casts >= 2) {
                    batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: "You are too exhausted to control the forces of Chaos! Choose another power!" } });
                } else {
                    let totalDamage = 0;
                    for (let i = 0; i < 10; i++) {
                        totalDamage += Math.floor(Math.random() * 6) + 1;
                    }
                    totalDamage += studentData.level || 1;
                    
                    batch.update(liveBattleRef, {
                        totalPowerDamage: increment(totalDamage),
                        [`chaosStormCasts.${activation.studentUid}`]: increment(1),
                        powerEventMessage: `${activation.studentName} has summoned a storm of pure chaos to smite the Enemy for ${totalDamage} damage!`,
                        targetedEvent: { targetUid: activation.studentUid, message: `You have summoned a storm of pure chaos to smite the Enemy for ${totalDamage} damage!` },
                    });
                     batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: `Dealt ${totalDamage} direct damage.`,
                        timestamp: serverTimestamp()
                    });
                }
            } else if (activation.powerName === 'Enduring Spirit') {
                if (!activation.targets || activation.targets.length === 0) return;
                const targetUid = activation.targets[0];
                const targetRef = doc(db, 'teachers', teacherUid!, 'students', targetUid);
                const targetSnap = await getDoc(targetRef);

                if (targetSnap.exists() && targetSnap.data().hp <= 0 && !(battleData.immuneToRevival || []).includes(targetUid)) {
                    const targetData = targetSnap.data() as Student;
                    const healAmount = Math.ceil(targetData.maxHp * 0.1);
                    batch.update(targetRef, { hp: healAmount });

                    batch.update(liveBattleRef, {
                        fallenPlayerUids: arrayRemove(targetUid),
                        powerEventMessage: `${activation.studentName} cast Enduring Spirit and restored ${targetData.characterName} to life!`,
                        targetedEvent: {
                            targetUid: targetUid,
                            message: `${studentData.characterName} has brought you back from the brink! Get back into the fight!`
                        }
                    });
                     batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: `Revived ${targetData.characterName}.`,
                        timestamp: serverTimestamp()
                    });
                } else if (targetSnap.exists()) {
                    const message = (battleData.immuneToRevival || []).includes(targetUid)
                        ? "This hero's sacrifice is absolute. They cannot be revived."
                        : `${targetSnap.data().characterName} has already been restored! Choose another power.`;
                    
                    const targetedEvent: TargetedEvent = { targetUid: activation.studentUid, message: message };
                    await updateDoc(liveBattleRef, { targetedEvent: targetedEvent });
                    setTimeout(() => updateDoc(liveBattleRef, { targetedEvent: null }), 5000);
                    return;
                }
            } else if (activation.powerName === 'Lesser Heal') {
                if (!activation.targets || activation.targets.length === 0) return;

                const powerDef = classPowers.Healer.find(p => p.name === 'Lesser Heal');
                const maxTargets = powerDef?.targetCount || 1;

                const roll = Math.floor(Math.random() * 6) + 1;
                const totalHeal = roll + (studentData.level || 1);
                const healPerTarget = Math.ceil(totalHeal / maxTargets);

                const targetNames: string[] = [];
                for (const targetUid of activation.targets) {
                    const targetRef = doc(db, 'teachers', teacherUid!, 'students', targetUid);
                    const targetDoc = await getDoc(targetRef);
                    if (targetDoc.exists()) {
                        const targetData = targetDoc.data() as Student;
                        targetNames.push(targetData.characterName);
                        const newHp = Math.min(targetData.maxHp, targetData.hp + healPerTarget);
                        batch.update(targetRef, { hp: newHp });
                    }
                }
                const logDescription = `Healed ${targetNames.join(', ')} for up to ${healPerTarget} HP each.`;
                batch.update(liveBattleRef, {
                    powerEventMessage: `${activation.studentName} cast Lesser Heal! ${targetNames.length > 1 ? 'Allies' : 'An ally'} received healing!`
                });
                batch.set(doc(battleLogRef), {
                    round: liveState.currentQuestionIndex + 1,
                    casterName: activation.studentName,
                    powerName: activation.powerName,
                    description: logDescription,
                    timestamp: serverTimestamp()
                });

            } else if (activation.powerName === 'Focused Restoration') {
                if (!activation.targets || activation.targets.length !== 1) return;
                const targetUid = activation.targets[0];
                const targetRef = doc(db, 'teachers', teacherUid!, 'students', targetUid);
                const targetSnap = await getDoc(targetRef);

                if (targetSnap.exists()) {
                    const targetData = targetSnap.data() as Student;
                    const roll1 = Math.floor(Math.random() * 8) + 1;
                    const roll2 = Math.floor(Math.random() * 8) + 1;
                    const roll3 = Math.floor(Math.random() * 8) + 1;
                    const healAmount = roll1 + roll2 + roll3 + (studentData.level || 1);
                    const newHp = Math.min(targetData.maxHp, targetData.hp + healAmount);
                    batch.update(targetRef, { hp: newHp });

                    batch.update(liveBattleRef, {
                        powerEventMessage: `${activation.studentName} has cast Focused Restoration! ${targetData.characterName} has been greatly healed!`,
                        targetedEvent: {
                            targetUid: targetUid,
                            message: `You have been healed by ${studentData.characterName}. Your body and spirit have been renewed!`
                        }
                    });
                     batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: `Healed ${targetData.characterName} for ${healAmount} HP.`,
                        timestamp: serverTimestamp()
                    });
                }
            } else if (activation.powerName === 'Solar Empowerment') {
                if (!activation.targets || activation.targets.length === 0) return;

                const powerDef = classPowers.Healer.find(p => p.name === 'Solar Empowerment');
                const maxTargets = powerDef?.targetCount || 1;

                const roll1 = Math.floor(Math.random() * 6) + 1;
                const roll2 = Math.floor(Math.random() * 6) + 1;
                const totalBoost = roll1 + roll2 + (studentData.level || 1);

                const boostPerTarget = Math.ceil(totalBoost / maxTargets);

                const targetNames: string[] = [];
                for (const targetUid of activation.targets) {
                    const targetRef = doc(db, 'teachers', teacherUid!, 'students', targetUid);
                    batch.update(targetRef, {
                        hp: arrayUnion(boostPerTarget),
                        maxHp: arrayUnion(boostPerTarget)
                    });
                    const targetDoc = await getDoc(targetRef);
                    if(targetDoc.exists()) targetNames.push(targetDoc.data().characterName);
                }

                batch.update(liveBattleRef, {
                    empoweredMageUids: arrayUnion(...activation.targets),
                    powerEventMessage: `${activation.studentName} has cast Solar Empowerment! ${targetNames.length} Mages begin to shine with the light of the sun!`
                });
                batch.set(doc(battleLogRef), {
                    round: liveState.currentQuestionIndex + 1,
                    casterName: activation.studentName,
                    powerName: activation.powerName,
                    description: `Empowered ${targetNames.join(', ')}.`,
                    timestamp: serverTimestamp()
                });
            } else if (activation.powerName === 'Divine Judgment') {
                const individualCasts = battleData.divineJudgmentUses?.[activation.studentUid] || 0;
                const totalCasts = Object.values(battleData.divineJudgmentUses || {}).reduce((a, b) => a + b, 0);

                if (individualCasts >= 1) {
                    batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: "You have already called upon the divine this battle." } });
                } else if (totalCasts >= 3) {
                     batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: "The Divine Realm will no longer answer for the rest of this battle!" } });
                } else if (battleData.status === 'ROUND_ENDING') {
                     batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: "It is too late to cast this power! The round is ending!" } });
                } else {
                    const activePlayersCount = allStudents.filter(s => s.inBattle && s.hp > 0).length;
                    const voteEndsAt = new Date(Date.now() + 15000);

                    batch.update(liveBattleRef, {
                        [`divineJudgmentUses.${activation.studentUid}`]: increment(1),
                        voteState: {
                            isActive: true,
                            casterName: activation.studentName,
                            votesFor: [],
                            votesAgainst: [],
                            endsAt: voteEndsAt,
                            totalVoters: activePlayersCount,
                        },
                        powerEventMessage: `${activation.studentName} calls for a Divine Judgment! The party must vote!`
                    });
                }
            } else if (activation.powerName === 'Regeneration Field') {
                const healAmount = Math.ceil((studentData.level || 1) * 0.25);
                const targetsToHeal = allStudents.filter(s => s.hp > 0 && s.hp < s.maxHp);

                for (const target of targetsToHeal) {
                    const targetRef = doc(db, 'teachers', teacherUid!, 'students', target.uid);
                    const newHp = Math.min(target.maxHp, target.hp + healAmount);
                    batch.update(targetRef, { hp: newHp });
                }

                batch.update(liveBattleRef, {
                    powerEventMessage: `${activation.studentName} casts Regeneration Field, bathing the party in healing light!`
                });
                 batch.set(doc(battleLogRef), {
                    round: liveState.currentQuestionIndex + 1,
                    casterName: activation.studentName,
                    powerName: activation.powerName,
                    description: `Healed all allies for up to ${healAmount} HP.`,
                    timestamp: serverTimestamp()
                });
            } else if (activation.powerName === 'Psionic Aura') {
                 if (!activation.targets || activation.targets.length === 0) return;

                const powerDef = classPowers.Mage.find(p => p.name === 'Psionic Aura');
                const maxTargets = powerDef?.targetCount || 1;

                const roll = Math.floor(Math.random() * 6) + 1;
                const totalRestore = roll + (studentData.level || 1);
                const restorePerTarget = Math.ceil(totalRestore / maxTargets);

                const targetNames = [];
                for (const targetUid of activation.targets) {
                    const targetRef = doc(db, 'teachers', teacherUid!, 'students', targetUid);
                    const targetDoc = await getDoc(targetRef);
                    if (targetDoc.exists()) {
                        const targetData = targetDoc.data() as Student;
                        targetNames.push(targetData.characterName);
                        const newMp = Math.min(targetData.maxMp, targetData.mp + restorePerTarget);
                        batch.update(targetRef, { mp: newMp });
                        batch.update(liveBattleRef, {
                            targetedEvent: {
                                targetUid: targetUid,
                                message: `${studentData.characterName} has renewed your arcane energies!`
                            }
                        });
                    }
                }

                const logDescription = `Restored MP to ${targetNames.join(', ')}.`;
                batch.update(liveBattleRef, {
                    powerEventMessage: `${activation.studentName} casts Psionic Aura!`
                });
                batch.set(doc(battleLogRef), {
                    round: liveState.currentQuestionIndex + 1,
                    casterName: activation.studentName,
                    powerName: activation.powerName,
                    description: logDescription,
                    timestamp: serverTimestamp()
                });
            } else if (activation.powerName === 'Sorcerer’s Intuition') {
                const uses = battleData.sorcerersIntuitionUses?.[activation.studentUid] || 0;
                if (uses >= 3) {
                     batch.update(liveBattleRef, {
                        targetedEvent: {
                            targetUid: activation.studentUid,
                            message: `The Psychic winds will no longer answer your call.`
                        }
                    });
                } else {
                     batch.update(liveBattleRef, {
                        [`sorcerersIntuitionUses.${activation.studentUid}`]: increment(1),
                        powerEventMessage: `${activation.studentName} used Sorcerer's Intuition!`,
                         targetedEvent: {
                            targetUid: activation.studentUid,
                            message: `You cast Sorcerer’s Intuition! Your strike will partially land even if you get the wrong answer!`
                        }
                    });
                     batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: `Guaranteed base damage.`,
                        timestamp: serverTimestamp()
                    });
                }
            } else if (activation.powerName === 'Psychic Flare') {
                if (!activation.targets || activation.targets.length !== 1) return;
                const targetUid = activation.targets[0];
                const targetRef = doc(db, 'teachers', teacherUid!, 'students', targetUid);
                const targetSnap = await getDoc(targetRef);

                if (targetSnap.exists()) {
                    const targetData = targetSnap.data() as Student;

                    // Final eligibility check before execution
                    if (targetData.mp >= targetData.maxMp * 0.5) {
                        batch.update(liveBattleRef, {
                            targetedEvent: {
                                targetUid: activation.studentUid,
                                message: `Your spell fizzled! ${targetData.characterName}'s magic was already potent enough. Your power was not consumed.`
                            }
                        });
                        await batch.commit(); // Commit just the targeted event
                        
                        // Immediately clean up the handled activation without consuming resources
                        const activationDocRef = doc(db, `${liveBattleRef.path}/powerActivations`, activation.id!);
                        await deleteDoc(activationDocRef); 
                        
                        setTimeout(async () => { await updateDoc(liveBattleRef, { targetedEvent: null }); }, 5000);
                        return; // Stop further execution for this power
                    }

                    batch.update(targetRef, { mp: targetData.maxMp });
                    batch.update(liveBattleRef, {
                        powerEventMessage: `${activation.studentName} casts Psychic Flare, restoring ${targetData.characterName}'s magic!`,
                        targetedEvent: {
                            targetUid: targetUid,
                            message: `${activation.studentName} has restored your magic points to their maximum value!`
                        }
                    });
                    batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: `Restored ${targetData.characterName} to full MP.`,
                        timestamp: serverTimestamp()
                    });
                }
            } else if (activation.powerName === 'Elemental Fusion') {
                const personalCasts = battleData.elementalFusionCasts?.[activation.studentUid] || 0;
                const globalCasts = battleData.globalElementalFusionCasts || 0;

                if (personalCasts >= 2) {
                     batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: "You have exhausted your connection to the elements. Choose a different power." } });
                } else if (globalCasts >= 6) {
                     batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: "The Elemental energies of the area have been drained! Choose a different power!" } });
                } else {
                    batch.update(liveBattleRef, {
                        [`elementalFusionCasts.${activation.studentUid}`]: increment(1),
                        globalElementalFusionCasts: increment(1),
                        powerEventMessage: `${activation.studentName} has cast Elemental Fusion! Your party's attacks FLARE with Primordial Knowledge!`,
                        targetedEvent: {
                            targetUid: activation.studentUid,
                            message: "You have cast Elemental Fusion! The attacks of your allies FLARE with Primordial Knowledge!"
                        }
                    });
                    batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: `Tripled the party's base damage for the round.`,
                        timestamp: serverTimestamp()
                    });
                }
            } else if (activation.powerName === 'Inspiring Strike') {
                const casts = battleData.inspiringStrikeCasts?.[activation.studentUid] || 0;
                if (casts >= 2) {
                     batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: "Your voice is hoarse! You cannot inspire again this battle." } });
                } else {
                    batch.update(liveBattleRef, {
                        [`inspiringStrikeCasts.${activation.studentUid}`]: increment(1),
                        powerEventMessage: `${activation.studentName} bellows an inspiring war cry! The party's attacks are strengthened threefold!`,
                        targetedEvent: {
                            targetUid: activation.studentUid,
                            message: "Your inspiring shout fills your allies with courage, tripling the power of their attacks!"
                        }
                    });
                    batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: `Tripled the party's base damage for the round.`,
                        timestamp: serverTimestamp()
                    });
                }
            } else if (activation.powerName === 'Arcane Shield') {
                if (!activation.targets || activation.targets.length === 0) return;
                 const targetNames: string[] = [];
                 for (const targetUid of activation.targets) {
                    const targetData = allStudents.find(s => s.uid === targetUid);
                    if (targetData) {
                       targetNames.push(targetData.characterName);
                       batch.update(liveBattleRef, {
                           [`shielded.${targetUid}`]: { roundsRemaining: 3, casterName: activation.studentName }
                       });
                    }
                 }
                 batch.update(liveBattleRef, {
                    powerEventMessage: `${activation.studentName} casts Arcane Shield on ${targetNames.join(', ')}!`,
                 });
                 batch.set(doc(battleLogRef), {
                    round: liveState.currentQuestionIndex + 1,
                    casterName: activation.studentName,
                    powerName: activation.powerName,
                    description: `Shielded ${targetNames.join(', ')} for 3 rounds.`,
                    timestamp: serverTimestamp()
                });
            } else if (activation.powerName === 'Guard') {
                if (!activation.targets || activation.targets.length === 0) return;
                 const targetNames: string[] = [];
                 for (const targetUid of activation.targets) {
                    const targetRef = doc(db, 'teachers', teacherUid!, 'students', targetUid);
                    const targetDoc = await getDoc(targetRef);
                    if (targetDoc.exists()) {
                        targetNames.push(targetDoc.data().characterName);
                        batch.update(targetRef, { guardedBy: activation.studentUid });
                    }
                 }
                 batch.update(liveBattleRef, {
                    powerEventMessage: `${activation.studentName} casts Guard, protecting ${targetNames.join(', ')}!`,
                 });
                 batch.set(doc(battleLogRef), {
                    round: liveState.currentQuestionIndex + 1,
                    casterName: activation.studentName,
                    powerName: activation.powerName,
                    description: `Protected ${targetNames.join(', ')}.`,
                    timestamp: serverTimestamp()
                });
            } else if (activation.powerName === 'Intercept') {
                const eligibleTargets = allStudents.filter(s => s.inBattle && s.uid !== activation.studentUid && !s.guardedBy && (!s.shielded || s.shielded.roundsRemaining <= 0));
                
                if (eligibleTargets.length > 0) {
                    const target = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
                    batch.update(liveBattleRef, {
                        [`intercepting.${activation.studentUid}`]: target.uid,
                        powerEventMessage: `${activation.studentName} is intercepting the attack on ${target.characterName}!`,
                        targetedEvent: { targetUid: target.uid, message: `${activation.studentName} is assisting you in your attack!` },
                    });
                     batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: `Intercepted for ${target.characterName}.`,
                        timestamp: serverTimestamp()
                    });
                } else {
                    batch.update(liveBattleRef, {
                        powerEventMessage: `${activation.studentName} finds no allies to protect and channels additional power into their strike!`,
                        targetedEvent: { targetUid: activation.studentUid, message: "There are no allies to protect, so you channel additional power into your strike!" },
                    });
                }
            } else if (activation.powerName === 'Zen Shield') {
                const casts = battleData.zenShieldCasts?.[activation.studentUid] || 0;
                if (casts >= 1) {
                    batch.update(liveBattleRef, { targetedEvent: { targetUid: activation.studentUid, message: "You have already achieved Zen this battle. The power cannot be used again." } });
                } else {
                    const activePlayers = allStudents.filter(s => s.hp > 0);
                    const updates: { [key: string]: any } = {
                        [`zenShieldCasts.${activation.studentUid}`]: increment(1),
                        powerEventMessage: `${activation.studentName} achieves perfect focus, creating a Zen Shield around the entire party!`,
                        targetedEvent: { targetUid: activation.studentUid, message: "You create a shield of pure focus around your allies, protecting them from harm." }
                    };
                    activePlayers.forEach(player => {
                        updates[`shielded.${player.uid}`] = { roundsRemaining: 1, casterName: activation.studentName };
                    });
                    batch.update(liveBattleRef, updates);
                    batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: `Shielded all active party members for 1 round.`,
                        timestamp: serverTimestamp()
                    });
                }
            }


            if (activation.powerName !== 'Sorcerer’s Intuition' || (battleData.sorcerersIntuitionUses?.[activation.studentUid] || 0) < 3) {
                batch.update(studentRef, { mp: increment(-activation.powerMpCost) });
                batch.update(liveBattleRef, {
                    [`powerUsersThisRound.${activation.studentUid}`]: arrayUnion(activation.powerName),
                });
            }

            await batch.commit();

            setTimeout(async () => {
                 await updateDoc(liveBattleRef, { powerEventMessage: '' });
            }, 5000);

            const activationDocRef = doc(db, `${liveBattleRef.path}/powerActivations`, activation.id!);
            await deleteDoc(activationDocRef);
        };

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const activation = { id: change.doc.id, ...change.doc.data() } as PowerActivation;
                    await handlePowerActivation(activation);
                }
            });
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveState?.status, liveState?.currentQuestionIndex, battle, teacherUid, allStudents]);


  // Effect to handle timer expiration
  useEffect(() => {
      if (liveState?.status !== 'ROUND_ENDING' || !liveState.timerEndsAt) return;

      const expiryDate = new Date(liveState.timerEndsAt.seconds * 1000);
      const now = new Date();
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();

      const timer = setTimeout(() => {
          calculateAndSetResults({});
      }, timeUntilExpiry > 0 ? timeUntilExpiry : 0);

      return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveState?.status, liveState?.timerEndsAt]);


  // Effect to handle safe redirection after battle ends
  useEffect(() => {
    if (redirectId) {
        router.push(`/teacher/battle/summary/${redirectId}`);
    }
  }, [redirectId, router]);


  const handleStartFirstQuestion = async () => {
    if(!teacherUid || !battle) return;

    const initiallyFallenUids = allStudents
        .filter(s => s.inBattle && s.hp <= 0)
        .map(s => s.uid);

    const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
    await updateDoc(liveBattleRef, {
        status: 'IN_PROGRESS',
        currentQuestionIndex: 0,
        totalDamage: 0,
        totalBaseDamage: 0,
        totalPowerDamage: 0,
        fallenPlayerUids: initiallyFallenUids,
        empoweredMageUids: [],
        divineJudgmentUses: {},
        sorcerersIntuitionUses: {},
        elementalFusionCasts: {},
        globalElementalFusionCasts: 0,
        inspiringStrikeCasts: {},
        voteState: null,
        shielded: {},
        damageShields: {},
        chaosStormCasts: {},
        intercepting: {},
        zenShieldCasts: {},
        immuneToRevival: [],
        martialSacrificeCasterUid: null,
        arcaneSacrificeCasterUid: null,
        divineSacrificeCasterUid: null,
    });
    await logGameEvent(teacherUid, 'BOSS_BATTLE', `Round 1 of '${battle.battleName}' has started.`);
  };

  const handleEndRound = async () => {
    if (!battle || liveState === null || isEndingRound || !teacherUid) return;

    setIsEndingRound(true);

    try {
        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const timerEndsAt = new Date(Date.now() + 10000);
        await updateDoc(liveBattleRef, {
            status: 'ROUND_ENDING',
            timerEndsAt: timerEndsAt,
        });
    } catch (error) {
        console.error("Error starting round end timer:", error);
    } finally {
        setIsEndingRound(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!battle || liveState === null || !teacherUid || liveState.currentQuestionIndex >= battle.questions.length - 1) return;

    setIsAdvancing(true);

    setRoundResults([]);
    try {
        const batch = writeBatch(db);

        // Reset guardedBy status for all students
        const studentCollectionRef = collection(db, 'teachers', teacherUid, 'students');
        const studentsSnapshot = await getDocs(studentCollectionRef);
        studentsSnapshot.forEach(studentDoc => {
            if (studentDoc.data().guardedBy) {
                batch.update(studentDoc.ref, { guardedBy: null });
            }
        });
        
        const prevRoundDocRef = doc(db, 'teachers', teacherUid, `liveBattles/active-battle/responses/${liveState.currentQuestionIndex}`);
        batch.delete(prevRoundDocRef);

        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const nextQuestionIndex = liveState.currentQuestionIndex + 1;
        batch.update(liveBattleRef, {
            status: 'IN_PROGRESS',
            currentQuestionIndex: nextQuestionIndex,
            timerEndsAt: null,
            lastRoundDamage: 0,
            lastRoundBaseDamage: 0,
            lastRoundPowerDamage: 0,
            lastRoundPowersUsed: [],
            removedAnswerIndices: [],
            powerEventMessage: '',
            targetedEvent: null,
            powerUsersThisRound: {},
            queuedPowers: [],
            roundEvents: [],
            intercepting: {},
            damageShields: {},
        });

        await batch.commit();

        await logGameEvent(teacherUid, 'BOSS_BATTLE', `Round ${nextQuestionIndex + 1} of '${battle.battleName}' has started.`);
    } catch (error) {
        console.error("Error advancing to next question:", error);
    } finally {
        setIsAdvancing(false);
    }
  };

  const handleExport = () => {
    if (!battle || roundResults.length === 0 || !liveState) return;
    const questionText = battle.questions[liveState.currentQuestionIndex].questionText;
    const headers = ['Student Name', 'Answer', 'Correct'];
    const data = roundResults.map(r => [r.studentName, r.answer, r.isCorrect ? 'Yes' : 'No']);
    downloadCsv(data, headers, `battle_results_q${liveState.currentQuestionIndex + 1}.csv`);
  };

  const handleClearChat = async () => {
    if (!teacherUid || !battleId) return;

    const messagesRef = collection(db, 'teachers', teacherUid, `liveBattles/active-battle/messages`);
    try {
        const querySnapshot = await getDocs(messagesRef);
        if (querySnapshot.empty) {
            toast({ title: "Chat is already empty." });
            return;
        }
        const batch = writeBatch(db);
        querySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        toast({ title: "Chat Cleared", description: "All messages have been removed from the war council." });
    } catch (error) {
        console.error("Error clearing chat:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not clear the chat." });
    }
  };

  if (isLoading || !battle || !liveState || !user || !teacherData) {
    return (
        <>
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    <Skeleton className="w-1/3 h-10" />
                    <Skeleton className="w-full h-64" />
                    <Skeleton className="w-full h-32" />
                </div>
            </main>
        </>
    );
  }

  const isWaitingToStart = liveState.status === 'WAITING';
  const isRoundInProgress = liveState.status === 'IN_PROGRESS' || liveState.status === 'ROUND_ENDING';
  const isRoundEndingStatus = liveState.status === 'ROUND_ENDING';
  const areResultsShowing = liveState.status === 'SHOWING_RESULTS';
  const isLastQuestion = liveState.currentQuestionIndex >= battle.questions.length - 1;
  const expiryTimestamp = liveState.timerEndsAt ? new Date(liveState.timerEndsAt.seconds * 1000) : null;
  const videoSrc = battle.videoUrl ? getYouTubeEmbedUrl(battle.videoUrl) : '';


  return (
    <div
        className="relative flex min-h-screen w-full flex-col"
    >
        <audio ref={audioRef} loop />
        <div
            className="absolute inset-0 -z-10 bg-black/50"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-0228de24-54d4-47df-9ff6-6184afb3ad3d.jpg?alt=media&token=a005d161-a938-4096-8b7f-fec4388c36a8')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        />
         <div className="absolute inset-0 -z-10 bg-black/60" />
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <div className="lg:col-span-2 space-y-6">
                <Card className="bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-3xl">{battle.battleName}</CardTitle>
                        <CardDescription>Live Battle Control Panel</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <p>Status: <span className="font-bold text-primary">{liveState.status.replace('_', ' ')}</span></p>
                            <p>Current Question: <span className="font-bold">{liveState.currentQuestionIndex + 1} / {battle.questions.length}</span></p>
                            <p>Total Damage Dealt So Far: <span className="font-bold text-red-500">{liveState.totalDamage || 0}</span></p>
                        </div>

                        {isWaitingToStart && videoSrc && (
                            <div className="p-4 border rounded-lg space-y-2">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Video className="w-5 h-5"/> Intro Video Preview</h3>
                                <div className="w-full aspect-video">
                                    <iframe
                                        className="w-full h-full rounded-lg shadow-lg border"
                                        src={videoSrc}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            </div>
                        )}

                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg mb-2">Controls</h3>
                            <div className="flex flex-wrap gap-4">
                                {isWaitingToStart && (
                                    <Button onClick={handleStartFirstQuestion} size="lg">Start First Question</Button>
                                )}
                                <Button onClick={handleEndRound} disabled={!isRoundInProgress || isRoundEndingStatus}>
                                    {isEndingRound ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    End Round
                                </Button>
                                <Button onClick={handleNextQuestion} disabled={!areResultsShowing || isLastQuestion || isAdvancing}>
                                    {isAdvancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Next Question
                                </Button>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Clear Chat
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Clear the Chat Log?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        This will permanently delete all messages from the chat for this battle session. This cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearChat}>Yes, Clear Chat</AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button variant="destructive" onClick={handleEndBattleAndAggregate} disabled={isEndingBattle || isAdvancing || isEndingRound}>
                                    {isEndingBattle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    End Battle
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {isWaitingToStart && (
                    <Card className="bg-card/60 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Waiting for Students</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Students can now join the pre-battle waiting room by clicking "Ready for Battle" on their dashboards. When you are ready, click "Start First Question" to begin.</p>
                        </CardContent>
                    </Card>
                )}

                 <Card className="bg-card/60 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Round Results</CardTitle>
                            <CardDescription>Live view of student answers for the current round.</CardDescription>
                        </div>
                         <Button onClick={handleExport} variant="outline" size="sm" disabled={roundResults.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Export to CSV
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isRoundEndingStatus && expiryTimestamp && <CountdownTimer expiryTimestamp={expiryTimestamp} />}
                        <RoundResults results={roundResults} />
                         {(areResultsShowing && liveState.lastRoundDamage !== undefined) && (
                            <div className="mt-4 p-4 rounded-md bg-sky-900/70 border border-sky-700 text-sky-200 flex flex-col gap-4">
                                <div className="flex items-center justify-center gap-4 text-center">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold uppercase text-sky-300">Base Damage</p>
                                        <p className="text-2xl font-bold">{liveState.lastRoundBaseDamage || 0}</p>
                                    </div>
                                    <div className="text-2xl font-bold">+</div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold uppercase text-sky-300">Power Damage</p>
                                        <p className="text-2xl font-bold">{liveState.lastRoundPowerDamage || 0}</p>
                                    </div>
                                    <div className="text-2xl font-bold">=</div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold uppercase text-sky-300">Total Damage</p>
                                        <p className="text-3xl font-extrabold text-white">{liveState.lastRoundDamage || 0}</p>
                                    </div>
                                </div>
                                {(liveState.lastRoundPowersUsed && liveState.lastRoundPowersUsed.length > 0) && (
                                     <div className="border-t border-sky-600 pt-2 mt-2">
                                        <h4 className="font-semibold text-center text-sky-200">Powers Used This Round:</h4>
                                        <ul className="text-center text-sm text-sky-100">
                                            {liveState.lastRoundPowersUsed.map((power, index) => <li key={index}>{power}</li>)}
                                        </ul>
                                     </div>
                                )}
                            </div>
                         )}
                    </CardContent>
                </Card>
            </div>
             <div className="lg:col-span-1 space-y-6">
                <BattleDisplay students={activeParticipants} />
                {liveState.battleId && <BattleLog teacherUid={teacherUid} />}
                <BattleChatBox
                    isTeacher={true}
                    userName={"The Wise One"}
                    teacherUid={teacherUid || ''}
                    battleId={'active-battle'}
                />
            </div>
        </div>
      </main>
      {battle.musicUrl && <VolumeControl audioRef={audioRef} />}
    </div>
  );
}
