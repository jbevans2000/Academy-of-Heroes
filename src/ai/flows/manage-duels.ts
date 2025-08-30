
'use server';
/**
 * @fileOverview Server-side functions for managing duel question sections.
 */
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DuelSettings } from '@/lib/duels';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// === SECTION MANAGEMENT ===

interface CreateSectionInput {
    teacherUid: string;
    name: string;
}

export async function createDuelSection(input: CreateSectionInput): Promise<ActionResponse> {
    if (!input.teacherUid || !input.name.trim()) {
        return { success: false, error: 'Invalid input.' };
    }
    try {
        const sectionsRef = collection(db, 'teachers', input.teacherUid, 'duelQuestionSections');
        await addDoc(sectionsRef, {
            name: input.name,
            questionCount: 0,
            isActive: false, // Default to inactive
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error creating duel section:', error);
        return { success: false, error: error.message || 'Failed to create section.' };
    }
}

interface UpdateSectionInput {
    teacherUid: string;
    sectionId: string;
    name: string;
}

export async function updateDuelSection(input: UpdateSectionInput): Promise<ActionResponse> {
    if (!input.teacherUid || !input.sectionId || !input.name.trim()) {
        return { success: false, error: 'Invalid input.' };
    }
    try {
        const sectionRef = doc(db, 'teachers', input.teacherUid, 'duelQuestionSections', input.sectionId);
        await updateDoc(sectionRef, { name: input.name });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating duel section:', error);
        return { success: false, error: error.message || 'Failed to update section.' };
    }
}

interface DeleteSectionInput {
    teacherUid: string;
    sectionId: string;
}

export async function deleteDuelSection(input: DeleteSectionInput): Promise<ActionResponse> {
    if (!input.teacherUid || !input.sectionId) {
        return { success: false, error: 'Invalid input.' };
    }
    try {
        const batch = writeBatch(db);
        const sectionRef = doc(db, 'teachers', input.teacherUid, 'duelQuestionSections', input.sectionId);
        
        // Also delete all questions within this section
        const questionsRef = collection(sectionRef, 'questions');
        const questionsSnapshot = await getDocs(questionsRef);
        questionsSnapshot.forEach(doc => batch.delete(doc.ref));

        batch.delete(sectionRef);
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting duel section:', error);
        return { success: false, error: error.message || 'Failed to delete section.' };
    }
}


interface ToggleSectionActiveInput {
    teacherUid: string;
    sectionId: string;
    isActive: boolean;
}

export async function toggleDuelSectionActive(input: ToggleSectionActiveInput): Promise<ActionResponse> {
    if (!input.teacherUid || !input.sectionId) {
        return { success: false, error: 'Invalid input.' };
    }
    try {
        const sectionRef = doc(db, 'teachers', input.teacherUid, 'duelQuestionSections', input.sectionId);
        await updateDoc(sectionRef, { isActive: input.isActive });
        return { success: true };
    } catch (error: any) {
        console.error('Error toggling section active state:', error);
        return { success: false, error: error.message || 'Failed to update section state.' };
    }
}

interface DeactivateAllInput {
    teacherUid: string;
}

export async function deactivateAllDuelSections(input: DeactivateAllInput): Promise<ActionResponse> {
     if (!input.teacherUid) return { success: false, error: 'Invalid input.' };
     try {
         const sectionsRef = collection(db, 'teachers', input.teacherUid, 'duelQuestionSections');
         const snapshot = await getDocs(sectionsRef);
         if (snapshot.empty) return { success: true };

         const batch = writeBatch(db);
         snapshot.forEach(doc => {
             batch.update(doc.ref, { isActive: false });
         });
         await batch.commit();
         return { success: true };
     } catch (error: any) {
         console.error('Error deactivating all sections:', error);
         return { success: false, error: error.message || 'Failed to deactivate sections.' };
     }
}

// === SETTINGS MANAGEMENT ===

export async function getDuelSettings(teacherUid: string): Promise<DuelSettings> {
    const teacherRef = doc(db, 'teachers', teacherUid);
    const teacherSnap = await getDoc(teacherRef);
    if (teacherSnap.exists()) {
        const data = teacherSnap.data();
        return data.duelSettings || { rewardXp: 25, rewardGold: 10 };
    }
    return { rewardXp: 25, rewardGold: 10 }; // Default values
}

interface UpdateDuelSettingsInput {
    teacherUid: string;
    settings: DuelSettings;
}

export async function updateDuelSettings(input: UpdateDuelSettingsInput): Promise<ActionResponse> {
    if (!input.teacherUid) return { success: false, error: 'User not authenticated.' };
    try {
        const teacherRef = doc(db, 'teachers', input.teacherUid);
        await updateDoc(teacherRef, { duelSettings: input.settings });
        return { success: true, message: 'Duel settings updated.' };
    } catch (error: any) {
        console.error("Error updating duel settings:", error);
        return { success: false, error: error.message || 'Failed to update settings.' };
    }
}
