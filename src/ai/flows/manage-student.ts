
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
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch, getDoc, runTransaction, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
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

      // 1. Update the student's own document
      transaction.update(studentRef, { isChampion: isChampion });

      // 2. Remove the student from any list they might be in
      if (championsData.freelancerChampions.includes(studentUid)) {
          championsData.freelancerChampions = championsData.freelancerChampions.filter((uid: string) => uid !== studentUid);
      }
      for (const compId in championsData.championsByCompany) {
          championsData.championsByCompany[compId] = championsData.championsByCompany[compId].filter((uid: string) => uid !== studentUid);
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
    return { success: false, error: e.message || 'Failed to update student visibility.' };
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
        // This is a multi-step process to ensure all data is removed.
        await auth.deleteUser(input.studentUid); // 1. Delete from Auth
        
        const teacherStudentRef = doc(db, 'teachers', input.teacherUid, 'students', input.studentUid);
        await deleteDoc(teacherStudentRef); // 2. Delete from teacher's collection
        
        const globalStudentRef = doc(db, 'students', input.studentUid);
        await deleteDoc(globalStudentRef); // 3. Delete from global students collection

        return { success: true, message: 'Student has been permanently removed from the system.' };
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


interface MigrateDataInput {
    teacherUid: string;
    oldStudentUid: string;
    newStudentUid: string;
}

export async function migrateStudentData(input: MigrateDataInput): Promise<ActionResponse> {
    const { teacherUid, oldStudentUid, newStudentUid } = input;
    
    try {
        await runTransaction(db, async (transaction) => {
            const oldStudentRef = doc(db, 'teachers', teacherUid, 'students', oldStudentUid);
            const newStudentRef = doc(db, 'teachers', teacherUid, 'students', newStudentUid);

            const oldStudentSnap = await transaction.get(oldStudentRef);
            const newStudentSnap = await transaction.get(newStudentRef);
            
            if (!oldStudentSnap.exists()) {
                throw new Error('The old student account could not be found.');
            }
             if (!newStudentSnap.exists()) {
                throw new Error('The new student account could not be found.');
            }

            const oldData = oldStudentSnap.data();
            const newData = newStudentSnap.data();
            
            // Safety Check: Ensure classes match before migrating data.
            if (oldData.class !== newData.class) {
                throw new Error(`Class mismatch: Old account is a ${oldData.class}, new account is a ${newData.class}. Please have the student create a new account with the correct class.`);
            }

            const dataToCopy = {
                level: oldData.level || 1,
                xp: oldData.xp || 0,
                gold: oldData.gold || 0,
                hp: oldData.hp || 1,
                maxHp: oldData.maxHp || 1,
                mp: oldData.mp || 0,
                maxMp: oldData.maxMp || 0,
                questProgress: oldData.questProgress || {},
                hubsCompleted: oldData.hubsCompleted || 0,
                inventory: oldData.inventory || {},
                avatarUrl: oldData.avatarUrl || '',
                backgroundUrl: oldData.backgroundUrl || '',
            };
            
            // Update the new account with the old account's progress data
            transaction.update(newStudentRef, dataToCopy);

            // Mark the old account as archived
            transaction.update(oldStudentRef, { isArchived: true });

        });

        return { success: true, message: 'Data migration successful!' };

    } catch (error: any) {
        console.error("Error migrating student data:", error);
        return { success: false, error: error.message || 'An unexpected error occurred during data migration.' };
    }
}

interface UnarchiveStudentInput {
  teacherUid: string;
  studentUid: string;
}

export async function unarchiveStudent(input: UnarchiveStudentInput): Promise<ActionResponse> {
    const { teacherUid, studentUid } = input;
    
    try {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        await updateDoc(studentRef, {
            isArchived: false
        });
        
        return { success: true, message: "Student has been unarchived and can now log in." };

    } catch (error: any) {
        console.error("Error unarchiving student:", error);
        return { success: false, error: "An unexpected error occurred while unarchiving the student." };
    }
}

interface ArchiveStudentsInput {
    teacherUid: string;
    studentUids: string[];
}

export async function archiveStudents(input: ArchiveStudentsInput): Promise<ActionResponse> {
    const { teacherUid, studentUids } = input;
    if (!teacherUid || !studentUids || studentUids.length === 0) {
        return { success: false, error: 'Invalid input provided.' };
    }

    try {
        const batch = writeBatch(db);
        studentUids.forEach(uid => {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', uid);
            batch.update(studentRef, { isArchived: true });
        });
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error archiving students:", error);
        return { success: false, error: 'An unexpected error occurred while archiving the students.' };
    }
}

    