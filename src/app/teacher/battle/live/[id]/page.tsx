
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, collection, query, updateDoc, getDocs, writeBatch, serverTimestamp, setDoc, deleteDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Download, Timer, HeartCrack, Video, ShieldCheck, Sparkles, Skull } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RoundResults, type Result } from '@/components/teacher/round-results';
import { downloadCsv } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { calculateLevel, calculateHpGain, calculateMpGain } from '@/lib/game-mechanics';
import type { Student } from '@/lib/data';
import { logGameEvent } from '@/lib/gamelog';
import { BattleChatBox } from '@/components/battle/chat-box';

interface QueuedPower {
    casterUid: string;
    powerName: 'Wildfire';
    damage: number;
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
  powerUsersThisRound?: { [key: string]: string[] }; // { studentUid: [powerName, ...] }
  queuedPowers?: QueuedPower[];
  fallenPlayerUids?: string[];
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
    uid: string;
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
        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700">
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

  const [battle, setBattle] = useState<Battle | null>(null);
  const [liveState, setLiveState] = useState<LiveBattleState | null>(null);
  const [studentResponses, setStudentResponses] = useState<Result[]>([]);
  const [roundResults, setRoundResults] = useState<Result[]>([]);
  const [allRoundsData, setAllRoundsData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEndingRound, setIsEndingRound] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [fallenStudentNames, setFallenStudentNames] = useState<string[]>([]);


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
    return () => unsubscribe();
  }, [battleId, router, teacherUid]);

  // Listen for real-time student responses for the current question
  useEffect(() => {
    if (!liveState || !teacherUid ||(liveState.status !== 'IN_PROGRESS' && liveState.status !== 'ROUND_ENDING')) {
        setStudentResponses([]);
        return;
    }
    
    const responsesRef = collection(db, 'teachers', teacherUid, `liveBattles/active-battle/responses`);
    const q = query(responsesRef);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const responses: Result[] = [];
        const powerUsers = liveState.powerUsersThisRound || {};

        querySnapshot.forEach((doc) => {
            const data = doc.data() as StudentResponse;
            // Join the array of power names for the specific user
            const powerUsed = powerUsers[doc.id]?.join(', ') || undefined;

            responses.push({
                studentName: data.studentName,
                answer: data.answer,
                isCorrect: data.isCorrect,
                powerUsed: powerUsed,
            });
        });
        setStudentResponses(responses);
    }, (error) => {
        console.error("Error listening for student responses:", error);
    });

    return () => unsubscribe();
}, [liveState, liveState?.status, liveState?.currentQuestionIndex, teacherUid]);
  
    // Power Activation Listener
    useEffect(() => {
        if (!liveState || !battle || !teacherUid || liveState.status !== 'IN_PROGRESS') return;

        const powerActivationsRef = collection(db, 'teachers', teacherUid, `liveBattles/active-battle/powerActivations`);
        const q = query(powerActivationsRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const activation = { id: change.doc.id, ...change.doc.data() } as PowerActivation;
                    
                    if (activation.powerName === 'Nature’s Guidance') {
                        await handleNaturesGuidance(activation);
                    } else if (activation.powerName === 'Wildfire') {
                        await handleWildfire(activation);
                    } else if (activation.powerName === 'Enduring Spirit') {
                         await handleEnduringSpirit(activation);
                    }
                    
                    await deleteDoc(doc(db, 'teachers', teacherUid, `liveBattles/active-battle/powerActivations`, activation.id!));
                }
            });
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveState?.status, liveState?.currentQuestionIndex, battle, teacherUid]);
    
    const handleNaturesGuidance = async (activation: PowerActivation) => {
        if(!teacherUid) return;
        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const studentRef = doc(db, 'teachers', teacherUid, 'students', activation.studentUid);
        
        const battleDoc = await getDoc(liveBattleRef);
        const studentDoc = await getDoc(studentRef);

        if (!battleDoc.exists() || !studentDoc.exists()) return;

        const battleData = battleDoc.data() as LiveBattleState;
        const studentData = studentDoc.data() as Student;
        const currentQuestion = battle!.questions[battleData.currentQuestionIndex];
        
        if (studentData.mp < activation.powerMpCost) return; 
        if ((battleData.powerUsersThisRound?.[activation.studentUid] || []).includes(activation.powerName)) return;

        const incorrectAnswerIndices = currentQuestion.answers
            .map((_, i) => i)
            .filter(i => i !== currentQuestion.correctAnswerIndex);
            
        const removableIndices = incorrectAnswerIndices.filter(i => !(battleData.removedAnswerIndices || []).includes(i));
        
        if (removableIndices.length === 0) return;

        const indexToRemove = removableIndices[Math.floor(Math.random() * removableIndices.length)];

        const batch = writeBatch(db);
        batch.update(studentRef, { mp: increment(-activation.powerMpCost) });
        batch.update(liveBattleRef, {
            removedAnswerIndices: arrayUnion(indexToRemove),
            [`powerUsersThisRound.${activation.studentUid}`]: arrayUnion(activation.powerName),
            powerEventMessage: `${activation.studentName} used Nature's Guidance!`
        });

        await batch.commit();
        await logGameEvent(teacherUid, 'BOSS_BATTLE', `${activation.studentName} used Nature's Guidance.`);
        setTimeout(async () => {
            await updateDoc(liveBattleRef, { powerEventMessage: '' });
        }, 5000);
    };

    const handleWildfire = async (activation: PowerActivation) => {
        if(!teacherUid) return;
        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const studentRef = doc(db, 'teachers', teacherUid, 'students', activation.studentUid);
        
        const battleDoc = await getDoc(liveBattleRef);
        const studentDoc = await getDoc(studentRef);

        if (!battleDoc.exists() || !studentDoc.exists()) return;

        const battleData = battleDoc.data() as LiveBattleState;
        const studentData = studentDoc.data() as Student;

        if (studentData.mp < activation.powerMpCost) return;
        if ((battleData.powerUsersThisRound?.[activation.studentUid] || []).includes(activation.powerName)) return;

        const roll1 = Math.floor(Math.random() * 6) + 1;
        const roll2 = Math.floor(Math.random() * 6) + 1;
        const damage = roll1 + roll2 + (studentData.level || 1);

        const newQueuedPower: QueuedPower = {
            casterUid: activation.studentUid,
            powerName: 'Wildfire',
            damage: damage,
        };

        const batch = writeBatch(db);
        batch.update(studentRef, { mp: increment(-activation.powerMpCost) });
        batch.update(liveBattleRef, {
            queuedPowers: arrayUnion(newQueuedPower),
            [`powerUsersThisRound.${activation.studentUid}`]: arrayUnion(activation.powerName),
            powerEventMessage: `${activation.studentName} has cast Wildfire! Their foe will receive ${damage} points of damage if their spell strikes true!`
        });

        await batch.commit();
        await logGameEvent(teacherUid, 'BOSS_BATTLE', `${activation.studentName} cast Wildfire, queueing ${damage} damage.`);
        setTimeout(async () => {
            await updateDoc(liveBattleRef, { powerEventMessage: '' });
        }, 5000);
    };

    const handleEnduringSpirit = async (activation: PowerActivation) => {
        if (!activation.targets || activation.targets.length === 0 || !teacherUid) return;

        const batch = writeBatch(db);
        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        const casterRef = doc(db, 'teachers', teacherUid, 'students', activation.studentUid);

        // Deduct MP from caster
        batch.update(casterRef, { mp: increment(-activation.powerMpCost) });

        // Revive the target
        const targetUid = activation.targets[0];
        const targetRef = doc(db, 'teachers', teacherUid, 'students', targetUid);
        batch.update(targetRef, { hp: 1 }); // Revive with 1 HP

        // Remove from fallen list and add power usage info
        batch.update(liveBattleRef, {
            fallenPlayerUids: arrayRemove(targetUid),
            [`powerUsersThisRound.${activation.studentUid}`]: arrayUnion(activation.powerName),
            powerEventMessage: `${activation.studentName} used Enduring Spirit to revive a fallen ally!`
        });

        await batch.commit();
        await logGameEvent(teacherUid, 'BOSS_BATTLE', `${activation.studentName} used Enduring Spirit.`);
        setTimeout(async () => {
            await updateDoc(liveBattleRef, { powerEventMessage: '' });
        }, 5000);
    };


  const calculateAndSetResults = useCallback(async () => {
    if (!battle || !liveState || !teacherUid || liveState.status !== 'ROUND_ENDING' || isEndingRound) return;

    setIsEndingRound(true);
    
    try {
        const batch = writeBatch(db);
        const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
        
        const responsesRef = collection(db, 'teachers', teacherUid, `liveBattles/active-battle/responses`);
        const responsesSnapshot = await getDocs(responsesRef);
        const responsesData = responsesSnapshot.docs.map(doc => ({ uid: doc.id, ...(doc.data() as StudentResponse) }));
        
        const currentQuestion = battle.questions[liveState.currentQuestionIndex];
        const damageOnIncorrect = currentQuestion.damage || 0;

        const results: Result[] = responsesData.map(response => ({
            studentName: response.studentName,
            answer: response.answer,
            isCorrect: response.isCorrect,
            powerUsed: liveState.powerUsersThisRound?.[response.uid]?.join(', ') || undefined,
        }));
        setRoundResults(results);

        const newlyFallenUids: string[] = [];

        // Apply damage for incorrect answers in a batch
        if (damageOnIncorrect > 0) {
            for (const response of responsesData) {
                if (!response.isCorrect) {
                    const studentRef = doc(db, 'teachers', teacherUid, 'students', response.uid);
                    const studentDoc = await getDoc(studentRef);
                    if (studentDoc.exists()) {
                        const studentData = studentDoc.data() as Student;
                        const newHp = Math.max(0, studentData.hp - damageOnIncorrect);
                        batch.update(studentRef, { hp: newHp });
                        if (newHp === 0) {
                            newlyFallenUids.push(response.uid);
                        }
                    }
                }
            }
        }
        
        // --- POWER DAMAGE CALCULATION ---
        let powerDamage = 0;
        const powersUsedThisRound: string[] = [];

        liveState.queuedPowers?.forEach(power => {
            const casterResponse = responsesData.find(res => res.uid === power.casterUid);
            if (casterResponse?.isCorrect) {
                powerDamage += power.damage;
                powersUsedThisRound.push(`${power.powerName} (${power.damage} dmg)`);
                logGameEvent(teacherUid, 'BOSS_BATTLE', `${casterResponse.characterName}'s Wildfire struck true for ${power.damage} damage.`);
            } else {
                 logGameEvent(teacherUid, 'BOSS_BATTLE', `${casterResponse?.characterName || 'A mage'}'s Wildfire fizzled as they answered incorrectly.`);
            }
        });


        const baseDamage = results.filter(r => r.isCorrect).length;
        const totalDamageThisRound = baseDamage + powerDamage;

        const newAllRoundsData = {
            ...allRoundsData,
            [liveState.currentQuestionIndex]: {
                questionText: currentQuestion.questionText,
                responses: responsesData.map(r => ({
                    studentUid: r.uid,
                    studentName: r.studentName,
                    answerIndex: r.answerIndex,
                    isCorrect: r.isCorrect,
                })),
                powersUsed: powersUsedThisRound,
            }
        };
        setAllRoundsData(newAllRoundsData);

        const updatePayload: any = { 
            status: 'SHOWING_RESULTS', 
            timerEndsAt: null,
            lastRoundDamage: totalDamageThisRound,
            lastRoundBaseDamage: baseDamage,
            lastRoundPowerDamage: powerDamage,
            lastRoundPowersUsed: powersUsedThisRound,
            totalDamage: increment(totalDamageThisRound),
            totalBaseDamage: increment(baseDamage),
            totalPowerDamage: increment(powerDamage)
        };
        
        if (newlyFallenUids.length > 0) {
            updatePayload.fallenPlayerUids = arrayUnion(...newlyFallenUids);
        }

        batch.update(liveBattleRef, updatePayload);

        await batch.commit();

    } catch (error) {
        console.error("Error calculating results and applying damage:", error);
    } finally {
        setIsEndingRound(false);
    }
  }, [battle, liveState, isEndingRound, allRoundsData, teacherUid]);

  // Effect to handle timer expiration
  useEffect(() => {
      if (liveState?.status !== 'ROUND_ENDING' || !liveState.timerEndsAt) return;

      const expiryDate = new Date(liveState.timerEndsAt.seconds * 1000);
      const now = new Date();
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();

      const timer = setTimeout(() => {
          calculateAndSetResults();
      }, timeUntilExpiry > 0 ? timeUntilExpiry : 0);
      
      return () => clearTimeout(timer);
  }, [liveState?.status, liveState?.timerEndsAt, calculateAndSetResults]);

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
    if(!teacherUid) return;
    const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
    await updateDoc(liveBattleRef, { status: 'IN_PROGRESS', fallenPlayerUids: [] });
    if(battle) {
        await logGameEvent(teacherUid, 'BOSS_BATTLE', `Round 1 of '${battle.battleName}' has started.`);
    }
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
    try {
        const batch = writeBatch(db);

        const responsesRef = collection(db, 'teachers', teacherUid, `liveBattles/active-battle/responses`);
        const responsesSnapshot = await getDocs(responsesRef);
        responsesSnapshot.forEach(doc => batch.delete(doc.ref));
        
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
            powerUsersThisRound: {},
            queuedPowers: [],
        });

        await batch.commit();
        setRoundResults([]);
        await logGameEvent(teacherUid, 'BOSS_BATTLE', `Round ${nextQuestionIndex + 1} of '${battle.battleName}' has started.`);
    } catch (error) {
        console.error("Error advancing to next question:", error);
    } finally {
        setIsAdvancing(false);
    }
  };

  const handleEndBattle = async () => {
      if (!liveState || !battle || !teacherUid) return;

      const batch = writeBatch(db);
      const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');

      const finalStateDoc = await getDoc(liveBattleRef);
      const finalStateData = finalStateDoc.data();
      const totalDamage = finalStateData?.totalDamage || 0;
      const totalBaseDamage = finalStateData?.totalBaseDamage || 0;
      const totalPowerDamage = finalStateData?.totalPowerDamage || 0;
      const fallenAtEnd = finalStateData?.fallenPlayerUids || [];
      await logGameEvent(teacherUid, 'BOSS_BATTLE', `The party dealt a total of ${totalDamage} damage during '${battle.battleName}'.`);

      const battleLogRef = collection(db, 'teachers', teacherUid, 'liveBattles/active-battle/battleLog');
      const battleLogSnapshot = await getDocs(battleLogRef);
      const battleLog = battleLogSnapshot.docs.map(doc => doc.data() as PowerLogEntry);


      const rewardsByStudent: { [uid: string]: { xpGained: number, goldGained: number } } = {};
      Object.values(allRoundsData).forEach((round: any) => {
          round.responses.forEach((res: any) => {
              if (res.isCorrect) {
                  if (!rewardsByStudent[res.studentUid]) {
                      rewardsByStudent[res.studentUid] = { xpGained: 0, goldGained: 0 };
                  }
                  rewardsByStudent[res.studentUid].xpGained += 5;
                  rewardsByStudent[res.studentUid].goldGained += 10;
              }
          });
      });

      for (const uid in rewardsByStudent) {
          if (fallenAtEnd.includes(uid)) continue; // Skip rewards for fallen players

          const studentRef = doc(db, 'teachers', teacherUid, 'students', uid);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
              const studentData = studentSnap.data() as Student;
              const { xpGained, goldGained } = rewardsByStudent[uid];

              const currentXp = studentData.xp || 0;
              const newXp = currentXp + xpGained;
              const currentLevel = studentData.level || 1;
              const newLevel = calculateLevel(newXp);
              
              const updates: Partial<Student> = {
                  xp: newXp,
                  gold: (studentData.gold || 0) + goldGained,
              };

              if (newLevel > currentLevel) {
                  updates.level = newLevel;
                  const levelsGained = newLevel - currentLevel;
                  updates.hp = studentData.hp + calculateHpGain(studentData.class, levelsGained);
                  updates.mp = studentData.mp + calculateMpGain(studentData.class, levelsGained);
              }
              batch.update(studentRef, updates);
          }
      }

      const summaryRef = doc(db, 'teachers', teacherUid, `battleSummaries`, battleId);
      batch.set(summaryRef, {
          battleId: battleId,
          battleName: battle?.battleName,
          questions: battle?.questions,
          resultsByRound: allRoundsData,
          battleLog: battleLog,
          totalDamageDealt: totalDamage,
          totalBaseDamage: totalBaseDamage,
          totalPowerDamage: totalPowerDamage,
          rewards: rewardsByStudent,
          fallenAtEnd: fallenAtEnd,
          endedAt: serverTimestamp(),
      });
      await logGameEvent(teacherUid, 'BOSS_BATTLE', `Battle summary for '${battle.battleName}' was saved.`);

      batch.update(liveBattleRef, { status: 'BATTLE_ENDED' });

      await batch.commit();
      
      router.push(`/teacher/battle/summary/${battleId}`);

      setTimeout(async () => {
        await deleteDoc(doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle'));
      }, 5000); 
  };
  
  const handleExport = () => {
    if (!battle || roundResults.length === 0 || !liveState) return;
    const questionText = battle.questions[liveState.currentQuestionIndex].questionText;
    const headers = ['Student Name', 'Answer', 'Correct'];
    const data = roundResults.map(r => [r.studentName, r.answer, r.isCorrect ? 'Yes' : 'No']);
    downloadCsv(data, headers, `battle_results_q${liveState.currentQuestionIndex + 1}.csv`);
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
  const isRoundInProgress = liveState.status === 'IN_PROGRESS';
  const isRoundEnding = liveState.status === 'ROUND_ENDING';
  const areResultsShowing = liveState.status === 'SHOWING_RESULTS';
  const isLastQuestion = liveState.currentQuestionIndex >= battle.questions.length - 1;
  const expiryTimestamp = liveState.timerEndsAt ? new Date(liveState.timerEndsAt.seconds * 1000) : null;
  const videoSrc = battle.videoUrl ? getYouTubeEmbedUrl(battle.videoUrl) : '';


  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <div className="lg:col-span-2 space-y-6">
                <Card>
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
                            <div className="flex gap-4">
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Waiting for Students</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Students are now in the pre-battle waiting room. They can see the intro video if one was provided. When you are ready, click "Start First Question" to begin the battle.</p>
                        </CardContent>
                    </Card>
                )}

                {isRoundEnding && expiryTimestamp && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Ending Round...</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CountdownTimer expiryTimestamp={expiryTimestamp} />
                        </CardContent>
                    </Card>
                )}

                {(isRoundInProgress || isRoundEnding) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Live Student Responses ({studentResponses.length})</CardTitle>
                            <CardDescription>See which students have submitted their answer for the current question.</CardDescription>
                        </CardHeader>
                        <CardContent>
                        <RoundResults results={studentResponses} />
                        </CardContent>
                    </Card>
                )}

                {areResultsShowing && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Round Results</CardTitle>
                                <CardDescription>Review of student answers for the last question.</CardDescription>
                            </div>
                            <Button onClick={handleExport} variant="outline" size="sm" disabled={roundResults.length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Export to CSV
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <RoundResults results={roundResults} />
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
                        </CardContent>
                    </Card>
                )}
            </div>
             <div className="lg:col-span-1 space-y-6">
                <BattleChatBox 
                    isTeacher={true}
                    userName={"The Wise One"}
                    teacherUid={teacherUid}
                    battleId={battleId}
                />
                {(liveState.fallenPlayerUids && liveState.fallenPlayerUids.length > 0) && (
                     <Card>
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

    