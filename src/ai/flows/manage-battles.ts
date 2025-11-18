

'use server';
/**
 * @fileOverview Server-side functions for managing live battle state.
 */
import { collection, deleteDoc, doc, getDocs, writeBatch, deleteField } from 'firebase/firestore';
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
        // Clear all temporary battle-related fields from all students
        const studentsRef = collection(db, 'teachers', teacherUid, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        if (!studentsSnapshot.empty) {
            studentsSnapshot.forEach(studentDoc => {
                // This comprehensively resets any lingering battle statuses on the student document.
                batch.update(studentDoc.ref, {
                    inBattle: false,
                    guardedBy: deleteField(),
                    shielded: deleteField(),
                    damageShield: deleteField()
                });
            });
        }
        
        // List of subcollections to delete from the live battle document
        const subcollectionsToDelete = ['responses', 'powerActivations', 'battleLog', 'messages'];
        
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
