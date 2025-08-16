
'use server';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type LogCategory = 'BOSS_BATTLE' | 'CHAPTER' | 'ACCOUNT' | 'GAMEMASTER';

/**
 * Records an event to the game log collection in Firestore.
 * This is designed to be a "fire-and-forget" operation.
 * If it fails, it will log an error to the console but will not
 * disrupt the user-facing application flow.
 * @param category The category of the event for filtering.
 * @param description A human-readable string describing the event.
 */
export async function logGameEvent(category: LogCategory, description: string): Promise<void> {
    try {
        await addDoc(collection(db, 'gameLog'), {
            timestamp: serverTimestamp(),
            category,
            description,
        });
    } catch (error) {
        console.error("Failed to write to game log:", {
            category,
            description,
            error,
        });
        // We catch the error so that a failure in logging does not
        // break the primary application functionality.
    }
}
