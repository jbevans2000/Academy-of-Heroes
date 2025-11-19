/**
 * SACROSANCT: DO NOT TOUCH
 * This file uses the Firebase Admin SDK and its logic has been confirmed to be correct.
 * DO NOT MODIFY this file or any functions within it under any circumstances.
 */

'use server';
/**
 * @fileOverview A server-side flow for managing student accounts and data.
 * This file should NOT use the Genkit AI library, as it performs administrative actions.
 *
 * - updateStudentDetails: Updates a student's name in Firestore.
 * - resetStudentPassword: Resets a student's password in Firebase Auth.
 * - getStudentStatus: Fetches the enabled/disabled status of a student's account.
 */
import { doc, updateDoc, collection, getDocs, writeBatch, getDoc, runTransaction, arrayUnion, arrayRemove, setDoc, deleteField, query, where, Timestamp, increment, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';


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
  studentUid: string;
  newPassword: string;
}

export async function resetStudentPassword(input: ResetPasswordInput): Promise<ActionResponse> {
    if (input.newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    try {
        const adminAuth = getAdminAuth();
        await adminAuth.updateUser(input.studentUid, {
            password: input.newPassword,
        });
        return { success: true, message: "Password has been successfully reset." };
    } catch (e: any) {
        console.error("Error in resetStudentPassword:", e);
        if (e.code === 'auth/user-not-found') {
            return { success: false, error: 'Student authentication account not found.' };
        }
        return { success: false, error: e.message || 'Failed to reset password in Firebase Auth.' };
    }
}


interface UpdateNotesInput {
  teacherUid: string;
  studentUid: string;
  notes: string;
}

export async function updateStudentNotes(input: UpdateNotesInput): Promise<ActionResponse> {
  try {
    const studentRef = doc(db, 'teachers', input.teacherUid, 'students', input.studentUid);
    await updateDoc(studentRef, {
      teacherNotes: input.notes,
    });
    return { success: true };
  } catch (e: any) {
    console.error("Error in updateStudentNotes:", e);
    return { success: false, error: e.message || 'Failed to update student notes.' };
  }
}

interface ChampionStatusInput {
  teacherUid: string;
  studentUid: string;
  isChampion: boolean;
}

export async function setChampionStatus(input: ChampionStatusInput): Promise<ActionResponse> {
  const { teacherUid, studentUid, isChampion } = input;
  const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
  const championsRef = doc(db, 'teachers', teacherUid, 'champions', 'active');
  
  try {
    await runTransaction(db, async (transaction) => {
      const studentSnap = await transaction.get(studentRef);
      if (!studentSnap.exists()) {
          throw new Error("Student document not found.");
      }
      const studentData = studentSnap.data();
      const companyId = studentData.companyId;

      const championsSnap = await transaction.get(championsRef);
      const championsData = championsSnap.exists() ? championsSnap.data() : { championsByCompany: {}, freelancerChampions: [] };

      // Ensure fields exist before trying to access them
      championsData.championsByCompany = championsData.championsByCompany || {};
      championsData.freelancerChampions = championsData.freelancerChampions || [];


      // 1. Update the student's own document
      transaction.update(studentRef, { isChampion: isChampion });

      // 2. Remove the student from any list they might be in to prevent duplicates
      if (championsData.freelancerChampions.includes(studentUid)) {
          championsData.freelancerChampions = championsData.freelancerChampions.filter((uid: string) => uid !== studentUid);
      }
      for (const compId in championsData.championsByCompany) {
          if (championsData.championsByCompany[compId]?.includes(studentUid)) {
             championsData.championsByCompany[compId] = championsData.championsByCompany[compId].filter((uid: string) => uid !== studentUid);
          }
      }

      // 3. If becoming a champion, add them to the correct new list
      if (isChampion) {
          if (companyId) {
              if (!championsData.championsByCompany[companyId]) {
                  championsData.championsByCompany[companyId] = [];
              }
              championsData.championsByCompany[companyId].push(studentUid);
          } else {
              championsData.freelancerChampions.push(studentUid);
          }
      }
      
      // 4. Write the final, cleaned-up data back to Firestore.
      // Using set() handles both creation and update of the document.
      transaction.set(championsRef, championsData);
    });
    return { success: true };
  } catch (e: any) {
    console.error("Error in setChampionStatus:", e);
    return { success: false, error: e.message || 'Failed to update champion status.' };
  }
}

interface MeditationStatusInput {
  teacherUid: string;
  studentUid: string;
  isInMeditation: boolean;
  message?: string;
  durationInMinutes?: number;
  showTimer?: boolean;
}

export async function setMeditationStatus(input: MeditationStatusInput): Promise<ActionResponse> {
  const { teacherUid, studentUid, isInMeditation, message, durationInMinutes, showTimer } = input;
  try {
    const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
    const updates: any = {
      isInMeditationChamber: isInMeditation,
    };
    if (isInMeditation) {
      updates.meditationMessage = message;
      updates.meditationDuration = durationInMinutes || null;
      updates.meditationShowTimer = showTimer ?? false;
      if (durationInMinutes && durationInMinutes > 0) {
        updates.meditationReleaseAt = Timestamp.fromMillis(Date.now() + durationInMinutes * 60 * 1000);
      } else {
        updates.meditationReleaseAt = deleteField(); 
      }
    } else {
      updates.meditationMessage = deleteField();
      updates.meditationReleaseAt = deleteField();
      updates.meditationDuration = deleteField();
      updates.meditationShowTimer = deleteField();
    }
    await updateDoc(studentRef, updates);
    return { success: true };
  } catch (e: any) {
    console.error("Error setting meditation status:", e);
    return { success: false, error: 'Failed to update meditation status.' };
  }
}

interface BulkMeditationStatusInput {
    teacherUid: string;
    studentUids: string[];
    isInMeditation: boolean;
    message?: string;
    durationInMinutes?: number;
    showTimer?: boolean;
}

export async function setBulkMeditationStatus(input: BulkMeditationStatusInput): Promise<ActionResponse> {
    const { teacherUid, studentUids, isInMeditation, message, durationInMinutes, showTimer } = input;
    if (!studentUids || studentUids.length === 0) {
        return { success: false, error: "No students selected." };
    }

    try {
        const batch = writeBatch(db);
        const updates: any = {
            isInMeditationChamber: isInMeditation,
        };

        if (isInMeditation) {
            updates.meditationMessage = message;
            updates.meditationDuration = durationInMinutes || null;
            updates.meditationShowTimer = showTimer ?? false;
            if (durationInMinutes && durationInMinutes > 0) {
                updates.meditationReleaseAt = Timestamp.fromMillis(Date.now() + durationInMinutes * 60 * 1000);
            } else {
                updates.meditationReleaseAt = deleteField();
            }
        } else {
            updates.meditationMessage = deleteField();
            updates.meditationReleaseAt = deleteField();
            updates.meditationDuration = deleteField();
            updates.meditationShowTimer = deleteField();
        }

        studentUids.forEach(uid => {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', uid);
            batch.update(studentRef, updates);
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error setting bulk meditation status:", error);
        return { success: false, error: "Failed to update meditation status for the selected students." };
    }
}

export async function releaseAllFromMeditation(input: { teacherUid: string }): Promise<ActionResponse> {
    const { teacherUid } = input;
    try {
        const studentsRef = collection(db, 'teachers', teacherUid, 'students');
        const q = query(studentsRef, where('isInMeditationChamber', '==', true));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: true, message: 'No students were in the Meditation Chamber.' };
        }

        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.update(doc.ref, {
                isInMeditationChamber: false,
                meditationMessage: deleteField(),
                meditationReleaseAt: deleteField(),
                meditationDuration: deleteField(),
                meditationShowTimer: deleteField(),
            });
        });

        await batch.commit();
        return { success: true, message: `Released ${querySnapshot.size} student(s) from the Meditation Chamber.` };
    } catch (error: any) {
        console.error("Error releasing all students from meditation:", error);
        return { success: false, error: "An unexpected error occurred while releasing students." };
    }
}


