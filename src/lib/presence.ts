
'use server';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Updates a student's online status in the centralized presence document.
 * This is designed to be a "fire-and-forget" operation from the client.
 *
 * @param teacherUid The UID of the teacher for the class.
 * @param studentUid The UID of the student whose status is being updated.
 * @param status The new status, either 'online' or 'offline'.
 */
export async function updatePresence(
    teacherUid: string, 
    studentUid: string,
    status: 'online' | 'offline'
): Promise<void> {
    if (!teacherUid || !studentUid) {
        console.error("Failed to update presence: teacherUid or studentUid is missing.");
        return;
    }
    try {
        const presenceRef = doc(db, 'teachers', teacherUid, 'presence', 'online');

        await setDoc(presenceRef, {
            onlineStatus: {
                [studentUid]: {
                    status: status,
                    lastSeen: serverTimestamp(),
                }
            }
        }, { merge: true });

    } catch (error) {
        console.error("Failed to update presence:", {
            teacherUid,
            studentUid,
            status,
            error,
        });
        // We catch the error so that a failure in logging presence does not
        // break the primary application functionality.
    }
}
