
'use server';
/**
 * @fileOverview A server-side flow for managing teacher accounts and data.
 */
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logGameEvent } from '@/lib/gamelog';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface UpdateProfileInput {
  teacherUid: string;
  name: string;
  schoolName: string;
  className: string;
}

export async function updateTeacherProfile(input: UpdateProfileInput): Promise<ActionResponse> {
  try {
    const teacherRef = doc(db, 'teachers', input.teacherUid);
    await updateDoc(teacherRef, {
      name: input.name,
      schoolName: input.schoolName,
      className: input.className,
    });
    
    await logGameEvent(input.teacherUid, 'GAMEMASTER', 'Updated their profile information.');

    return { success: true };
  } catch (e: any) {
    console.error("Error in updateTeacherProfile:", e);
    return { success: false, error: e.message || 'Failed to update profile in Firestore.' };
  }
}
