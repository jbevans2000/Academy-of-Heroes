
'use server';

import { doc, getDoc, collection, writeBatch, increment, arrayUnion, arrayRemove, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logGameEvent } from '@/lib/gamelog';
import type { Student } from '@/lib/data';
import type { Result } from '@/components/teacher/round-results';


// This file will contain the centralized logic for battle actions.

interface PowerActivation {
    id?: string;
    studentUid: string;
    studentName: string;
    powerName: string;
    powerMpCost: number;
    targets: string[];
    timestamp: any;
}

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

const handleNaturesGuidance = async (activation: PowerActivation, liveBattleRef: any, batch: any, battle: Battle, liveState: LiveBattleState) => {
    const currentQuestion = battle!.questions[liveState!.currentQuestionIndex];
    
    const incorrectAnswerIndices = currentQuestion.answers
        .map((_, i) => i)
        .filter(i => i !== currentQuestion.correctAnswerIndex);
        
    const removableIndices = incorrectAnswerIndices.filter(i => !(liveState!.removedAnswerIndices || []).includes(i));
    
    if (removableIndices.length === 0) return { success: false, message: "No incorrect answers left to remove." };

    const indexToRemove = removableIndices[Math.floor(Math.random() * removableIndices.length)];

    batch.update(liveBattleRef, {
        removedAnswerIndices: arrayUnion(indexToRemove),
    });

    return { success: true, publicMessage: `${activation.studentName} used Nature's Guidance!` };
};

const handleWildfire = async (activation: PowerActivation, liveBattleRef: any, batch: any, studentData: Student) => {
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
    });

    return { success: true, publicMessage: `${activation.studentName} has cast Wildfire! Their foe will receive ${damage} points of damage if their spell strikes true!` };
};

const handleEnduringSpirit = async (activation: PowerActivation, liveBattleRef: any, batch: any, studentData: Student, teacherUid: string, isAdminTest: boolean = false) => {
    if (!activation.targets || activation.targets.length === 0) return { success: false, message: "No target selected."};
    
    const targetUid = activation.targets[0];
    const studentCollectionPath = isAdminTest ? `admins/${teacherUid}/testStudents` : `teachers/${teacherUid}/students`;
    const targetRef = doc(db, studentCollectionPath, targetUid);
    const targetSnap = await getDoc(targetRef);

    if (!targetSnap.exists()) return { success: false, message: "Target not found."};
    const targetData = targetSnap.data() as Student;

    if (targetData.hp > 0) {
        return {
            success: false,
            targetedMessage: {
                targetUid: activation.studentUid,
                message: `${targetData.characterName} has already been restored! Choose another power.`
            }
        };
    }

    const healAmount = Math.ceil(targetData.maxHp * 0.1);
    batch.update(targetRef, { hp: healAmount });

    batch.update(liveBattleRef, {
        fallenPlayerUids: arrayRemove(targetUid),
    });
    
    await logGameEvent(teacherUid, 'BOSS_BATTLE', `${activation.studentName} used Enduring Spirit on ${targetData.characterName}.`);
    return {
        success: true,
        publicMessage: `${activation.studentName} cast Enduring Spirit and restored ${targetData.characterName} to life!`,
        targetedMessage: {
            targetUid: targetUid,
            message: `${studentData.characterName} has brought you back from the brink! Get back into the fight!`
        }
    };
};

