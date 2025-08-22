
'use server';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Records a boon transaction to the log.
 * @param teacherUid The UID of the teacher.
 * @param studentUid The UID of the student.
 * @param characterName The character name of the student.
 * @param boonName The name of the boon.
 * @param transactionType 'purchase' or 'use'.
 * @param cost Optional cost for purchase transactions.
 */
export async function logBoonTransaction(
    teacherUid: string, 
    studentUid: string,
    characterName: string, 
    boonName: string, 
    transactionType: 'purchase' | 'use',
    cost?: number
): Promise<void> {
    if (!teacherUid) {
        console.error("Failed to log boon transaction: teacherUid is missing.");
        return;
    }
    try {
        const transactionData: any = {
            studentUid,
            characterName,
            boonName,
            transactionType,
            timestamp: serverTimestamp(),
        };

        if (transactionType === 'purchase' && cost !== undefined) {
            transactionData.cost = cost;
        }

        await addDoc(collection(db, 'teachers', teacherUid, 'boonTransactions'), transactionData);
    } catch (error) {
        console.error("Failed to write to boon transaction log:", { error });
    }
}
