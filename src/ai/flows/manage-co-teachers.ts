
'use server';
/**
 * @fileOverview A server-side flow for managing co-teacher invitations.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

interface InviteCoTeacherInput {
  mainTeacherUid: string;
  mainTeacherName: string;
  inviteeName: string;
  inviteeEmail: string;
}

interface InviteCoTeacherResponse {
  success: boolean;
  invitationLink?: string;
  error?: string;
}

/**
 * Creates an invitation document in Firestore for a new co-teacher.
 * @returns A unique invitation link for the teacher to share.
 */
export async function inviteCoTeacher(
  input: InviteCoTeacherInput
): Promise<InviteCoTeacherResponse> {
  const { mainTeacherUid, mainTeacherName, inviteeName, inviteeEmail } = input;

  if (!mainTeacherUid || !inviteeName || !inviteeEmail) {
    return { success: false, error: 'Missing required information.' };
  }

  try {
    const token = uuidv4();
    const invitationsRef = collection(db, 'coTeacherInvitations');

    await addDoc(invitationsRef, {
      mainTeacherUid,
      mainTeacherName,
      inviteeName,
      inviteeEmail: inviteeEmail.toLowerCase(),
      token,
      status: 'pending',
      createdAt: serverTimestamp(),
      // Invitations expire after 7 days
      expiresAt: serverTimestamp(),
    });

    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost:9002';
    const invitationLink = `${protocol}://${host}/register/co-teacher?token=${token}`;

    return { success: true, invitationLink };
  } catch (error: any) {
    console.error('Error creating co-teacher invitation:', error);
    return {
      success: false,
      error: 'Could not create invitation. Please try again.',
    };
  }
}
