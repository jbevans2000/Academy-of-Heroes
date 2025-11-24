
'use server';
/**
 * @fileOverview A secure, server-side flow for validating a co-teacher invitation token.
 */
import { doc, getDoc, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ValidationResponse {
  isValid: boolean;
  invitationId?: string;
  inviteeName?: string;
  inviteeEmail?: string;
  error?: string;
}

export async function validateCoTeacherInvite(token: string): Promise<ValidationResponse> {
  if (!token) {
    return { isValid: false, error: 'No invitation token provided.' };
  }

  const invitationsRef = collection(db, 'coTeacherInvitations');
  const q = query(invitationsRef, where('token', '==', token), limit(1));

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return { isValid: false, error: 'This invitation link is invalid or has already been used.' };
    }

    const invitationDoc = querySnapshot.docs[0];
    const invitationData = invitationDoc.data();
    
    // Check if the invitation has an expiration date
    if (invitationData.expiresAt) {
        const now = Timestamp.now();
        const expiresAt = invitationData.expiresAt as Timestamp;
        if (now > expiresAt) {
             return { isValid: false, error: 'This invitation has expired. Please ask the main teacher to send a new one.' };
        }
    } else {
        // Fallback for older invites without an expiration date (7 days from creation)
        const createdAt = invitationData.createdAt as Timestamp;
        const now = Timestamp.now();
        if (now.seconds - createdAt.seconds > 7 * 24 * 60 * 60) {
             return { isValid: false, error: 'This invitation has expired. Please ask the main teacher to send a new one.' };
        }
    }


    return {
        isValid: true,
        invitationId: invitationDoc.id,
        inviteeName: invitationData.inviteeName,
        inviteeEmail: invitationData.inviteeEmail,
    };

  } catch (error: any) {
    console.error("Error validating co-teacher invite:", error);
    return { isValid: false, error: 'An error occurred while validating the invitation.' };
  }
}
