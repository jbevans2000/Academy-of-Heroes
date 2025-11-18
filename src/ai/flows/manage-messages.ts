
'use server';

import { collection, addDoc, writeBatch, serverTimestamp, doc, updateDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
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
    
    studentUids.forEach(studentUid => {
        const messageRef = doc(collection(db, 'teachers', teacherUid, 'students', studentUid, 'messages'));
        batch.set(messageRef, {
            text: message,
            sender: 'teacher' as const,
            timestamp: serverTimestamp(),
            isRead: false,
        });

        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        batch.update(studentRef, { hasUnreadMessages: true });
    });

    await batch.commit();
    return { success: true, message: 'Message(s) sent successfully.' };
  } catch (error: any) {
    console.error('Error sending message to students:', error);
    return { success: false, error: error.message || 'Failed to send message.' };
  }
}

interface SendMessageToTeacherInput {
    teacherUid: string;
    studentUid: string;
    studentName: string;
    message: string;
}

export async function sendMessageToTeacher(input: SendMessageToTeacherInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, studentName, message } = input;
    if (!teacherUid || !studentUid || !message.trim()) {
        return { success: false, error: 'Invalid input.' };
    }

    try {
        const batch = writeBatch(db);
        const messageRef = doc(collection(db, 'teachers', teacherUid, 'students', studentUid, 'messages'));
        batch.set(messageRef, {
            text: message,
            sender: 'student' as const,
            timestamp: serverTimestamp(),
            isRead: false,
        });

        // Also set a flag on the student document for the teacher's UI
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        batch.update(studentRef, { hasUnreadMessages: true });
        
        await batch.commit();

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

export async function markMessagesAsRead({ teacherUid, studentUid, reader }: MarkMessagesAsReadInput): Promise<ActionResponse> {
    if (!teacherUid || !studentUid) {
        return { success: false, error: 'Invalid input.' };
    }

    try {
        // Mark the flag on the student document as false, regardless of who is reading.
        // This flag is what controls the UI notification for both parties.
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        await updateDoc(studentRef, { hasUnreadMessages: false });
        
        // Mark individual messages as read based on who the reader is.
        // This prevents re-showing "new" indicators within the chat itself.
        const messagesRef = collection(db, 'teachers', teacherUid, 'students', studentUid, 'messages');
        const opponentSender = reader === 'teacher' ? 'student' : 'teacher';
        const q = query(messagesRef, where('isRead', '==', false), where('sender', '==', opponentSender));
        
        const unreadSnapshot = await getDocs(q);
        if (!unreadSnapshot.empty) {
            const batch = writeBatch(db);
            unreadSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { isRead: true });
            });
            await batch.commit();
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error marking messages as read:', error);
        return { success: false, error: 'Failed to update message status.' };
    }
}

interface ClearHistoryInput {
  teacherUid: string;
  studentUid: string;
}

export async function clearMessageHistory(input: ClearHistoryInput): Promise<ActionResponse> {
  const { teacherUid, studentUid } = input;
  if (!teacherUid || !studentUid) {
    return { success: false, error: 'Invalid input provided.' };
  }

  try {
    const messagesRef = collection(db, 'teachers', teacherUid, 'students', studentUid, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);

    if (messagesSnapshot.empty) {
      return { success: true, message: 'No messages to clear.' };
    }

    const batch = writeBatch(db);
    messagesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true, message: 'Message history cleared.' };
  } catch (error: any) {
    console.error('Error clearing message history:', error);
    return { success: false, error: 'An unexpected error occurred while clearing the history.' };
  }
}

export async function markAllTeacherMessagesAsRead(teacherUid: string): Promise<ActionResponse> {
    if (!teacherUid) {
        return { success: false, error: 'Teacher UID required.' };
    }

    try {
        const studentsRef = collection(db, 'teachers', teacherUid, 'students');
        const q = query(studentsRef, where('hasUnreadMessages', '==', true));
        const unreadStudentsSnapshot = await getDocs(q);

        if (unreadStudentsSnapshot.empty) {
            return { success: true, message: "No new messages to mark as read." };
        }

        const batch = writeBatch(db);
        unreadStudentsSnapshot.forEach(doc => {
            batch.update(doc.ref, { hasUnreadMessages: false });
        });

        await batch.commit();
        return { success: true, message: "All messages marked as read." };
    } catch (error: any) {
        console.error("Error marking all as read:", error);
        return { success: false, error: error.message || "Failed to update all messages." };
    }
}


// Guild Hall Chat Functions

interface SendGuildHallMessageInput {
  teacherUid: string;
  senderUid: string;
  senderName: string;
  text: string;
  isTeacher: boolean;
  companyId?: string;
}

export async function sendGuildHallMessage(input: SendGuildHallMessageInput): Promise<ActionResponse> {
  const { teacherUid, senderUid, senderName, text, isTeacher, companyId } = input;
  if (!teacherUid || !senderUid || !text.trim()) {
    return { success: false, error: 'Invalid input.' };
  }

  try {
    const messagesRef = collection(db, 'teachers', teacherUid, 'guildHallMessages');
    await addDoc(messagesRef, {
      senderUid,
      senderName,
      text,
      isTeacher,
      companyId: companyId || null,
      timestamp: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error sending guild hall message:", error);
    return { success: false, error: 'Failed to send message.' };
  }
}

interface ClearGuildHallInput {
  teacherUid: string;
}

export async function clearGuildHallChat(input: ClearGuildHallInput): Promise<ActionResponse> {
  const { teacherUid } = input;
  if (!teacherUid) return { success: false, error: 'Teacher UID required.' };

  try {
    const messagesRef = collection(db, 'teachers', teacherUid, 'guildHallMessages');
    const snapshot = await getDocs(messagesRef);
    if(snapshot.empty) return { success: true, message: 'Chat is already empty.' };

    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return { success: true, message: 'Guild Hall chat history has been cleared.' };
  } catch (error: any) {
     console.error("Error clearing guild hall chat:", error);
     return { success: false, error: 'Failed to clear chat history.' };
  }
}
