
'use server';

import { doc, runTransaction, getDoc, updateDoc, deleteField, addDoc, collection, serverTimestamp } from 'firebase/firestore';
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

            if (boon.requiresApproval) {
                // Create a pending request instead of completing the purchase
                const pendingRequestsRef = collection(db, 'teachers', teacherUid, 'pendingBoonRequests');
                transaction.set(doc(pendingRequestsRef), {
                    studentUid,
                    studentName: student.studentName,
                    characterName: student.characterName,
                    boonId: boon.id,
                    boonName: boon.name,
                    cost: boon.cost,
                    requestedAt: serverTimestamp(),
                });
                return { success: true, message: `Your request to purchase "${boon.name}" has been sent to the Guild Leader for approval!` };
            } else {
                // If no approval is needed, process the purchase immediately
                const newGold = student.gold - boon.cost;
                const currentQuantity = student.inventory?.[boonId] || 0;
                const newQuantity = currentQuantity + 1;

                transaction.update(studentRef, { 
                    gold: newGold,
                    [`inventory.${boonId}`]: newQuantity
                });
                
                await logGameEvent(teacherUid, 'GAMEMASTER', `${student.characterName} purchased the boon: ${boon.name}.`);

                return { success: true, message: `You have successfully purchased ${boon.name}!` };
            }
        });
    } catch (error: any) {
        console.error("Error purchasing boon:", error);
        return { success: false, error: error.message || 'Failed to complete purchase.' };
    }
}