interface ToggleVisibilityInput {
  teacherUid: string;
  studentUid: string;
  isHidden: boolean;
}

export async function toggleStudentVisibility(input: ToggleVisibilityInput): Promise<ActionResponse> {
  try {
    const studentRef = doc(db, 'teachers', input.teacherUid, 'students', input.studentUid);
    await updateDoc(studentRef, {
      isHidden: input.isHidden,
    });
    return { success: true };
  } catch (e: any) {
    console.error("Error in toggleStudentVisibility:", e);
    return { success: false, error: 'Failed to update student visibility.' };
  }
}

interface ForceLogoutInput {
  teacherUid: string;
  studentUid: string;
}

export async function forceStudentLogout(input: ForceLogoutInput): Promise<ActionResponse> {
  try {
    const studentRef = doc(db, 'teachers', input.teacherUid, 'students', input.studentUid);
    await updateDoc(studentRef, {
      forceLogout: true,
    });
    return { success: true, message: "The student will be logged out on their next action." };
  } catch (e: any) {
    console.error("Error setting forceLogout flag:", e);
    return { success: false, error: 'Failed to set logout flag.' };
  }
}

interface ShadowMarkInput {
  teacherUid: string;
  studentUid: string;
}

export async function addShadowMark(input: ShadowMarkInput): Promise<ActionResponse> {
    const { teacherUid, studentUid } = input;
    try {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        const studentSnap = await getDoc(studentRef);
        if (!studentSnap.exists()) throw new Error('Student not found.');
        
        const currentMarks = studentSnap.data().shadowMarks || 0;
        if (currentMarks >= 3) return { success: false, error: 'Student already has the maximum number of Shadow Marks.' };

        await updateDoc(studentRef, { shadowMarks: increment(1) });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to add Shadow Mark.' };
    }
}

