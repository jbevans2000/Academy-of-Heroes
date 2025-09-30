
'use server';

import { collection, addDoc, writeBatch, serverTimestamp, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface SendMessageToTeacherInput {
  adminUid: string;
  teacherUid: string;
  message: string;
}

export async function sendMessageToTeacherFromAdmin(input: SendMessageToTeacherInput): Promise<ActionResponse> {
  const { adminUid, teacherUid, message } = input;
  if (!adminUid || !teacherUid || !message.trim()) {
    return { success: false, error: 'Invalid input.' };
  }

  try {
    const batch = writeBatch(db);
    const messageData = {
      text: message,
      sender: 'admin' as const,
      timestamp: serverTimestamp(),
      isRead: false,
    };

    const messageRef = doc(collection(db, 'teachers', teacherUid, 'adminMessages'));
    batch.set(messageRef, messageData);
    
    // Update the hasUnreadAdminMessages flag on the teacher doc
    const teacherRef = doc(db, 'teachers', teacherUid);
    batch.update(teacherRef, { hasUnreadAdminMessages: true });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error('Error sending message to teacher:', error);
    return { success: false, error: error.message || 'Failed to send message.' };
  }
}

interface SendMessageToAdminInput {
    teacherUid: string;
    teacherName: string;
    message: string;
}

export async function sendMessageToAdmin(input: SendMessageToAdminInput): Promise<ActionResponse> {
    const { teacherUid, teacherName, message } = input;
    if (!teacherUid || !message.trim()) {
        return { success: false, error: 'Invalid input.' };
    }

    try {
        const batch = writeBatch(db);
        
        const messageRef = doc(collection(db, 'teachers', teacherUid, 'adminMessages'));
        batch.set(messageRef, {
            text: message,
            sender: 'teacher' as const,
            senderName: teacherName,
            timestamp: serverTimestamp(),
            isRead: false,
        });

        // Set the global unread flag on the teacher document for the admin's query
        const teacherRef = doc(db, 'teachers', teacherUid);
        batch.update(teacherRef, { hasUnreadAdminMessages: true });

        await batch.commit();

        return { success: true, message: 'Message sent to the Admin!' };
    } catch (error: any) {
        console.error('Error sending message to admin:', error);
        return { success: false, error: error.message || 'Failed to send message.' };
    }
}

interface MarkMessagesAsReadInput {
    teacherId: string;
}

export async function markAdminMessagesAsRead(input: MarkMessagesAsReadInput): Promise<ActionResponse> {
    const { teacherId } = input;
    if (!teacherId) return { success: false, error: 'Invalid input.' };

    try {
        const teacherRef = doc(db, 'teachers', teacherId);
        await updateDoc(teacherRef, { hasUnreadAdminMessages: false });
        
        const messagesRef = collection(teacherRef, 'adminMessages');
        const q = query(messagesRef, where('isRead', '==', false), where('sender', '==', 'teacher'));
        
        const unreadSnapshot = await getDocs(q);
        const batch = writeBatch(db);

        if (!unreadSnapshot.empty) {
            unreadSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { isRead: true });
            });
            await batch.commit();
        }
        return { success: true };
    } catch (error: any) {
        console.error('Error marking admin messages as read:', error);
        return { success: false, error: error.message || 'Failed to update message status.' };
    }
}

export async function markAllAdminMessagesAsRead(): Promise<ActionResponse> {
    try {
        const teachersRef = collection(db, 'teachers');
        const q = query(teachersRef, where('hasUnreadAdminMessages', '==', true));
        const unreadTeachersSnapshot = await getDocs(q);

        if (unreadTeachersSnapshot.empty) {
            return { success: true, message: "No new messages to mark as read." };
        }

        const batch = writeBatch(db);

        for (const teacherDoc of unreadTeachersSnapshot.docs) {
            // Clear the unread flag on the teacher document
            batch.update(teacherDoc.ref, { hasUnreadAdminMessages: false });

            // Mark all underlying messages from the teacher as read
            const messagesRef = collection(teacherDoc.ref, 'adminMessages');
            const messagesQuery = query(messagesRef, where('isRead', '==', false), where('sender', '==', 'teacher'));
            const messagesSnapshot = await getDocs(messagesQuery);
            messagesSnapshot.forEach(msgDoc => {
                batch.update(msgDoc.ref, { isRead: true });
            });
        }

        await batch.commit();
        return { success: true, message: "All messages marked as read." };
    } catch (error: any) {
        console.error("Error marking all admin messages as read:", error);
        return { success: false, error: error.message || "Failed to update all messages." };
    }
}
