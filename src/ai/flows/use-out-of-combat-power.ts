
'use server';

import { doc, runTransaction, increment, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { outOfCombatPowers } from '@/lib/out-of-combat-powers';
import { logAvatarEvent } from '@/lib/avatar-log';

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
            if (caster.mp < power.mpCost && power.name !== 'Psychic Flare') throw new Error("Not enough MP to cast this spell.");

            // --- Server-side validation and effect logic ---

            // HEALER
            if (powerName === 'Lesser Heal' || powerName === 'Focused Restoration') {
                const targetUids = targets;
                if (!targetUids || targetUids.length === 0) throw new Error("No targets selected.");
                if (targetUids.length > (power.targetCount || 1)) throw new Error("Too many targets selected.");

                const targetRefs = targetUids.map(uid => doc(db, 'teachers', teacherUid, 'students', uid));
                const targetSnaps = await Promise.all(targetRefs.map(ref => transaction.get(ref)));
                
                transaction.update(casterRef, { mp: increment(-power.mpCost) });
                
                let totalHealed = 0;
                const healAmount = powerName === 'Lesser Heal'
                    ? rollDie(6) + caster.level
                    : rollDie(8) + rollDie(8) + rollDie(8) + caster.level;

                const healPerTarget = Math.ceil(healAmount / targetUids.length);
                
                targetSnaps.forEach((targetSnap, index) => {
                    if (!targetSnap.exists()) return; 
                    const target = targetSnap.data() as Student;
                    if (target.hp >= target.maxHp) return;

                    const newHp = Math.min(target.maxHp, target.hp + healPerTarget);
                    totalHealed += (newHp - target.hp);
                    transaction.update(targetRefs[index], { hp: newHp });
                });
                
                await logAvatarEvent(teacherUid, casterUid, { source: 'Spell', reason: `Cast ${powerName}` });
                return { success: true, message: `You cast ${powerName}, restoring a total of ${totalHealed} HP.` };
            }
            
            // MAGE
            if (powerName === 'Psionic Aura') {
                 if (!targets || targets.length === 0) throw new Error("No targets selected.");
                 
                 const targetRefs = targets.map(uid => doc(db, 'teachers', teacherUid, 'students', uid));
                 const targetSnaps = await Promise.all(targetRefs.map(ref => transaction.get(ref)));

                 transaction.update(casterRef, { mp: increment(-power.mpCost) });

                 const totalRestore = rollDie(6) + caster.level;
                 const restorePerTarget = Math.ceil(totalRestore / targets.length);

                 targetSnaps.forEach((targetSnap, index) => {
                     if (!targetSnap.exists()) return;
                     const target = targetSnap.data() as Student;
                     if (target.mp >= target.maxMp) return;
                     const newMp = Math.min(target.maxMp, target.mp + restorePerTarget);
                     transaction.update(targetRefs[index], { mp: newMp });
                 });

                 await logAvatarEvent(teacherUid, casterUid, { source: 'Spell', reason: `Cast ${powerName}` });
                 return { success: true, message: `You cast ${powerName}, restoring magical energy to your allies.` };
            }

            if (powerName === 'Psychic Flare') {
                 if (!targets || targets.length !== 1) throw new Error("Must select exactly one target.");
                 const targetUid = targets[0];
                 const targetRef = doc(db, 'teachers', teacherUid, 'students', targetUid);
                 const targetSnap = await transaction.get(targetRef);

                 if (!targetSnap.exists()) throw new Error("Target not found.");
                 const targetData = targetSnap.data() as Student;
                 
                 // Cost is 50% of the CASTER's current MP
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

            // GUARDIAN
            if (powerName === 'Absorb') {
                const hpToConvert = inputValue || 0;
                if (hpToConvert <= 0 || hpToConvert >= caster.hp) {
                    throw new Error("Invalid HP amount to convert.");
                }

                const mpGained = Math.floor(hpToConvert / 2);
                transaction.update(casterRef, {
                    hp: increment(-hpToConvert),
                    mp: increment(mpGained)
                });
                
                await logAvatarEvent(teacherUid, casterUid, { source: 'Spell', reason: `Cast ${powerName}` });
                
                return { success: true, message: `You converted ${hpToConvert} HP into ${mpGained} MP!` };
            }

            throw new Error("This power's effect cannot be resolved outside of battle.");
        });
    } catch (error: any) {
        console.error("Error using out-of-combat power:", error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}
