/**
 * SACROSANCT: DO NOT TOUCH
 * This file uses the Firebase Admin SDK and its logic has been confirmed to be correct.
 * DO NOT MODIFY this file or any functions within it under any circumstances.
 */

'use server';
/**
 * @fileOverview A server-side flow for finding and deleting orphaned Firebase Authentication accounts.
 */
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export interface OrphanedAccount {
    uid: string;
    email: string;
}

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  orphanedTeachers?: OrphanedAccount[];
  orphanedStudents?: OrphanedAccount[];
}

export async function findOrphanedAccounts(): Promise<ActionResponse> {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        const listUsersResult = await adminAuth.listUsers(1000);
        const allAuthUsers = listUsersResult.users;

        const teachersSnapshot = await adminDb.collection('teachers').get();
        const teacherUids = new Set(teachersSnapshot.docs.map(doc => doc.id));

        const studentsSnapshot = await adminDb.collection('students').get();
        const studentUids = new Set(studentsSnapshot.docs.map(doc => doc.id));

        const orphanedTeachers: OrphanedAccount[] = [];
        const orphanedStudents: OrphanedAccount[] = [];
        const adminUids = new Set(['idl6dc7GX1UWUf6FJcn2XdZ2Hpp2']); // Your admin UID

        for (const userRecord of allAuthUsers) {
            // Assume if it's not a teacher, it must be a student for this check.
            // Also explicitly ignore the known admin UID.
            if (!adminUids.has(userRecord.uid)) {
                if (userRecord.email?.includes('@academy-heroes-mziuf.firebaseapp.com')) {
                    // Likely a student who signed up with a username
                    if (!studentUids.has(userRecord.uid)) {
                        orphanedStudents.push({ uid: userRecord.uid, email: userRecord.email || 'No Email' });
                    }
                } else {
                    // Could be a teacher or a student with a real email
                    if (!teacherUids.has(userRecord.uid) && !studentUids.has(userRecord.uid)) {
                       // To differentiate, we can make an assumption or leave it ambiguous.
                       // For now, let's assume non-aliased emails are more likely teachers if orphaned.
                       orphanedTeachers.push({ uid: userRecord.uid, email: userRecord.email || 'No Email' });
                    }
                }
            }
        }
        
        return { success: true, orphanedTeachers, orphanedStudents };
        
    } catch (error: any) {
        console.error("Error finding orphaned accounts:", error);
        return { success: false, error: error.message || 'An unknown server error occurred.' };
    }
}

export async function deleteOrphanedUser(uid: string): Promise<{ success: boolean, error?: string }> {
    try {
        const adminAuth = getAdminAuth();
        await adminAuth.deleteUser(uid);
        return { success: true };
    } catch (error: any) {
        console.error(`Error deleting user ${uid}:`, error);
        return { success: false, error: error.message || 'Failed to delete user.' };
    }
}
