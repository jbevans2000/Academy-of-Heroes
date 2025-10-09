
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActionResponse {
  success: boolean;
  error?: string;
}

const knownBugsRef = doc(db, 'settings', 'known_bugs');

/**
 * Retrieves the content for the known bugs list from Firestore.
 * @returns {Promise<string>} The text content of the list.
 */
export async function getKnownBugsContent(): Promise<string> {
    try {
        const docSnap = await getDoc(knownBugsRef);
        if (docSnap.exists()) {
            return docSnap.data().content || '';
        }
        return '';
    } catch (error) {
        console.error("Error fetching known bugs content:", error);
        return "Error loading content.";
    }
}

/**
 * Updates the content of the known bugs list in Firestore.
 * @param {string} newContent - The new text content to save.
 * @returns {Promise<ActionResponse>} A success or error status.
 */
export async function updateKnownBugsContent(newContent: string): Promise<ActionResponse> {
    try {
        await setDoc(knownBugsRef, { content: newContent });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating known bugs content:", error);
        return { success: false, error: error.message || "Failed to save content." };
    }
}
