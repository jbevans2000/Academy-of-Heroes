
'use server';
/**
 * @fileOverview A secure, server-side flow for handling new student registrations.
 * This flow centralizes the registration logic to ensure global settings
 * like registration locks are properly enforced.
 */
import { getFirebaseAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { doc, setDoc, collection, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { classData, type ClassType } from '@/lib/data';
import { getGlobalSettings } from '@/ai/flows/manage-settings';

// Initialize the Firebase Admin App
getFirebaseAdminApp();

interface RegistrationInput {
  classCode: string;
  studentId: string;
  password:  string;
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


export async function createStudentAccount(input: RegistrationInput): Promise<ActionResponse> {
  // 1. Check if registration is open globally (Authoritative Server Check)
  const settings = await getGlobalSettings();
  if (!settings.isRegistrationOpen) {
    return { success: false, error: 'New hero creation has been paused by the Grandmaster.' };
  }

  // 2. Validate password length
  if (input.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  // 3. Find the teacher from the class code
  const teacherUid = await getTeacherUidFromClassCode(input.classCode);
  if (!teacherUid) {
    return { success: false, error: 'The Guild Code you entered does not exist. Please check with your Guild Leader.' };
  }

  const email = `${input.studentId}@academy-heroes-mziuf.firebaseapp.com`;
  
  const auth = getAuth();

  try {
    // 4. Create the user in Firebase Authentication
    const userRecord = await auth.createUser({
      email: email,
      password: input.password,
      displayName: input.characterName,
    });
    const user = userRecord;

    const classInfo = classData[input.selectedClass];
    const baseStats = classInfo.baseStats;

    // 5. Create the pending student document in Firestore
    await setDoc(doc(db, 'teachers', teacherUid, 'pendingStudents', user.uid), {
      uid: user.uid,
      teacherUid: teacherUid,
      studentId: input.studentId,
      email: email,
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

    // 6. Create the global student metadata document for quick lookup
    await setDoc(doc(db, 'students', user.uid), {
      teacherUid: teacherUid,
    });

    return { success: true, message: 'Request sent successfully!' };

  } catch (error: any) {
    console.error("Error in createStudentAccount flow:", error);
    let errorMessage = 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-exists') {
        errorMessage = 'This Hero\'s Alias is already registered for this guild.';
    } else if (error.code) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}
