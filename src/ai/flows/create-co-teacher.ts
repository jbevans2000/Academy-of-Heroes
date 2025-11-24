
'use server';
/**
 * @fileOverview A secure, server-side flow for creating a co-teacher account.
 */
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAdminAuth } from '@/lib/firebaseAdmin';

interface CreateCoTeacherInput {
  mainTeacherUid: string;
  mainTeacherName: string;
  inviteeName: string;
  inviteeEmail: string;
  password: string;
  permissions: any; // Permissions object
}

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function createCoTeacherAccount(input: CreateCoTeacherInput): Promise<ActionResponse> {
  const { mainTeacherUid, mainTeacherName, inviteeName, inviteeEmail, password, permissions } = input;

  if (!mainTeacherUid || !mainTeacherName || !inviteeName || !inviteeEmail || !password || !permissions) {
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
      emailVerified: true, // Co-teachers are invited, so we can consider them verified.
      password: password,
      displayName: inviteeName,
    });
    
    // Get main teacher's data to copy relevant fields
    const mainTeacherRef = doc(db, 'teachers', mainTeacherUid);
    const mainTeacherSnap = await getDoc(mainTeacherRef);
    const mainTeacherData = mainTeacherSnap.exists() ? mainTeacherSnap.data() : {};

    // 2. Create the co-teacher document in Firestore
    const teacherRef = doc(db, 'teachers', userRecord.uid);
    await setDoc(teacherRef, {
        uid: userRecord.uid,
        name: inviteeName,
        email: inviteeEmail,
        // Set co-teacher specific fields
        accountType: 'co-teacher',
        mainTeacherUid: mainTeacherUid,
        // Copy relevant fields from the main teacher
        schoolName: mainTeacherData.schoolName || '',
        className: mainTeacherData.className || '',
        levelingTable: mainTeacherData.levelingTable || {},
        permissions: permissions, // Save the permissions object
        createdAt: serverTimestamp(),
    });
    
    return { success: true, message: 'Your co-teacher account has been successfully created!' };

  } catch (error: any) {
    console.error('Error creating co-teacher account:', error);
    let errorMessage = 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'An account with this email address already exists.';
    }
    return { success: false, error: errorMessage };
  }
}

interface UpdatePermissionsInput {
    coTeacherUid: string;
    permissions: any;
}

export async function updateCoTeacherPermissions(input: UpdatePermissionsInput): Promise<ActionResponse> {
    const { coTeacherUid, permissions } = input;
    if (!coTeacherUid || !permissions) {
        return { success: false, error: 'Missing required information.' };
    }
    
    try {
        const coTeacherRef = doc(db, 'teachers', coTeacherUid);
        await updateDoc(coTeacherRef, {
            permissions: permissions
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating co-teacher permissions:", error);
        return { success: false, error: error.message || 'Failed to update permissions.' };
    }
}
