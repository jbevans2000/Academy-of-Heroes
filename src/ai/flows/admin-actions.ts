/**
 * SACROSANCT: DO NOT TOUCH
 * This file uses the Firebase Admin SDK and its logic has been confirmed to be correct.
 * DO NOT MODIFY this file or any functions within it under any circumstances.
 */

'use server';
/**
 * @fileOverview A secure, server-side flow for admin-only actions like deleting users.
 */
import { doc, writeBatch, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin'; // Use lazy getter
import { db } from '@/lib/firebase'; // Client-side for batch writes

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// This function now handles both Firestore data deletion AND Auth account deletion.
export async function deleteStudentData({ teacherUid, studentUid }: { teacherUid: string, studentUid: string }): Promise<ActionResponse> {
    if (!teacherUid || !studentUid) {
        return { success: false, error: "Teacher and Student UIDs are required." };
    }
    
    try {
        // Firestore data deletion
        const batch = writeBatch(db);
        const subcollections = ['messages', 'avatarLog'];
        for (const sub of subcollections) {
            const subRef = collection(db, `teachers/${teacherUid}/students/${studentUid}/${sub}`);
            const snapshot = await getDocs(subRef);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        batch.delete(studentRef);
        const globalStudentRef = doc(db, 'students', studentUid);
        batch.delete(globalStudentRef);
        await batch.commit();
        
        // Firebase Auth user deletion
        const adminAuth = getAdminAuth();
        await adminAuth.deleteUser(studentUid);
        
        return { success: true, message: "Student data and account have been deleted." };

    } catch (error: any) {
        console.error("Error deleting student data and auth user:", error);
        // Provide more specific error messages
        if (error.code === 'auth/user-not-found') {
            return { success: false, error: 'The student\'s login account was not found, but their game data has been deleted. Please remove them manually from the Firebase Authentication console.' };
        }
        return { success: false, error: error.message || 'An unknown error occurred during the deletion process.' };
    }
}


// This function uses the Admin SDK and is intended for a secure server environment.
// It will attempt to delete the auth user and their firestore data.
export async function deleteTeacher(teacherUid: string): Promise<ActionResponse> {
    if (!teacherUid) {
        return { success: false, error: "Teacher UID is required." };
    }

    try {
        const adminDb = getAdminDb(); // Get DB instance when needed
        
        // --- New Step: Find and delete co-teachers ---
        const coTeachersQuery = query(collection(db, 'teachers'), where('mainTeacherUid', '==', teacherUid));
        const coTeachersSnapshot = await getDocs(coTeachersQuery);

        if (!coTeachersSnapshot.empty) {
            console.log(`Found ${coTeachersSnapshot.size} co-teacher(s) to delete for main teacher ${teacherUid}.`);
            for (const coTeacherDoc of coTeachersSnapshot.docs) {
                // Recursively call this function to delete the co-teacher and their associated data.
                // This is safe because co-teachers cannot have their own co-teachers.
                await deleteTeacher(coTeacherDoc.id);
            }
        }
        // --- End of new step ---

        const batch = writeBatch(db);
        const subcollections = [
            'students', 'pendingStudents', 'questHubs', 'chapters', 'bossBattles',
            'savedBattles', 'groupBattleSummaries', 'boons', 'pendingBoonRequests',
            'boonTransactions', 'gameLog', 'wheelOfFateEvents', 'duelQuestionSections',
            'companies', 'missions', 'guildHallMessages'
        ];
        
        for (const subcollection of subcollections) {
            const subcollectionRef = collection(db, `teachers/${teacherUid}/${subcollection}`);
            const snapshot = await getDocs(subcollectionRef);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        
        batch.delete(doc(db, 'teachers', teacherUid));
        
        await batch.commit();
        
        // This part uses the Admin SDK and might still fail if not configured,
        // but the data deletion will have already succeeded.
        try {
            await adminDb.collection('deleted-users').doc(teacherUid).set({ deletionRequested: true });
        } catch (adminError) {
             console.warn("Admin SDK action failed, but data was deleted. Manual auth cleanup may be needed.", adminError);
        }

        return { success: true, message: "Teacher data has been deleted. Their login account will be removed upon their next login attempt." };
    } catch (error: any) {
        console.error("Error deleting teacher data:", error);
        return { success: false, error: error.message || 'An unknown error occurred while deleting the teacher data.' };
    }
}


interface ArchiveStudentInput {
    teacherUid: string;
    studentUid: string;
}

// This function ARCHIVES the student document, marking it for full deletion
// by the student on their next login. This is a client-side compatible action.
export async function archiveStudentForDeletion({ teacherUid, studentUid }: ArchiveStudentInput): Promise<ActionResponse> {
     if (!teacherUid || !studentUid) {
        return { success: false, error: "Teacher and Student UIDs are required." };
    }
    
    try {
        const studentRef = doc(db, `teachers/${teacherUid}/students/${studentUid}`);
        await updateDoc(studentRef, { isArchived: true });
        
        return { success: true, message: "Student has been archived. Their data and account will be permanently deleted upon their next login attempt." };

    } catch (error: any) {
        console.error("Error archiving student data:", error);
        return { success: false, error: error.message || 'An unknown error occurred while archiving the student data.' };
    }
}
