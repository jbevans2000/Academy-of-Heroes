
'use server';
/**
 * @fileOverview A secure, server-side flow for creating a co-teacher account.
 */
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAdminAuth } from '@/lib/firebaseAdmin';

interface CreateCoTeacherInput {
  invitationId: string;
  inviteeName: string;
  inviteeEmail: string;
  password: string;
}

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function createCoTeacherAccount(input: CreateCoTeacherInput): Promise<ActionResponse> {
  const { invitationId, inviteeName, inviteeEmail, password } = input;

  if (!invitationId || !inviteeName || !inviteeEmail || !password) {
    return { success: false, error: 'Missing required information.' };
  }
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const invitationRef = doc(db, 'coTeacherInvitations', invitationId);

  try {
    const adminAuth = getAdminAuth();

    // 1. Check if the invitation still exists
    const invitationSnap = await getDoc(invitationRef);
    if (!invitationSnap.exists()) {
      throw new Error('This invitation is no longer valid.');
    }
    const invitationData = invitationSnap.data();

    // 2. Create the user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: inviteeEmail,
      emailVerified: true, // Co-teachers are invited, so we can consider them verified.
      password: password,
      displayName: inviteeName,
    });

    // 3. Create the co-teacher document in Firestore
    const teacherRef = doc(db, 'teachers', userRecord.uid);
    await setDoc(teacherRef, {
        uid: userRecord.uid,
        name: inviteeName,
        email: inviteeEmail,
        accountType: 'co-teacher',
        mainTeacherUid: invitationData.mainTeacherUid,
        createdAt: serverTimestamp(),
    });
    
    // 4. Delete the invitation so it can't be used again
    await deleteDoc(invitationRef);
    
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