const handleLesserHeal = async (activation: PowerActivation, liveBattleRef: any, batch: any, studentData: Student, teacherUid: string, isAdminTest: boolean = false) => {
    if (!activation.targets || activation.targets.length !== 2) return { success: false };

    const healRoll = Math.floor(Math.random() * 6) + 1;
    const totalHeal = healRoll + (studentData.level || 1);

    let heal1 = Math.floor(totalHeal / 2);
    let heal2 = Math.ceil(totalHeal / 2);
    if (Math.random() < 0.5) { [heal1, heal2] = [heal2, heal1]; }

    const [target1Uid, target2Uid] = activation.targets;
    const studentCollectionPath = isAdminTest ? `admins/${teacherUid}/testStudents` : `teachers/${teacherUid}/students`;

    const target1Ref = doc(db, studentCollectionPath, target1Uid);
    const target2Ref = doc(db, studentCollectionPath, target2Uid);
    const target1Doc = await getDoc(target1Ref);
    const target2Doc = await getDoc(target2Ref);

    let target1Name = 'An ally';
    let target2Name = 'Another ally';

    if (target1Doc.exists()) {
        const targetData = target1Doc.data() as Student;
        target1Name = targetData.characterName;
        const newHp = Math.min(targetData.maxHp, targetData.hp + heal1);
        batch.update(target1Ref, { hp: newHp });
    }
    if (target2Doc.exists()) {
        const targetData = target2Doc.data() as Student;
        target2Name = targetData.characterName;
        const newHp = Math.min(targetData.maxHp, targetData.hp + heal2);
        batch.update(target2Ref, { hp: newHp });
    }
    
    await logGameEvent(teacherUid, 'BOSS_BATTLE', `${activation.studentName} cast Lesser Heal on ${target1Name} and ${target2Name}.`);
    return { success: true, publicMessage: `${activation.studentName} has cast Lesser Heal! ${target1Name} and ${target2Name} have had health restored!` };
};

const handleSolarEmpowerment = async (activation: PowerActivation, liveBattleRef: any, batch: any, studentData: Student, teacherUid: string, isAdminTest: boolean = false) => {
    if (!activation.targets || activation.targets.length !== 3) return { success: false };

    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    const totalBoost = roll1 + roll2 + (studentData.level || 1);

    const baseBoost = Math.floor(totalBoost / 3);
    let remainder = totalBoost % 3;
    const boosts = [baseBoost, baseBoost, baseBoost];
    
    let indices = [0, 1, 2];
    while (remainder > 0) {
        const randomIndex = Math.floor(Math.random() * indices.length);
        boosts[indices[randomIndex]]++;
        indices.splice(randomIndex, 1);
        remainder--;
    }

    const studentCollectionPath = isAdminTest ? `admins/${teacherUid}/testStudents` : `teachers/${teacherUid}/students`;
    for (let i = 0; i < 3; i++) {
        const targetUid = activation.targets[i];
        const boostAmount = boosts[i];
        const targetRef = doc(db, studentCollectionPath, targetUid);
        batch.update(targetRef, { 
            hp: increment(boostAmount),
            maxHp: increment(boostAmount)
        });
    }
    
    batch.update(liveBattleRef, {
        empoweredMageUids: arrayUnion(...activation.targets),
    });

    await logGameEvent(teacherUid, 'BOSS_BATTLE', `${activation.studentName} cast Solar Empowerment.`);
    return { success: true, publicMessage: `${activation.studentName} has cast Solar Empowerment! Three mages begin to shine with the light of the sun!` };
};

const handleCosmicDivination = async (activation: PowerActivation, liveBattleRef: any, batch: any, studentData: Student, allStudents: Student[], teacherUid: string) => {
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
    
    await logGameEvent(teacherUid, 'BOSS_BATTLE', `${activation.studentName} cast Cosmic Divination, dealing ${studentData.level} damage.`);
    return { success: true, publicMessage: "" }; // Public message is handled by the vote dialog
};

const powerHandlers: { [key: string]: Function } = {
    'Nature’s Guidance': handleNaturesGuidance,
    'Wildfire': handleWildfire,
    'Enduring Spirit': handleEnduringSpirit,
    'Lesser Heal': handleLesserHeal,
    'Solar Empowerment': handleSolarEmpowerment,
    'Cosmic Divination': handleCosmicDivination,
};

