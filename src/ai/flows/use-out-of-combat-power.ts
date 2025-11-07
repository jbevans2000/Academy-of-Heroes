
'use server';

import { doc, runTransaction, increment, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { classPowers, type Power } from '@/lib/powers';
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
            const casterRef = doc(db, 'teachers', teacherUid, 'students', casterUid);
            const casterSnap = await transaction.get(casterRef);
            if (!casterSnap.exists()) throw new Error("Caster not found.");
            const caster = casterSnap.data() as Student;

            const allPowers = Object.values(classPowers).flat();
            const power = allPowers.find(p => p.name === powerName);

            if (!power) throw new Error("Power not found.");
            if (!power.outOfCombat) throw new Error("This power cannot be used outside of combat.");
            if (caster.level < power.level) throw new Error("You have not learned this power yet.");
            if (caster.mp < power.mpCost) throw new Error("Not enough MP to cast this spell.");

            // --- Server-side validation and effect logic ---

            // HEALER
            if (powerName === 'Lesser Heal' || powerName === 'Focused Restoration') {
                const targetUids = targets;
                if (!targetUids || targetUids.length === 0) throw new Error("No targets selected.");
                if (targetUids.length > (power.targetCount || 1)) throw new Error("Too many targets selected.");

                let totalHealed = 0;
                const healAmount = powerName === 'Lesser Heal'
                    ? rollDie(6) + caster.level
                    : rollDie(8) + rollDie(8) + rollDie(8) + caster.level;

                const healPerTarget = Math.ceil(healAmount / targetUids.length);

                for (const targetUid of targetUids) {
                    const targetRef = doc(db, 'teachers', teacherUid, 'students', targetUid);
                    const targetSnap = await transaction.get(targetRef);
                    if (!targetSnap.exists()) continue; // Skip if target not found

                    const target = targetSnap.data() as Student;
                    if (target.hp >= target.maxHp) continue; // Skip if already full health
                    
                    const newHp = Math.min(target.maxHp, target.hp + healPerTarget);
                    totalHealed += (newHp - target.hp);
                    transaction.update(targetRef, { hp: newHp });
                }
                
                transaction.update(casterRef, { mp: increment(-power.mpCost) });
                await logAvatarEvent(teacherUid, casterUid, { source: 'Spell', reason: `Cast ${powerName}` });
                return { success: true, message: `You cast ${powerName}, restoring a total of ${totalHealed} HP.` };
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


            // If no specific logic matched, it's an invalid out-of-combat power.
            throw new Error("This power's effect cannot be resolved outside of battle.");
        });
    } catch (error: any) {
        console.error("Error using out-of-combat power:", error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}
