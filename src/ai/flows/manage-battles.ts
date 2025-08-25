

'use server';
/**
 * @fileOverview Server-side functions for managing live battle state.
 */
import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActionResponse {
    success: boolean;
    error?: string;
}

export async function cleanupLiveBattle(teacherUid: string): Promise<ActionResponse> {
    if (!teacherUid) {
        return { success: false, error: "Teacher UID is required." };
    }

    const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
    const batch = writeBatch(db);

    try {
        // Clear student 'inBattle' flags
        const studentsInBattleQuery = collection(db, 'teachers', teacherUid, 'students');
        const studentsSnapshot = await getDocs(studentsInBattleQuery);
        if (!studentsSnapshot.empty) {
            studentsSnapshot.forEach(studentDoc => {
                if (studentDoc.data().inBattle) {
                     batch.update(studentDoc.ref, { inBattle: false });
                }
            });
        }
        
        // List of subcollections to delete
        const subcollectionsToDelete = ['responses', 'powerActivations', 'battleLog', 'messages'];
        
        // Delete all documents in each subcollection
        for (const subcollection of subcollectionsToDelete) {
            const subcollectionRef = collection(liveBattleRef, subcollection);
            const snapshot = await getDocs(subcollectionRef);
            if (!snapshot.empty) {
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
            }
        }
        
        // Finally, delete the main `active-battle` document
        batch.delete(liveBattleRef);

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error during live battle cleanup:", error);
        return { success: false, error: error.message || 'Failed to cleanup live battle data.' };
    }
}
