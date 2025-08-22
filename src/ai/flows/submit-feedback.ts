
'use server';
/**
 * @fileOverview A server-side flow for handling teacher feedback submissions.
 */
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from 'firebase/auth';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface FeedbackInput {
  teacher: User;
  feedbackType: 'bug' | 'feature';
  message: string;
}

export async function submitFeedback(input: FeedbackInput): Promise<ActionResponse> {
  const { teacher, feedbackType, message } = input;
  if (!message.trim()) {
      return { success: false, error: 'Feedback message cannot be empty.' };
  }

  try {
    const teacherRef = doc(db, 'teachers', teacher.uid);
    const teacherSnap = await getDoc(teacherRef);

    if (!teacherSnap.exists()) {
        return { success: false, error: 'Could not find your teacher profile.' };
    }
    const teacherData = teacherSnap.data();
    
    const feedbackRef = collection(db, 'feedback');
    await addDoc(feedbackRef, {
        teacherUid: teacher.uid,
        teacherName: teacherData.name || 'Unknown Teacher',
        teacherEmail: teacher.email || 'Unknown Email',
        feedbackType,
        message,
        createdAt: serverTimestamp(),
        status: 'new' // for admin tracking
    });

    return { success: true, message: 'Your feedback has been submitted successfully!' };

  } catch (error: any) {
    console.error("Error submitting feedback: ", error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}
