
'use server';

import { getAdminAuth } from '@/lib/firebaseAdmin';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CreateCoTeacherInput {
    mainTeacherUid: string;
    mainTeacherName: string;
    inviteeName: string;
    inviteeEmail: string;
    password:  string;
}

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function createCoTeacherAccount(input: CreateCoTeacherInput): Promise<ActionResponse> {
  const { mainTeacherUid, mainTeacherName, inviteeName, inviteeEmail, password } = input;

  if (!mainTeacherUid || !inviteeName || !inviteeEmail || !password) {
    return { success: false, error: 'Missing required information.' };
  }
   if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  try {
    const adminAuth = getAdminAuth();
    
    // 1. Create the user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: inviteeEmail,
      emailVerified: true, // We can consider them verified as they are invited directly.
      password: password,
      displayName: inviteeName,
    });
    
    // 2. Create the co-teacher document in Firestore, linking it to the main teacher
    const mainTeacherRef = doc(db, 'teachers', mainTeacherUid);
    const mainTeacherSnap = await getDoc(mainTeacherRef);
    const mainTeacherData = mainTeacherSnap.exists() ? mainTeacherSnap.data() : {};
    
    const teacherRef = doc(db, 'teachers', userRecord.uid);
    await setDoc(teacherRef, {
        uid: userRecord.uid,
        name: inviteeName,
        email: inviteeEmail,
        // Copy essential details from main teacher
        schoolName: mainTeacherData.schoolName || '',
        className: mainTeacherData.className || '',
        // Set co-teacher specific fields
        accountType: 'co-teacher',
        mainTeacherUid: mainTeacherUid,
        createdAt: serverTimestamp(),
    });
    
    return { success: true, message: 'Co-teacher account created successfully!' };

  } catch (error: any) {
    console.error('Error creating co-teacher account:', error);
    let errorMessage = 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'An account with this email address already exists. They cannot be invited as a co-teacher if they already have an account.';
    }
    return { success: false, error: errorMessage };
  }
}
