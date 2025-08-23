
'use server';
/**
 * @fileOverview A secure, server-side flow for creating student documents in Firestore
 * after they have already been created in Firebase Authentication on the client.
 */
import { doc, setDoc, collection, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { classData, type ClassType } from '@/lib/data';
import { getGlobalSettings } from '@/ai/flows/manage-settings';

interface RegistrationInput {
  classCode: string;
  userUid: string; // The UID from the successfully created user
  email: string;
  studentId: string;
  studentName: string;
  characterName: string;
  selectedClass: ClassType;
  selectedAvatar: string;
}

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

async function getTeacherUidFromClassCode(code: string): Promise<string | null> {
    const uppercaseCode = code.toUpperCase();
    const teachersRef = collection(db, 'teachers');
    const q = query(teachersRef, where('classCode', '==', uppercaseCode), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }
    
    return querySnapshot.docs[0].id;
}


export async function createStudentDocuments(input: RegistrationInput): Promise<ActionResponse> {
  // 1. Check if registration is open globally (Authoritative Server Check)
  const settings = await getGlobalSettings();
  if (!settings.isRegistrationOpen) {
    return { success: false, error: 'New hero creation has been paused by the Grandmaster.' };
  }

  // 2. Find the teacher from the class code
  const teacherUid = await getTeacherUidFromClassCode(input.classCode);
  if (!teacherUid) {
    return { success: false, error: 'The Guild Code you entered does not exist. Please check with your Guild Leader.' };
  }
  
  try {
    const classInfo = classData[input.selectedClass];
    const baseStats = classInfo.baseStats;

    // 3. Create the pending student document in Firestore
    await setDoc(doc(db, 'teachers', teacherUid, 'pendingStudents', input.userUid), {
      uid: input.userUid,
      teacherUid: teacherUid,
      studentId: input.studentId,
      email: input.email,
      studentName: input.studentName,
      characterName: input.characterName,
      class: input.selectedClass,
      avatarUrl: input.selectedAvatar,
      hp: baseStats.hp,
      mp: baseStats.mp,
      maxHp: baseStats.hp,
      maxMp: baseStats.mp,
      status: 'pending',
      requestedAt: serverTimestamp(),
    });

    // 4. Create the global student metadata document for quick lookup
    await setDoc(doc(db, 'students', input.userUid), {
      teacherUid: teacherUid,
      approved: false, // Explicitly set approval status
    });

    return { success: true, message: 'Request sent successfully!' };

  } catch (error: any) {
    console.error("Error in createStudentDocuments flow:", error);
    let errorMessage = 'An unexpected error occurred while saving your hero\'s data.';
    if (error.code) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}
