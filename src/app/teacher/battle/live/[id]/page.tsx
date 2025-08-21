
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, collection, query, updateDoc, getDocs, writeBatch, serverTimestamp, setDoc, deleteDoc, increment, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Download, Timer, HeartCrack, Video, ShieldCheck, Sparkles, Skull, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RoundResults, type Result } from '@/components/teacher/round-results';
import { downloadCsv } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { calculateLevel, calculateHpGain, calculateMpGain, calculateBaseMaxHp } from '@/lib/game-mechanics';
import type { Student } from '@/lib/data';
import { logGameEvent } from '@/lib/gamelog';
import { BattleChatBox } from '@/components/battle/chat-box';
import { useToast } from '@/hooks/use-toast';
import { classPowers } from '@/lib/powers';


interface QueuedPower {
    casterUid: string;
    powerName: 'Wildfire';
    damage: number;
}

interface TargetedEvent {
    targetUid: string;
    message: string;
}

interface VoteState {
    isActive: boolean;
    casterName: string;
    votesFor: string[];
    votesAgainst: string[];
    endsAt: { seconds: number; nanoseconds: number; };
    totalVoters: number;
}

interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'ROUND_ENDING' | 'SHOWING_RESULTS' | 'BATTLE_ENDED';
  currentQuestionIndex: number;
  timerEndsAt?: { seconds: number; nanoseconds: number; };
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
  powerUsersThisRound?: { [key: string]: string[] }; // { studentUid: [powerName, ...] }
  queuedPowers?: QueuedPower[];
  fallenPlayerUids?: string[];
  empoweredMageUids?: string[]; // For Solar Empowerment
  cosmicDivinationUses?: number; // For Cosmic Divination
  voteState?: VoteState | null; // For Cosmic Divination
}

interface PowerActivation {
    id?: string;
    studentUid: string;
    studentName: string;
    powerName: string;
    powerMpCost: number;
    targets: string[];
    timestamp: any;
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
}

interface StudentResponse {
    studentUid: string;
    studentName: string;
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


export default function TeacherLiveBattlePage() {
  const params = useParams();
  const router = useRouter();
  const battleId = params.id as string;
  const { toast } = useToast();

  const [battle, setBattle] = useState<Battle | null>(null);
  const [liveState, setLiveState] = useState<LiveBattleState | null>(null);
  const [roundResults, setRoundResults] = useState<Result[]>([]);
  const [allRoundsData, setAllRoundsData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEndingRound, setIsEndingRound] = useState(isEndingRound);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [fallenStudentNames, setFallenStudentNames] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [powerLog, setPowerLog] = useState<PowerLogEntry[]>([]);


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
    const unsubscribe = onSnapshot(liveBattleRef, (doc) => {
      if (doc.exists()) {
        const newState = doc.data() as LiveBattleState;
        setLiveState(newState);

        if (newState.status === 'BATTLE_ENDED') {
            router.push(`/teacher/battle/summary/${battleId}`);
        }
      } else {
        // If the document doesn't exist, it could mean the battle has ended and been cleaned up.
        // Or it hasn't started. The redirect logic in `handleEndBattle` should handle this.
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening for live battle state:", error);
      setIsLoading(false);
    });
    
    // Also listen to the power log for the summary page
    const logRef = collection(liveBattleRef, 'battleLog');
    const q = query(logRef);
    const unsubLog = onSnapshot(q, (snapshot) => {
      const entries: PowerLogEntry[] = [];
      snapshot.forEach(doc => {
        entries.push(doc.data() as PowerLogEntry)
      });
      setPowerLog(entries);
    });


    return () => {
      unsubscribe();
      unsubLog();
    };
  }, [battleId, router, teacherUid]);
  
