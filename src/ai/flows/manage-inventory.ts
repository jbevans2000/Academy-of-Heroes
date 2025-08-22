
'use server';

import { doc, runTransaction, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { Boon } from '@/lib/boons';
import { logGameEvent } from '@/lib/gamelog';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface PurchaseBoonInput {
    teacherUid: string;
    studentUid: string;
    boonId: string;
}

export async function purchaseBoon(input: PurchaseBoonInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, boonId } = input;
    if (!teacherUid || !studentUid || !boonId) return { success: false, error: 'Invalid input.' };

    try {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        const boonRef = doc(db, 'teachers', teacherUid, 'boons', boonId);

        return await runTransaction(db, async (transaction) => {
            const studentSnap = await transaction.get(studentRef);
            const boonSnap = await transaction.get(boonRef);

            if (!studentSnap.exists()) throw new Error("Student not found.");
            if (!boonSnap.exists()) throw new Error("Boon not found.");

            const student = studentSnap.data() as Student;
            const boon = { id: boonSnap.id, ...boonSnap.data() } as Boon;

            if (student.gold < boon.cost) {
                return { success: false, error: "You don't have enough gold!" };
            }
            
            if (student.inventory?.includes(boonId)) {
                return { success: false, error: "You already own this boon." };
            }

            const newGold = student.gold - boon.cost;

            transaction.update(studentRef, { 
                gold: newGold,
                inventory: arrayUnion(boonId)
            });

            await logGameEvent(teacherUid, 'GAMEMASTER', `${student.characterName} purchased the boon: ${boon.name}.`);

            return { success: true, message: `You have successfully purchased ${boon.name}!` };
        });
    } catch (error: any) {
        console.error("Error purchasing boon:", error);
        return { success: false, error: error.message || 'Failed to complete purchase.' };
    }
}


interface UseBoonInput {
    teacherUid: string;
    studentUid: string;
    boonId: string;
}

export async function useBoon(input: UseBoonInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, boonId } = input;

    try {
         const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
         const boonRef = doc(db, 'teachers', teacherUid, 'boons', boonId);

         return await runTransaction(db, async (transaction) => {
            const studentSnap = await transaction.get(studentRef);
            const boonSnap = await transaction.get(boonRef);

            if (!studentSnap.exists()) throw new Error("Student not found.");
            if (!boonSnap.exists()) throw new Error("Boon not found.");

            const student = studentSnap.data() as Student;
            const boon = { id: boonSnap.id, ...boonSnap.data() } as Boon;

            if (!student.inventory?.includes(boonId)) {
                return { success: false, error: "You don't own this boon." };
            }

            // Apply effect
            switch (boon.effect.type) {
                case 'BACKGROUND_CHANGE':
                    transaction.update(studentRef, { backgroundUrl: boon.effect.value });
                    break;
                default:
                    throw new Error("Unknown boon effect type.");
            }

            // Remove from inventory after use
            transaction.update(studentRef, {
                inventory: arrayRemove(boonId)
            });
            
            await logGameEvent(teacherUid, 'GAMEMASTER', `${student.characterName} used the boon: ${boon.name}.`);

            return { success: true, message: `${boon.name} has been used!` };
         });
    } catch (error: any) {
        console.error("Error using boon:", error);
        return { success: false, error: error.message || 'Failed to use boon.' };
    }
}
