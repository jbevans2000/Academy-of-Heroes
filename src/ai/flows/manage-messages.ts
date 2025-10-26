
'use server';

import { collection, addDoc, writeBatch, serverTimestamp, doc, updateDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
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
        const batch = writeBatch(db);
        
        // 1. Add the new message to the student's subcollection
        const messageRef = doc(collection(db, 'teachers', teacherUid, 'students', studentUid, 'messages'));
        batch.set(messageRef, {
            text: message,
            sender: 'student' as const,
            senderName: studentName, // Denormalize for teacher view
            timestamp: serverTimestamp(),
            isRead: false,
        });

        // 2. Set the unread flag on the student document so the teacher UI can show it.
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        batch.update(studentRef, { hasUnreadMessages: true });
        
        // 3. Set the global unread flag on the teacher document for the header notification
        const teacherRef = doc(db, 'teachers', teacherUid);
        batch.update(teacherRef, { hasUnreadTeacherMessages: true });

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

export async function markMessagesAsRead(input: MarkMessagesAsReadInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, reader } = input;
    if (!teacherUid || !studentUid) return { success: false, error: 'Invalid input.' };

    try {
        const messagesRef = collection(db, 'teachers', teacherUid, 'students', studentUid, 'messages');
        const q = query(messagesRef, where('isRead', '==', false), where('sender', '==', reader === 'teacher' ? 'student' : 'teacher'));
        
        const unreadSnapshot = await getDocs(q);
        const batch = writeBatch(db);

        if (!unreadSnapshot.empty) {
            unreadSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { isRead: true });
            });
        }
        
        // Only the teacher reading the message should clear the unread flags.
        if (reader === 'teacher') {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
            batch.update(studentRef, { hasUnreadMessages: false });
            
            // This is the crucial part: commit the read status for the individual student
            await batch.commit();
            
            // AFTER committing, check if any OTHER students have unread messages for the teacher.
            const allStudentsQuery = query(collection(db, 'teachers', teacherUid, 'students'), where('hasUnreadMessages', '==', true));
            const remainingUnreadSnapshot = await getDocs(allStudentsQuery);
            
            // If no other students have unread messages, clear the global teacher flag
            if (remainingUnreadSnapshot.empty) {
                const teacherRef = doc(db, 'teachers', teacherUid);
                await updateDoc(teacherRef, { hasUnreadTeacherMessages: false });
            }

        } else {
            // If the student is the reader, just commit the read status of the messages
            // and don't touch any of the teacher-facing notification flags.
            await batch.commit();
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error marking messages as read:', error);
        return { success: false, error: error.message || 'Failed to update message status.' };
    }
}

export async function markAllTeacherMessagesAsRead(teacherUid: string): Promise<ActionResponse> {
    if (!teacherUid) return { success: false, error: 'Teacher UID is required.' };

    try {
        const batch = writeBatch(db);

        // 1. Clear the global flag on the teacher document
        const teacherRef = doc(db, 'teachers', teacherUid);
        batch.update(teacherRef, { hasUnreadTeacherMessages: false });

        // 2. Find all students with unread messages and clear their flags
        const studentsWithUnreadQuery = query(
            collection(db, 'teachers', teacherUid, 'students'),
            where('hasUnreadMessages', '==', true)
        );
        const studentsSnapshot = await getDocs(studentsWithUnreadQuery);

        if (!studentsSnapshot.empty) {
            for (const studentDoc of studentsSnapshot.docs) {
                // Clear the student-specific flag
                batch.update(studentDoc.ref, { hasUnreadMessages: false });

                // Mark all underlying messages from the student as read
                const messagesRef = collection(studentDoc.ref, 'messages');
                const messagesQuery = query(messagesRef, where('isRead', '==', false), where('sender', '==', 'student'));
                const messagesSnapshot = await getDocs(messagesQuery);
                messagesSnapshot.forEach(msgDoc => {
                    batch.update(msgDoc.ref, { isRead: true });
                });
            }
        }
        
        await batch.commit();
        return { success: true, message: 'All student messages marked as read.' };
    } catch (error: any) {
        console.error("Error marking all teacher messages as read:", error);
        return { success: false, error: error.message || 'Failed to mark all messages as read.' };
    }
}

interface ClearMessageHistoryInput {
  teacherUid: string;
  studentUid: string;
}

export async function clearMessageHistory(input: ClearMessageHistoryInput): Promise<ActionResponse> {
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
