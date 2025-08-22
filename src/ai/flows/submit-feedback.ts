
'use server';
/**
 * @fileOverview A server-side flow for handling anonymous teacher feedback submissions.
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface FeedbackInput {
  feedbackType: 'bug' | 'feature';
  message: string;
}

export async function submitFeedback(input: FeedbackInput): Promise<ActionResponse> {
  const { feedbackType, message } = input;
  if (!message.trim()) {
      return { success: false, error: 'Feedback message cannot be empty.' };
  }

  try {
    const feedbackRef = collection(db, 'feedback');
    await addDoc(feedbackRef, {
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
