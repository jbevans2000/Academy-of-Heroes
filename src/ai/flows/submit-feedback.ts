
'use server';
/**
 * @fileOverview A server-side flow for handling teacher feedback submissions.
 */
import { addDoc, collection, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface FeedbackInput {
  feedbackType: 'bug' | 'feature';
  message: string;
  // New fields to track the submitter
  teacherUid: string;
  teacherName: string;
  teacherEmail: string;
}

export async function submitFeedback(input: FeedbackInput): Promise<ActionResponse> {
  const { feedbackType, message, teacherUid, teacherName, teacherEmail } = input;
  if (!message.trim()) {
      return { success: false, error: 'Feedback message cannot be empty.' };
  }
  if (!teacherUid || !teacherName || !teacherEmail) {
      return { success: false, error: 'User information is missing.' };
  }

  try {
    const feedbackRef = collection(db, 'feedback');
    await addDoc(feedbackRef, {
        feedbackType,
        message,
        teacherUid,
        teacherName,
        teacherEmail,
        createdAt: serverTimestamp(),
        status: 'new' // for admin tracking
    });

    return { success: true, message: 'Your feedback has been submitted successfully!' };

  } catch (error: any) {
    console.error("Error submitting feedback: ", error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

export async function deleteFeedback(feedbackId: string): Promise<ActionResponse> {
    if (!feedbackId) {
        return { success: false, error: 'Feedback ID is required.' };
    }
    try {
        await deleteDoc(doc(db, 'feedback', feedbackId));
        return { success: true, message: 'Feedback entry deleted.' };
    } catch (error: any) {
        console.error("Error deleting feedback:", error);
        return { success: false, error: 'Failed to delete feedback entry.' };
    }
}
