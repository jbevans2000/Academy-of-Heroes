
'use server';

import { collection, addDoc, writeBatch, serverTimestamp, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface SendMessageToStudentsInput {
  teacherUid: string;
  studentUids: string[];
  message: string;
}

export async function sendMessageToStudents(input: SendMessageToStudentsInput): Promise<ActionResponse> {
  const { teacherUid, studentUids, message } = input;
  if (!teacherUid || studentUids.length === 0 || !message.trim()) {
    return { success: false, error: 'Invalid input.' };
  }

  try {
    const batch = writeBatch(db);
    const messageData = {
      text: message,
      sender: 'teacher' as const,
      timestamp: serverTimestamp(),
      isRead: false,
    };

    for (const studentUid of studentUids) {
      const messageRef = doc(collection(db, 'teachers', teacherUid, 'students', studentUid, 'messages'));
      batch.set(messageRef, messageData);
      
      // Update the hasUnreadMessages flag on the student doc
      const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
      batch.update(studentRef, { hasUnreadMessages: true });
    }

    await batch.commit();
    return { success: true, message: `Message sent to ${studentUids.length} student(s).` };
  } catch (error: any) {
    console.error('Error sending message to students:', error);
    return { success: false, error: error.message || 'Failed to send message.' };
  }
}

interface SendMessageToTeacherInput {
    teacherUid: string;
    studentUid: string;
    message: string;
    studentName: string; // To show in the teacher's UI
}

export async function sendMessageToTeacher(input: SendMessageToTeacherInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, message, studentName } = input;
    if (!teacherUid || !studentUid || !message.trim()) {
        return { success: false, error: 'Invalid input.' };
    }

    try {
        const messageRef = collection(db, 'teachers', teacherUid, 'students', studentUid, 'messages');
        await addDoc(messageRef, {
            text: message,
            sender: 'student' as const,
            senderName: studentName, // Denormalize for teacher view
            timestamp: serverTimestamp(),
            isRead: false,
        });

        // Set the unread flag on the student document so the teacher UI can show it.
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        await updateDoc(studentRef, { hasUnreadMessages: true });

        return { success: true, message: 'Message sent to your Guild Leader!' };
    } catch (error: any) {
        console.error('Error sending message to teacher:', error);
        return { success: false, error: error.message || 'Failed to send message.' };
    }
}

interface MarkMessagesAsReadInput {
    teacherUid: string;
    studentUid: string;
    reader: 'teacher' | 'student';
}

export async function markMessagesAsRead(input: MarkMessagesAsReadInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, reader } = input;
    if (!teacherUid || !studentUid) return { success: false, error: 'Invalid input.' };

    try {
        const messagesRef = collection(db, 'teachers', teacherUid, 'students', studentUid, 'messages');
        const q = query(messagesRef, where('isRead', '==', false), where('sender', '==', reader === 'teacher' ? 'student' : 'teacher'));
        
        const unreadSnapshot = await getDocs(q);
        if (unreadSnapshot.empty) {
            return { success: true }; // No messages to mark as read
        }
        
        const batch = writeBatch(db);
        unreadSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });
        
        // After marking, update the student's unread flag
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        batch.update(studentRef, { hasUnreadMessages: false });
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error('Error marking messages as read:', error);
        return { success: false, error: error.message || 'Failed to update message status.' };
    }
}
