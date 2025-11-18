
'use server';

import { doc, runTransaction, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { ArmorPiece } from '@/lib/forge';
import { logGameEvent } from '@/lib/gamelog';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface PurchaseArmorInput {
    teacherUid: string;
    studentUid: string;
    armorId: string;
}

export async function purchaseArmor(input: PurchaseArmorInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, armorId } = input;
    if (!teacherUid || !studentUid || !armorId) return { success: false, error: 'Invalid input.' };

    try {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        const armorRef = doc(db, 'armorPieces', armorId);

        return await runTransaction(db, async (transaction) => {
            const studentSnap = await transaction.get(studentRef);
            const armorSnap = await transaction.get(armorRef);

            if (!studentSnap.exists()) throw new Error("Student not found.");
            if (!armorSnap.exists()) throw new Error("Armor not found.");

            const student = studentSnap.data() as Student;
            const armor = { id: armorSnap.id, ...armorSnap.data() } as ArmorPiece;
            
            // --- SERVER-SIDE VALIDATION ---
            if (student.ownedArmorIds?.includes(armor.id)) {
                return { success: false, error: "You already own this item." };
            }
            if (student.gold < armor.goldCost) {
                return { success: false, error: "You don't have enough gold!" };
            }
            if (student.level < armor.levelRequirement) {
                return { success: false, error: `You must be level ${armor.levelRequirement} to purchase this.` };
            }
            if (armor.classRequirement !== 'Any' && student.class !== armor.classRequirement) {
                return { success: false, error: `This item can only be used by a ${armor.classRequirement}.` };
            }

            // --- PERFORM PURCHASE ---
            const newGold = student.gold - armor.goldCost;

            transaction.update(studentRef, { 
                gold: newGold,
                ownedArmorIds: arrayUnion(armor.id)
            });
            
            await logGameEvent(teacherUid, 'GAMEMASTER', `${student.characterName} purchased the armor piece: ${armor.name}.`);

            return { success: true, message: `You have successfully purchased ${armor.name}!` };
        });
    } catch (error: any) {
        console.error("Error purchasing armor:", error);
        return { success: false, error: error.message || 'Failed to complete purchase.' };
    }
}
