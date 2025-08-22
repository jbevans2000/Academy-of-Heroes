
'use server';
/**
 * @fileOverview A server-side flow for managing global application settings.
 * This is for admin use only.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Settings {
    isRegistrationOpen: boolean;
    isFeedbackPanelVisible?: boolean;
}

const settingsRef = doc(db, 'settings', 'global');

/**
 * Retrieves the current global settings for the application.
 * @returns {Promise<Settings>} A promise that resolves to the settings object.
 */
export async function getGlobalSettings(): Promise<Settings> {
    try {
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Provide default for new setting if it doesn't exist
            return {
                isRegistrationOpen: data.isRegistrationOpen ?? true,
                isFeedbackPanelVisible: data.isFeedbackPanelVisible ?? false,
            };
        }
        // Default to registration being open if the document doesn't exist
        return { isRegistrationOpen: true, isFeedbackPanelVisible: false };
    } catch (error) {
        console.error("Error fetching global settings:", error);
        // Fail-safe default
        return { isRegistrationOpen: true, isFeedbackPanelVisible: false };
    }
}

/**
 * Updates the global application settings.
 * @param {Partial<Settings>} newSettings - An object containing the settings to update.
 * @returns {Promise<{success: boolean, error?: string}>} A promise that resolves to a success status.
 */
export async function updateGlobalSettings(newSettings: Partial<Settings>): Promise<{success: boolean, error?: string}> {
    try {
        await setDoc(settingsRef, newSettings, { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating global settings:", error);
        return { success: false, error: error.message };
    }
}