export async function removeShadowMark(input: ShadowMarkInput): Promise<ActionResponse> {
    const { teacherUid, studentUid } = input;
    try {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        const studentSnap = await getDoc(studentRef);
        if (!studentSnap.exists()) throw new Error('Student not found.');
        
        const currentMarks = studentSnap.data().shadowMarks || 0;
        if (currentMarks <= 0) return { success: false, error: 'Student has no Shadow Marks to remove.' };
        
        await updateDoc(studentRef, { shadowMarks: increment(-1) });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to remove Shadow Mark.' };
    }
}

interface InitiateStudentDeletionInput {
    teacherUid: string;
    studentUid: string;
}

export async function initiateStudentDeletion(input: InitiateStudentDeletionInput): Promise<ActionResponse> {
    try {
        const adminDb = getAdminDb(); // Get DB instance
        // Flag the user for deletion
        await setDoc(doc(adminDb, 'deleted-users', input.studentUid), { 
            deletionRequested: true,
            teacherUid: input.teacherUid,
        });

        // Also delete their final record from the teacher's subcollection
        const studentRef = doc(db, 'teachers', input.teacherUid, 'students', input.studentUid);
        await deleteDoc(studentRef);
        
        return { success: true };
    } catch (e: any) {
        console.error("Error flagging student for deletion:", e);
        return { success: false, error: e.message || 'Failed to flag student for deletion.' };
    }
}

interface UnarchiveStudentInput {
    teacherUid: string;
    studentUid: string;
}

export async function unarchiveStudent(input: UnarchiveStudentInput): Promise<ActionResponse> {
    try {
        const studentRef = doc(db, 'teachers', input.teacherUid, 'students', input.studentUid);
        await updateDoc(studentRef, { isArchived: false });
        return { success: true };
    } catch (e: any) {
        console.error("Error unarchiving student:", e);
        return { success: false, error: e.message || 'Failed to unarchive student.' };
    }
}

interface ClearGameLogInput {
    teacherUid: string;
}

export async function clearGameLog(input: ClearGameLogInput): Promise<ActionResponse> {
    const { teacherUid } = input;
    if (!teacherUid) {
        return { success: false, error: 'Teacher UID is required.' };
    }

    try {
        const gameLogRef = collection(db, 'teachers', teacherUid, 'gameLog');
        const snapshot = await getDocs(gameLogRef);

        if (snapshot.empty) {
            return { success: true, message: 'Game log is already empty.' };
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        return { success: true, message: 'Game log has been cleared.' };

    } catch (error: any) {
        console.error("Error clearing game log:", error);
        return { success: false, error: 'An unexpected error occurred while clearing the game log.' };
    }
}