  // Real-time listener for current round responses
  useEffect(() => {
      if (!teacherUid || !liveState || liveState.status !== 'IN_PROGRESS' && liveState.status !== 'ROUND_ENDING' && liveState.status !== 'SHOWING_RESULTS') {
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
  }, [teacherUid, liveState, liveState?.currentQuestionIndex, liveState?.status]);


    const calculateAndSetResults = useCallback(async (isDivinationSkip: boolean = false) => {
        if (!liveState || !battle || !teacherUid || !allStudents.length) return;

        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const batch = writeBatch(db);

        const roundDocRef = doc(db, 'teachers', teacherUid, `liveBattles/active-battle/responses/${liveState.currentQuestionIndex}`);
        const roundDocSnap = await getDoc(roundDocRef);
        
        const submittedResponses: StudentResponse[] = roundDocSnap.exists() ? roundDocSnap.data().responses || [] : [];
        const studentMap = new Map(allStudents.map(doc => [doc.uid, doc]));
        
        const results: Result[] = [];
        const newlyFallenUids: string[] = [];

        // Determine which students were online and not fallen *at the start of the question* to check for damage
        const activeStudentsUids = allStudents
            .filter(s => s.onlineStatus?.status === 'online' && !liveState.fallenPlayerUids?.includes(s.uid))
            .map(s => s.uid);

        for (const uid of activeStudentsUids) {
            const student = studentMap.get(uid);
            if (!student) continue;

            const response = submittedResponses.find(r => r.studentUid === student.uid);
            const isCorrect = response?.isCorrect ?? false;
            
            results.push({
                studentUid: student.uid,
                studentName: student.characterName,
                answer: response?.answer ?? "No Answer",
                isCorrect: isCorrect,
                powerUsed: liveState.powerUsersThisRound?.[student.uid]?.join(', ') || undefined,
            });

            if (!isCorrect && !isDivinationSkip) {
                const currentQuestion = battle.questions[liveState.currentQuestionIndex];
                const damageOnIncorrect = currentQuestion.damage || 0;

                if (damageOnIncorrect > 0) {
                    const studentRef = doc(db, 'teachers', teacherUid, 'students', student.uid);
                    const newHp = Math.max(0, student.hp - damageOnIncorrect);
                    batch.update(studentRef, { hp: newHp });
                    if (newHp === 0) {
                        newlyFallenUids.push(student.uid);
                    }
                }
            }
        }
        
        setRoundResults(results);

        let powerDamage = isDivinationSkip ? (liveState.lastRoundPowerDamage || 0) : 0;
        const powersUsedThisRound: string[] = isDivinationSkip ? (liveState.lastRoundPowersUsed || []) : [];
        const battleLogRef = collection(db, 'teachers', teacherUid!, 'liveBattles/active-battle/battleLog');

        if (!isDivinationSkip) {
            for (const power of liveState.queuedPowers || []) {
                const casterResponse = results.find(res => res.studentUid === power.casterUid);

                if (casterResponse?.isCorrect) {
                    powerDamage += power.damage;
                    powersUsedThisRound.push(`${power.powerName} (${power.damage} dmg)`);
                    batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: casterResponse.studentName,
                        powerName: power.powerName,
                        description: `Dealt ${power.damage} damage.`,
                        timestamp: serverTimestamp()
                    });
                } else {
                     batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: casterResponse?.studentName || studentMap.get(power.casterUid)?.characterName || 'Unknown Mage',
                        powerName: power.powerName,
                        description: 'Fizzled due to incorrect answer.',
                        timestamp: serverTimestamp()
                    });
                }
            }
        }

        const baseDamage = isDivinationSkip ? 0 : results.filter(r => r.isCorrect).length;
        const totalDamageThisRound = baseDamage + powerDamage;

        const updatePayload: any = { 
            status: 'SHOWING_RESULTS', 
            timerEndsAt: null,
            lastRoundDamage: totalDamageThisRound,
            lastRoundBaseDamage: baseDamage,
            lastRoundPowerDamage: powerDamage,
            lastRoundPowersUsed: powersUsedThisRound,
            totalDamage: increment(totalDamageThisRound),
            totalBaseDamage: increment(baseDamage),
            totalPowerDamage: increment(powerDamage),
            voteState: null,
        };
        
        if (newlyFallenUids.length > 0) {
            updatePayload.fallenPlayerUids = arrayUnion(...newlyFallenUids);
        }

        batch.update(liveBattleRef, updatePayload);
        
        const currentQuestion = battle.questions[liveState.currentQuestionIndex];
        // Set state for the final summary data
        setAllRoundsData(prev => ({
            ...prev,
            [liveState.currentQuestionIndex]: {
                questionText: currentQuestion.questionText,
                responses: submittedResponses.map(r => ({
                    studentUid: r.studentUid,
                    studentName: r.characterName,
                    answerIndex: r.answerIndex,
                    isCorrect: r.isCorrect,
                })),
                powersUsed: powersUsedThisRound,
            }
        }));

        await batch.commit();

    }, [battle, liveState, teacherUid, allStudents]);

    const performRoundEnd = useCallback(async () => {
        if (!battle || !liveState || !teacherUid || isEndingRound) return;
        setIsEndingRound(true);
        await calculateAndSetResults();
        setIsEndingRound(false);
    }, [battle, liveState, teacherUid, isEndingRound, calculateAndSetResults]);
  
    // Effect for Cosmic Divination vote resolution
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

            const votePassed = currentVoteState.votesFor.length > (currentVoteState.totalVoters / 2);

            if (votePassed) {
                await calculateAndSetResults(true); // End the round immediately, keeping the power damage
            } else {
                // Vote failed, clear the vote state and show message
                await updateDoc(liveBattleRef, { 
                    voteState: null,
                    powerEventMessage: "The party is divided! The attempt to skip time fails." 
                });
                setTimeout(() => updateDoc(liveBattleRef, { powerEventMessage: '' }), 5000);
            }

        }, timeUntilExpiry > 0 ? timeUntilExpiry : 0);

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveState?.voteState, teacherUid, calculateAndSetResults]);

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
             if ((battleData.powerUsersThisRound?.[activation.studentUid] || []).length > 0) return; // Prevent multiple powers per round

            const batch = writeBatch(db);

            if (activation.powerName === 'Nature’s Guidance') {
                const currentQuestion = battle!.questions[battleData!.currentQuestionIndex];
                
                const incorrectAnswerIndices = currentQuestion.answers
                    .map((_, i) => i)
                    .filter(i => i !== currentQuestion.correctAnswerIndex);
                    
                const removableIndices = incorrectAnswerIndices.filter(i => !(battleData!.removedAnswerIndices || []).includes(i));
                
                if (removableIndices.length > 0) {
                    const indexToRemove = removableIndices[Math.floor(Math.random() * removableIndices.length)];

                    batch.update(liveBattleRef, {
                        removedAnswerIndices: arrayUnion(indexToRemove),
                        powerEventMessage: `${activation.studentName} used Nature's Guidance!`
                    });
                     batch.set(doc(battleLogRef), {
                        round: liveState.currentQuestionIndex + 1,
                        casterName: activation.studentName,
                        powerName: activation.powerName,
                        description: 'Removed one incorrect answer.',
                        timestamp: serverTimestamp()
                    });
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
            } else if (activation.powerName === 'Enduring Spirit') {
                if (!activation.targets || activation.targets.length === 0) return;
                const targetUid = activation.targets[0];
                const targetRef = doc(db, 'teachers', teacherUid!, 'students', targetUid);
                const targetSnap = await getDoc(targetRef);

                if (targetSnap.exists() && targetSnap.data().hp <= 0) {
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
                } else if (targetSnap.exists() && targetSnap.data().hp > 0) {
                     // Target is not fallen, send feedback to caster
                    const targetedEvent: TargetedEvent = { targetUid: activation.studentUid, message: `${targetSnap.data().characterName} has already been restored! Choose another power.` };
                    await updateDoc(liveBattleRef, { targetedEvent: targetedEvent });
                    setTimeout(() => updateDoc(liveBattleRef, { targetedEvent: null }), 5000);
                    return; // Stop processing this power
                }
            } else if (activation.powerName === 'Lesser Heal') {
                if (!activation.targets || activation.targets.length === 0) return;

                const powerDef = classPowers.Healer.find(p => p.name === 'Lesser Heal');
                const maxTargets = powerDef?.targetCount || 1;

                const roll = Math.floor(Math.random() * 6) + 1;
                const totalHeal = roll + (studentData.level || 1);
                const healPerTarget = Math.ceil(totalHeal / maxTargets); // Strict power division
                
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
                
                const boostPerTarget = Math.ceil(totalBoost / maxTargets); // Strict power division

                const targetNames: string[] = [];
                for (const targetUid of activation.targets) {
                    const targetRef = doc(db, 'teachers', teacherUid!, 'students', targetUid);
                    batch.update(targetRef, { 
                        hp: increment(boostPerTarget),
                        maxHp: increment(boostPerTarget)
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
            } else if (activation.powerName === 'Cosmic Divination') {
                 if (battleData.status === 'ROUND_ENDING') return;
                 if ((battleData.cosmicDivinationUses || 0) >= 2) {
                     const targetedEvent: TargetedEvent = { targetUid: activation.studentUid, message: "Due to time sickness, you may not use this power again!" };
                     await updateDoc(liveBattleRef, { targetedEvent: targetedEvent });
                     setTimeout(() => updateDoc(liveBattleRef, { targetedEvent: null }), 5000);
                     return;
                 }
                
                const activePlayersCount = allStudents.filter(s => s.hp > 0).length;

                const voteEndsAt = new Date(Date.now() + 10000);

                batch.update(liveBattleRef, {
                    cosmicDivinationUses: increment(1),
                    totalPowerDamage: increment(studentData.level),
                    lastRoundPowerDamage: increment(studentData.level),
                    lastRoundPowersUsed: arrayUnion(`Cosmic Divination (${studentData.level} dmg)`),
                    voteState: {
                        isActive: true,
                        casterName: activation.studentName,
                        votesFor: [activation.studentUid], // Caster auto-votes yes
                        votesAgainst: [],
                        endsAt: voteEndsAt,
                        totalVoters: activePlayersCount,
                    }
                });
                batch.set(doc(battleLogRef), {
                    round: liveState.currentQuestionIndex + 1,
                    casterName: activation.studentName,
                    powerName: activation.powerName,
                    description: `Dealt ${studentData.level} damage and initiated a vote.`,
                    timestamp: serverTimestamp()
                });
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
                const restorePerTarget = Math.ceil(totalRestore / maxTargets); // Strict power division
                
                const targetNames = [];
                for (const targetUid of activation.targets) {
                    const targetRef = doc(db, 'teachers', teacherUid!, 'students', targetUid);
                    const targetDoc = await getDoc(targetRef);
                    if (targetDoc.exists()) {
                        const targetData = targetDoc.data() as Student;
                        targetNames.push(targetData.characterName);
                        const newMp = Math.min(targetData.maxMp, targetData.mp + restorePerTarget);
                        batch.update(targetRef, { mp: newMp });
                        // Send targeted message
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
            }

            batch.update(studentRef, { mp: increment(-activation.powerMpCost) });
            batch.update(liveBattleRef, {
                [`powerUsersThisRound.${activation.studentUid}`]: arrayUnion(activation.powerName),
            });
            await batch.commit();

            // Clear the public message after a delay
            setTimeout(async () => {
                 await updateDoc(liveBattleRef, { powerEventMessage: '' });
            }, 5000);
            
            // Delete the activation document after processing
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
          performRoundEnd();
      }, timeUntilExpiry > 0 ? timeUntilExpiry : 0);
      
      return () => clearTimeout(timer);
  }, [liveState?.status, liveState?.timerEndsAt, performRoundEnd]);

  // Effect to resolve fallen UIDs to names
  useEffect(() => {
    if (!teacherUid || !liveState?.fallenPlayerUids || liveState.fallenPlayerUids.length === 0) {
        setFallenStudentNames([]);
        return;
    }
    const fetchNames = async () => {
        const names = await Promise.all(
            liveState.fallenPlayerUids!.map(async (uid) => {
                const studentRef = doc(db, 'teachers', teacherUid, 'students', uid);
                const studentSnap = await getDoc(studentRef);
                return studentSnap.exists() ? studentSnap.data().characterName : 'Unknown Hero';
            })
        );
        setFallenStudentNames(names);
    }
    fetchNames();
  }, [liveState?.fallenPlayerUids, teacherUid]);

  const handleStartFirstQuestion = async () => {
    if(!teacherUid || !battle) return;
    const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
    await setDoc(liveBattleRef, { 
        battleId: battle.id,
        status: 'IN_PROGRESS', 
        currentQuestionIndex: 0,
        totalDamage: 0,
        totalBaseDamage: 0,
        totalPowerDamage: 0,
        fallenPlayerUids: [],
        empoweredMageUids: [],
        cosmicDivinationUses: 0,
        voteState: null,
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

        // Delete the master response document for the previous round
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
        });

        await batch.commit();
        
        await logGameEvent(teacherUid, 'BOSS_BATTLE', `Round ${nextQuestionIndex + 1} of '${battle.battleName}' has started.`);
    } catch (error) {
        console.error("Error advancing to next question:", error);
    } finally {
        setIsAdvancing(false);
    }
  };

  const handleEndBattle = async () => {
    if (!liveState || !battle || !teacherUid) return;
    
    // Ensure the final round's results are calculated if not already
    if (liveState.status !== 'SHOWING_RESULTS') {
        await calculateAndSetResults();
        await new Promise(resolve => setTimeout(resolve, 500)); // Give Firestore time to sync before reading final state
    }
    
    const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
    const finalStateDoc = await getDoc(liveBattleRef);

    if (!finalStateDoc.exists()) {
        toast({ title: "Error ending battle", description: "Live battle document disappeared.", variant: 'destructive' });
        return;
    }

    const batch = writeBatch(db);
    const finalStateData = finalStateDoc.data();
    const totalDamage = finalStateData?.totalDamage || 0;
    const totalBaseDamage = finalStateData?.totalBaseDamage || 0;
    const totalPowerDamage = finalStateData?.totalPowerDamage || 0;
    const fallenAtEnd = finalStateData?.fallenPlayerUids || [];
    const empoweredAtEnd = finalStateData?.empoweredMageUids || [];
    await logGameEvent(teacherUid, 'BOSS_BATTLE', `The party dealt a total of ${totalDamage} damage during '${battle.battleName}'.`);

    const rewardsByStudent: { [uid: string]: { xpGained: number, goldGained: number } } = {};
    const individualResultsByStudent: { [uid: string]: any } = {};
    
    Object.keys(allRoundsData).forEach(roundIndex => {
        const roundData = allRoundsData[roundIndex];
        if (roundData && roundData.responses) {
            roundData.responses.forEach((res: any) => {
                if (!rewardsByStudent[res.studentUid]) {
                    rewardsByStudent[res.studentUid] = { xpGained: 0, goldGained: 0 };
                }
                if (res.isCorrect) {
                    rewardsByStudent[res.studentUid].xpGained += 5;
                    rewardsByStudent[res.studentUid].goldGained += 10;
                }

                 if (!individualResultsByStudent[res.studentUid]) {
                    individualResultsByStudent[res.studentUid] = {};
                }
                individualResultsByStudent[res.studentUid][roundIndex] = {
                    questionText: roundData.questionText,
                    responses: [res] // Array with only this student's response
                };
            });
        }
    });

    for (const uid in rewardsByStudent) {
        if (fallenAtEnd.includes(uid)) continue; 

        const studentRef = doc(db, 'teachers', teacherUid, 'students', uid);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
            const studentData = studentSnap.data() as Student;
            const { xpGained, goldGained } = rewardsByStudent[uid];

            const currentXp = studentData.xp || 0;
            const newXp = currentXp + xpGained;
            const currentLevel = studentData.level || 1;
            const newLevel = calculateLevel(newXp);
            
            const updates: any = {
                xp: newXp,
                gold: (studentData.gold || 0) + goldGained,
            };

            if (newLevel > currentLevel) {
                const levelsGained = newLevel - currentLevel;
                updates.level = newLevel;
                updates.hp = studentData.hp + calculateHpGain(studentData.class, levelsGained);
                updates.maxHp = calculateBaseMaxHp(studentData.class, newLevel, 'hp');
                updates.mp = studentData.mp + calculateMpGain(studentData.class, levelsGained);
                updates.maxMp = calculateBaseMaxHp(studentData.class, newLevel, 'mp');
            }
            batch.update(studentRef, updates);

            const studentSummaryRef = doc(db, 'teachers', teacherUid, 'students', uid, 'battleSummaries', battleId);
            batch.set(studentSummaryRef, {
                battleId: battleId,
                battleName: battle?.battleName || '',
                endedAt: serverTimestamp(),
                xpGained: xpGained,
                goldGained: goldGained,
                questions: battle?.questions || [],
                resultsByRound: individualResultsByStudent[uid] || {},
                battleLog: powerLog,
            });
        }
    }

    for (const mageUid of empoweredAtEnd) {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', mageUid);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
            const studentData = studentSnap.data() as Student;
            const baseMaxHp = calculateBaseMaxHp(studentData.class, studentData.level);
            const newHp = Math.min(studentData.hp, baseMaxHp); 
            batch.update(studentRef, { hp: newHp, maxHp: baseMaxHp });
        }
    }

    const summaryRef = doc(db, 'teachers', teacherUid, `battleSummaries`, battleId);
    batch.set(summaryRef, {
        battleId: battleId,
        battleName: battle?.battleName || '',
        questions: battle?.questions || [],
        resultsByRound: allRoundsData,
        battleLog: powerLog,
        rewards: rewardsByStudent,
        totalDamageDealt: totalDamage,
        totalBaseDamage: totalBaseDamage,
        totalPowerDamage: totalPowerDamage,
        fallenAtEnd: fallenAtEnd,
        endedAt: serverTimestamp(),
    });
    
    // Automatic Cleanup
    const subcollections = ['responses', 'powerActivations', 'battleLog', 'messages'];
    for (const sub of subcollections) {
        const subRef = collection(liveBattleRef, sub);
        const snapshot = await getDocs(subRef);
        snapshot.forEach(doc => batch.delete(doc.ref));
    }
    batch.delete(liveBattleRef);

    await batch.commit();

    await logGameEvent(teacherUid, 'BOSS_BATTLE', `Battle summary for '${battle.battleName}' was saved and live battle was cleaned up.`);
    
    router.push(`/teacher/battle/summary/${battleId}`);
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
  const isRoundEnding = liveState.status === 'ROUND_ENDING';
  const areResultsShowing = liveState.status === 'SHOWING_RESULTS';
  const isLastQuestion = liveState.currentQuestionIndex >= battle.questions.length - 1;
  const expiryTimestamp = liveState.timerEndsAt ? new Date(liveState.timerEndsAt.seconds * 1000) : null;
  const videoSrc = battle.videoUrl ? getYouTubeEmbedUrl(battle.videoUrl) : '';


  return (
    <div 
        className="relative flex min-h-screen w-full flex-col"
    >
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
                                <Button onClick={handleEndRound} disabled={!isRoundInProgress || isEndingRound}>
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
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isAdvancing || isEndingRound}>End Battle</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        This action will end the battle for all participants, award final XP/Gold, and take you to the summary page. You cannot undo this.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleEndBattle}>Yes, End Battle</AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
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
                            <p className="text-muted-foreground">Students are now in the pre-battle waiting room. They can see the intro video if one was provided. When you are ready, click "Start First Question" to begin the battle.</p>
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
                        {isRoundEnding && expiryTimestamp && <CountdownTimer expiryTimestamp={expiryTimestamp} />}
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
                <BattleChatBox 
                    isTeacher={true}
                    userName={"The Wise One"}
                    teacherUid={teacherUid || ''}
                    battleId={'active-battle'}
                />
                {(liveState.fallenPlayerUids && liveState.fallenPlayerUids.length > 0) && (
                     <Card className="bg-card/60 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Skull className="text-destructive"/> Fallen Heroes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">A healer must use 'Enduring Spirit' to revive them.</p>
                            <ul className="mt-2 space-y-1">
                                {fallenStudentNames.map((name, index) => (
                                    <li key={index} className="font-semibold">{name}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}

    