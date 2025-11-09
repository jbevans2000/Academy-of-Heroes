
'use server';
/**
 * @fileOverview A secure, server-side flow for admin-only actions like deleting users.
 */
import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminDb } from '@/lib/firebaseAdmin';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// This function uses the Admin SDK and is intended for a secure server environment.
// It will attempt to delete the auth user and their firestore data.
export async function deleteTeacher(teacherUid: string): Promise<ActionResponse> {
    if (!teacherUid) {
        return { success: false, error: "Teacher UID is required." };
    }

    try {
        const batch = writeBatch(db);
        const subcollections = [
            'students', 'pendingStudents', 'questHubs', 'chapters', 'bossBattles',
            'savedBattles', 'groupBattleSummaries', 'boons', 'pendingBoonRequests',
            'boonTransactions', 'gameLog', 'wheelOfFateEvents', 'duelQuestionSections',
            'companies', 'missions', 'guildHallMessages'
        ];
        
        for (const subcollection of subcollections) {
            const subcollectionRef = collection(db, `teachers/${teacherUid}/${subcollection}`);
            const snapshot = await getDocs(subcollectionRef);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        
        batch.delete(doc(db, 'teachers', teacherUid));
        
        await batch.commit();
        
        await adminDb.collection('deleted-users').doc(teacherUid).set({ deletionRequested: true });

        return { success: true, message: "Teacher data has been deleted. Their login account will be removed upon their next login attempt." };
    } catch (error: any) {
        console.error("Error deleting teacher data:", error);
        return { success: false, error: error.message || 'An unknown error occurred while deleting the teacher data.' };
    }
}


interface ArchiveStudentInput {
    teacherUid: string;
    studentUid: string;
}

// This function ARCHIVES the student document, marking it for full deletion
// by the student on their next login. This is a client-side compatible action.
export async function archiveStudentForDeletion({ teacherUid, studentUid }: ArchiveStudentInput): Promise<ActionResponse> {
     if (!teacherUid || !studentUid) {
        return { success: false, error: "Teacher and Student UIDs are required." };
    }
    
    try {
        const studentRef = doc(db, `teachers/${teacherUid}/students/${studentUid}`);
        await updateDoc(studentRef, { isArchived: true });
        
        return { success: true, message: "Student has been archived. Their data and account will be permanently deleted upon their next login attempt." };

    } catch (error: any) {
        console.error("Error archiving student data:", error);
        return { success: false, error: error.message || 'An unknown error occurred while archiving the student data.' };
    }
}
