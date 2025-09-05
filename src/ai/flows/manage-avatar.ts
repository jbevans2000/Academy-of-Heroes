

'use server';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SaveAvatarInput {
  teacherUid: string;
  studentUid: string;
  downloadUrl: string; // The URL from the client-side upload
}

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  newAvatarUrl?: string;
}

export async function saveCustomAvatar(input: SaveAvatarInput): Promise<ActionResponse> {
  const { teacherUid, studentUid, downloadUrl } = input;
  if (!teacherUid || !studentUid || !downloadUrl) {
    return { success: false, error: 'Invalid input provided.' };
  }

  try {
    // Update the student's document in Firestore with the new avatar URL
    const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
    await updateDoc(studentRef, {
        avatarUrl: downloadUrl,
        useCustomAvatar: true, // Set the flag to indicate a custom avatar is in use
    });
    
    return { 
        success: true, 
        message: 'Custom avatar has been set!',
        newAvatarUrl: downloadUrl
    };

  } catch (error: any) {
    console.error("Error saving custom avatar URL:", error);
    return { success: false, error: error.message || 'An unexpected error occurred while saving the avatar URL.' };
  }
}