export async function handlePowerActivation(activation: PowerActivation, teacherUid: string, liveBattleRef: any, allStudents: Student[], battle: Battle, isAdminTest: boolean = false) {
    if (!teacherUid) return;
    
    const studentCollectionPath = isAdminTest ? `admins/${teacherUid}/testStudents` : `teachers/${teacherUid}/students`;
    const studentRef = doc(db, studentCollectionPath, activation.studentUid);
    
    const battleDoc = await getDoc(liveBattleRef);
    const studentDoc = await getDoc(studentRef);

    if (!battleDoc.exists() || !studentDoc.exists()) return;
    const battleData = battleDoc.data() as LiveBattleState;
    const studentData = studentDoc.data() as Student;
    
    if (studentData.mp < activation.powerMpCost) return;
    if ((battleData.powerUsersThisRound?.[activation.studentUid] || []).length > 0) return;
    if (activation.powerName === 'Cosmic Divination') {
        if (battleData.status === 'ROUND_ENDING') return;
        if ((battleData.cosmicDivinationUses || 0) >= 2) {
            const targetedEvent: TargetedEvent = { targetUid: activation.studentUid, message: "Due to time sickness, you may not use this power again!" };
            await updateDoc(liveBattleRef, { targetedEvent: targetedEvent });
            setTimeout(() => updateDoc(liveBattleRef, { targetedEvent: null }), 5000);
            return;
        }
    }

    const handler = powerHandlers[activation.powerName];
    if (!handler) return;
    
    const batch = writeBatch(db);
    const result = await handler(activation, liveBattleRef, batch, studentData, isAdminTest ? allStudents : teacherUid, battle, battleData);

    if (result && result.success) {
        batch.update(studentRef, { mp: increment(-activation.powerMpCost) });
        batch.update(liveBattleRef, {
            [`powerUsersThisRound.${activation.studentUid}`]: arrayUnion(activation.powerName),
        });
        
        const updatePayload: any = {};
        if (result.publicMessage) updatePayload.powerEventMessage = result.publicMessage;
        if (result.targetedMessage) updatePayload.targetedEvent = result.targetedMessage;
        if (Object.keys(updatePayload).length > 0) {
             batch.update(liveBattleRef, updatePayload);
        }
        
        await batch.commit();

        if (result.publicMessage) {
            setTimeout(async () => {
                await updateDoc(liveBattleRef, { powerEventMessage: '' });
            }, 5000);
        }
        if (result.targetedMessage) {
            setTimeout(async () => {
                await updateDoc(liveBattleRef, { targetedEvent: null });
            }, 5000);
        }

    } else if (result && !result.success && result.targetedMessage) {
         await updateDoc(liveBattleRef, { targetedEvent: result.targetedMessage });
         setTimeout(() => updateDoc(liveBattleRef, { targetedEvent: null }), 5000);
    }
    
    // Delete the activation document after processing
    const activationDocRef = doc(db, `${liveBattleRef.path}/powerActivations`, activation.id!);
    await deleteDoc(activationDocRef);
}


export async function calculateAndSetResults(liveState: LiveBattleState, battle: Battle, teacherUid: string, allStudents: Student[], isDivinationSkip: boolean = false): Promise<Result[]> {
    const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
    const batch = writeBatch(db);
    
    const responsesRef = collection(db, 'teachers', teacherUid, `liveBattles/active-battle/responses`);
    const responsesSnapshot = await getDocs(responsesRef);
    const responsesData = responsesSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() as any }));
    
    const currentQuestion = battle.questions[liveState.currentQuestionIndex];
    const damageOnIncorrect = currentQuestion.damage || 0;

    const results: Result[] = responsesData.map(response => ({
        studentName: response.characterName,
        answer: response.answer,
        isCorrect: response.isCorrect,
        powerUsed: liveState.powerUsersThisRound?.[response.uid]?.join(', ') || undefined,
    }));

    const newlyFallenUids: string[] = [];

    if (damageOnIncorrect > 0 && !isDivinationSkip) {
        for (const response of responsesData) {
            if (!response.isCorrect) {
                const studentRef = doc(db, 'teachers', teacherUid, 'students', response.uid);
                const studentData = allStudents.find(s => s.uid === response.uid);
                if (studentData) {
                    const newHp = Math.max(0, studentData.hp - damageOnIncorrect);
                    batch.update(studentRef, { hp: newHp });
                    if (newHp === 0) {
                        newlyFallenUids.push(response.uid);
                    }
                }
            }
        }
    }
    
    let powerDamage = isDivinationSkip ? (liveState.lastRoundPowerDamage || 0) : 0;
    const powersUsedThisRound: string[] = isDivinationSkip ? (liveState.lastRoundPowersUsed || []) : [];

    if (!isDivinationSkip) {
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

    await batch.commit();
    
    return results;
}
