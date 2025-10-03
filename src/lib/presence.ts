
'use server';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Updates a student's online status.
 * For 'offline' status, it uses `navigator.sendBeacon` if available to ensure the
 * request is sent even if the page is unloading. For 'online', it uses a standard
 * Firestore set operation.
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

    // For 'offline' on page unload, beacon is more reliable.
    if (status === 'offline' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const url = '/api/presence';
        const data = JSON.stringify({ teacherUid, studentUid, status });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
    }

    // For 'online' or environments without beacon, use standard Firestore SDK.
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
        console.error("Failed to update presence via Firestore SDK:", {
            teacherUid,
            studentUid,
            status,
            error,
        });
    }
}
