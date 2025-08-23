
'use server';
/**
 * @fileOverview A server-side flow for managing student accounts and data.
 * This file should NOT use the Genkit AI library, as it performs administrative actions.
 *
 * - updateStudentDetails: Updates a student's name in Firestore.
 * - resetStudentPassword: Resets a student's password in Firebase Auth.
 * - moderateStudent: Bans, unbans, or deletes a student's account.
 * - getStudentStatus: Fetches the enabled/disabled status of a student's account.
 * - clearGameLog: Deletes all entries from the game log.
 */
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';

// Initialize the Firebase Admin App
getFirebaseAdminApp();

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface UpdateDetailsInput {
  teacherUid: string;
  studentUid: string;
  studentName: string;
  characterName: string;
}

export async function updateStudentDetails(input: UpdateDetailsInput): Promise<ActionResponse> {
  try {
    const studentRef = doc(db, 'teachers', input.teacherUid, 'students', input.studentUid);
    await updateDoc(studentRef, {
      studentName: input.studentName,
      characterName: input.characterName,
    });
    return { success: true };
  } catch (e: any) {
    console.error("Error in updateStudentDetails:", e);
    return { success: false, error: e.message || 'Failed to update student details in Firestore.' };
  }
}

interface ResetPasswordInput {
  teacherUid: string;
  studentUid: string;
  newPassword: string;
}

export async function resetStudentPassword(input: ResetPasswordInput): Promise<ActionResponse> {
  if (input.newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  try {
    const auth = getAuth(getFirebaseAdminApp());
    await auth.updateUser(input.studentUid, {
      password: input.newPassword,
    });
    return { success: true };
  } catch (e: any) {
    console.error("Error in resetStudentPassword:", e);
    return { success: false, error: e.message || 'Failed to reset password in Firebase Authentication.' };
  }
}

interface ModerateStudentInput {
  teacherUid: string;
  studentUid: string;
  action: 'ban' | 'unban' | 'delete';
}

export async function moderateStudent(input: ModerateStudentInput): Promise<ActionResponse> {
  try {
    const auth = getAuth(getFirebaseAdminApp());
    switch (input.action) {
      case 'ban':
        await auth.updateUser(input.studentUid, { disabled: true });
        return { success: true, message: 'Student has been banned and cannot log in.' };
      case 'unban':
        await auth.updateUser(input.studentUid, { disabled: false });
        return { success: true, message: 'Student has been unbanned and can now log in.' };
      case 'delete':
        // This is a two-step process: delete from Auth, then from Firestore.
        await auth.deleteUser(input.studentUid);
        const studentRef = doc(db, 'teachers', input.teacherUid, 'students', input.studentUid);
        await deleteDoc(studentRef);
        return { success: true, message: 'Student has been permanently removed from the guild.' };
      default:
        return { success: false, error: 'Invalid moderation action.' };
    }
  } catch (e: any) {
    console.error("Error in moderateStudent:", e);
    return { success: false, error: e.message || 'Failed to perform moderation action.' };
  }
}

interface StudentStatusInput {
    studentUid: string;
}

interface StudentStatusResponse {
    isBanned: boolean;
}

export async function getStudentStatus(input: StudentStatusInput): Promise<StudentStatusResponse> {
    try {
        const auth = getAuth(getFirebaseAdminApp());
        const userRecord = await auth.getUser(input.studentUid);
        return { isBanned: userRecord.disabled };
    } catch (e: any) {
        console.error("Error fetching student status:", e);
        // If we can't fetch the user, assume they are not banned for UI purposes.
        // This could happen if the user was deleted but the Firestore record remains.
        return { isBanned: false };
    }
}

interface ClearLogInput {
  teacherUid: string;
}

export async function clearGameLog(input: ClearLogInput): Promise<ActionResponse> {
  try {
    const logCollectionRef = collection(db, 'teachers', input.teacherUid, 'gameLog');
    const logSnapshot = await getDocs(logCollectionRef);
    
    if (logSnapshot.empty) {
        return { success: true, message: 'Game log is already empty.' };
    }

    const batch = writeBatch(db);
    logSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    return { success: true, message: 'Game log cleared successfully.' };
  } catch (e: any) {
    console.error("Error in clearGameLog:", e);
    return { success: false, error: e.message || 'Failed to clear the game log.' };
  }
}
