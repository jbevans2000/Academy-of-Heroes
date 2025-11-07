
'use server';

import { doc, runTransaction, increment, arrayUnion, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { outOfCombatPowers } from '@/lib/out-of-combat-powers';
import { logAvatarEvent } from '@/lib/avatar-log';
import { handleLevelChange } from '@/lib/game-mechanics';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface UsePowerInput {
    teacherUid: string;
    casterUid: string;
    powerName: string;
    targets: string[];
    inputValue?: number; // For powers like 'Absorb'
}

const rollDie = (sides: number) => Math.floor(Math.random() * sides) + 1;

export async function useOutOfCombatPower(input: UsePowerInput): Promise<ActionResponse> {
    const { teacherUid, casterUid, powerName, targets, inputValue } = input;
    if (!teacherUid || !casterUid || !powerName) {
        return { success: false, error: 'Invalid input.' };
    }

    try {
        return await runTransaction(db, async (transaction) => {
            const allPowers = Object.values(outOfCombatPowers).flat();
            const power = allPowers.find(p => p.name === powerName);

            if (!power) throw new Error("Power not found.");
            
            const casterRef = doc(db, 'teachers', teacherUid, 'students', casterUid);
            const casterSnap = await transaction.get(casterRef);
            if (!casterSnap.exists()) throw new Error("Caster not found.");
            
            const caster = casterSnap.data() as Student;
            
            if (caster.level < power.level) throw new Error("You have not learned this power yet.");

            // Get the teacher document to fetch leveling table for XP rewards
            const teacherRef = doc(db, 'teachers', teacherUid);
            const teacherSnap = await transaction.get(teacherRef);
            const levelingTable = teacherSnap.exists() ? teacherSnap.data().levelingTable : null;
            
            let dynamicCost = power.mpCost;
            if (power.name === 'Psychic Flare') {
                dynamicCost = Math.max(20, Math.floor(caster.mp * 0.5));
            } else if (power.name === 'Veteran\'s Insight') {
                dynamicCost = Math.ceil(caster.maxMp * 0.20);
            }

            if (caster.mp < dynamicCost) throw new Error("Not enough MP to cast this spell.");

            if (power.name === 'Lesser Heal' || power.name === 'Focused Restoration') {
                if (!targets || targets.length === 0) throw new Error("No targets selected.");
                if (targets.length > (power.targetCount || 1)) throw new Error("Too many targets selected.");

                transaction.update(casterRef, { mp: increment(-power.mpCost) });
                
                let totalHealed = 0;
                let targetNames: string[] = [];
                const healAmount = power.name === 'Lesser Heal'
                    ? rollDie(6) + caster.level
                    : rollDie(8) + rollDie(8) + rollDie(8) + caster.level;

                const healPerTarget = Math.ceil(healAmount / targets.length);
                
                const targetSnaps = await Promise.all(targets.map(uid => transaction.get(doc(db, 'teachers', teacherUid, 'students', uid))));

                targetSnaps.forEach((targetSnap, index) => {
                    if (!targetSnap.exists()) return; 
                    const target = targetSnap.data() as Student;
                    targetNames.push(target.characterName);
                    if (target.hp >= target.maxHp) return;

                    const newHp = Math.min(target.maxHp, target.hp + healPerTarget);
                    totalHealed += (newHp - target.hp);
                    transaction.update(targetSnap.ref, { hp: newHp });
                });
                
                await logAvatarEvent(teacherUid, casterUid, { source: 'Spell', reason: `Cast ${powerName}` });
                return { success: true, message: `You cast ${powerName}, restoring a total of ${totalHealed} HP to ${targetNames.join(', ')}.` };
            }
            
            if (power.name === 'Psionic Aura') {
                 if (!targets || targets.length === 0) throw new Error("No targets selected.");
                 
                 transaction.update(casterRef, { mp: increment(-power.mpCost) });

                 const totalRestore = rollDie(6) + caster.level;
                 const restorePerTarget = Math.ceil(totalRestore / targets.length);
                 let targetNames: string[] = [];

                 const targetSnaps = await Promise.all(targets.map(uid => transaction.get(doc(db, 'teachers', teacherUid, 'students', uid))));

                 targetSnaps.forEach((targetSnap) => {
                     if (!targetSnap.exists()) return;
                     const target = targetSnap.data() as Student;
                     targetNames.push(target.characterName);
                     if (target.mp >= target.maxMp) return;
                     const newMp = Math.min(target.maxMp, target.mp + restorePerTarget);
                     transaction.update(targetSnap.ref, { mp: newMp });
                 });

                 await logAvatarEvent(teacherUid, casterUid, { source: 'Spell', reason: `Cast ${powerName}` });
                 return { success: true, message: `You cast ${powerName}, restoring ${restorePerTarget} MP to ${targetNames.join(', ')}.` };
            }

            if (power.name === 'Psychic Flare') {
                 if (!targets || targets.length !== 1) throw new Error("Must select exactly one target.");
                 const targetUid = targets[0];
                 const targetRef = doc(db, 'teachers', teacherUid, 'students', targetUid);
                 const targetSnap = await transaction.get(targetRef);

                 if (!targetSnap.exists()) throw new Error("Target not found.");
                 const targetData = targetSnap.data() as Student;
                 
                 const actualCost = Math.max(20, Math.floor(caster.mp * 0.5));
                 if (caster.mp < actualCost) throw new Error("Not enough MP to cast this spell.");

                 if (targetData.mp >= targetData.maxMp * 0.5) {
                    return { success: false, error: `${targetData.characterName}'s magic is already potent enough. Your power was not consumed.` };
                 }

                 transaction.update(casterRef, { mp: increment(-actualCost) });
                 transaction.update(targetRef, { mp: targetData.maxMp });

                 await logAvatarEvent(teacherUid, casterUid, { source: 'Spell', reason: `Cast ${powerName} on ${targetData.characterName}` });
                 return { success: true, message: `You cast Psychic Flare, restoring ${targetData.characterName} to full MP!` };
            }
            
            if (power.name === 'Veteran\'s Insight') {
                if (!targets || targets.length === 0) throw new Error("No targets selected for Veteran's Insight.");

                // 1. Check Caster's Cooldown
                if (caster.lastUsedVeteransInsight) {
                    const lastUsed = caster.lastUsedVeteransInsight.toDate();
                    const now = new Date();
                    if (now.getTime() - lastUsed.getTime() < 24 * 60 * 60 * 1000) {
                        throw new Error("You can only use Veteran's Insight once every 24 hours.");
                    }
                }

                // 2. Fetch all targets and validate them
                const targetSnaps = await Promise.all(targets.map(uid => transaction.get(doc(db, 'teachers', teacherUid, 'students', uid))));
                const xpToAward = (caster.level || 1) * 10;
                let awardedCount = 0;
                const targetNames: string[] = [];

                for (const targetSnap of targetSnaps) {
                    if (!targetSnap.exists()) continue;
                    const target = targetSnap.data() as Student;

                    // Validation checks
                    if (target.companyId !== caster.companyId) continue;
                    if (target.level >= caster.level) continue;
                    if (target.lastReceivedVeteransInsight) {
                         const lastReceived = target.lastReceivedVeteransInsight.toDate();
                         const now = new Date();
                         if (now.getTime() - lastReceived.getTime() < 24 * 60 * 60 * 1000) {
                            continue;
                         }
                    }

                    // If valid, apply effects
                    const newXp = (target.xp || 0) + xpToAward;
                    const levelUpdates = handleLevelChange(target, newXp, levelingTable);
                    const finalUpdates = { ...levelUpdates, lastReceivedVeteransInsight: serverTimestamp() };
                    
                    transaction.update(targetSnap.ref, finalUpdates);
                    
                    awardedCount++;
                    targetNames.push(target.characterName);
                }

                if (awardedCount === 0) {
                    throw new Error("No eligible targets found for the buff. MP was not consumed.");
                }

                // 3. Apply cost and cooldown to caster
                transaction.update(casterRef, { 
                    mp: increment(-dynamicCost),
                    lastUsedVeteransInsight: serverTimestamp(),
                });
                
                await logAvatarEvent(teacherUid, casterUid, { source: 'Spell', reason: `Cast ${powerName} on ${targetNames.join(', ')}.` });

                return { success: true, message: `You bestowed Veteran's Insight upon ${awardedCount} companion(s), granting each ${xpToAward} XP!` };
            }

            throw new Error("This power's effect cannot be resolved outside of battle.");
        });
    } catch (error: any) {
        console.error("Error using out-of-combat power:", error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}
