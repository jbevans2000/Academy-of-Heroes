

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
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch, getDoc, runTransaction, arrayUnion, arrayRemove, setDoc, deleteField } from 'firebase/firestore';
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
}

export async function setMeditationStatus(input: MeditationStatusInput): Promise<ActionResponse> {
  const { teacherUid, studentUid, isInMeditation, message } = input;
  try {
    const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
    const updates: any = {
      isInMeditationChamber: isInMeditation,
    };
    if (isInMeditation) {
      updates.meditationMessage = message;
    } else {
      updates.meditationMessage = deleteField();
    }
    await updateDoc(studentRef, updates);
    return { success: true };
  } catch (e: any) {
    console.error("Error setting meditation status:", e);
    return { success: false, error: 'Failed to update meditation status.' };
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
