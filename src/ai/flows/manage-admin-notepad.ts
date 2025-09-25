'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActionResponse {
  success: boolean;
  error?: string;
}

const notepadRef = doc(db, 'settings', 'admin_notepad');

/**
 * Retrieves the content for the admin notepad from Firestore.
 * @returns {Promise<string>} The text content of the notepad.
 */
export async function getAdminNotepadContent(): Promise<string> {
    try {
        const docSnap = await getDoc(notepadRef);
        if (docSnap.exists()) {
            return docSnap.data().content || '';
        }
        return '';
    } catch (error) {
        console.error("Error fetching notepad content:", error);
        return "Error loading content.";
    }
}

/**
 * Updates the content of the admin notepad in Firestore.
 * @param {string} newContent - The new text content to save.
 * @returns {Promise<ActionResponse>} A success or error status.
 */
export async function updateAdminNotepadContent(newContent: string): Promise<ActionResponse> {
    try {
        await setDoc(notepadRef, { content: newContent });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating notepad content:", error);
        return { success: false, error: error.message || "Failed to save content." };
    }
}
