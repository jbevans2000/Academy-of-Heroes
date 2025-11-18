
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActionResponse {
  success: boolean;
  error?: string;
}

const upcomingFeaturesRef = doc(db, 'settings', 'upcoming_features');

/**
 * Retrieves the content for the upcoming features list from Firestore.
 * @returns {Promise<string>} The text content of the list.
 */
export async function getUpcomingFeaturesContent(): Promise<string> {
    try {
        const docSnap = await getDoc(upcomingFeaturesRef);
        if (docSnap.exists()) {
            return docSnap.data().content || '';
        }
        return '';
    } catch (error) {
        console.error("Error fetching upcoming features content:", error);
        return "Error loading content.";
    }
}

/**
 * Updates the content of the upcoming features list in Firestore.
 * @param {string} newContent - The new text content to save.
 * @returns {Promise<ActionResponse>} A success or error status.
 */
export async function updateUpcomingFeaturesContent(newContent: string): Promise<ActionResponse> {
    try {
        await setDoc(upcomingFeaturesRef, { content: newContent });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating upcoming features content:", error);
        return { success: false, error: error.message || "Failed to save content." };
    }
}
