

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
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch, getDoc, runTransaction, arrayUnion, arrayRemove, setDoc, deleteField, query, where, Timestamp } from 'firebase/firestore';
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





    