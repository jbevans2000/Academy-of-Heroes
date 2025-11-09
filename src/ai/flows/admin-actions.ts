
'use server';
/**
 * @fileOverview A secure, server-side flow for admin-only actions like deleting users.
 */
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Helper function to recursively delete subcollections.
async function deleteCollection(collectionPath: string, batchSize: number = 100) {
    const collectionRef = adminDb.collection(collectionPath);
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(query: FirebaseFirestore.Query, resolve: (value: unknown) => void) {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
        return resolve(0);
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}


export async function deleteTeacher(teacherUid: string): Promise<ActionResponse> {
    if (!teacherUid) {
        return { success: false, error: "Teacher UID is required." };
    }

    try {
        // First, delete the user from Firebase Authentication.
        // If this fails, we don't proceed to delete their data.
        await adminAuth.deleteUser(teacherUid);

        // Recursively delete all subcollections for the teacher. This is critical.
        const subcollections = [
            'students', 'pendingStudents', 'questHubs', 'chapters', 'bossBattles',
            'savedBattles', 'groupBattleSummaries', 'boons', 'pendingBoonRequests',
            'boonTransactions', 'gameLog', 'wheelOfFateEvents', 'duelQuestionSections',
            'companies', 'missions', 'guildHallMessages'
        ];
        
        for (const subcollection of subcollections) {
            await deleteCollection(`teachers/${teacherUid}/${subcollection}`);
        }

        // Finally, delete the main teacher document.
        await adminDb.collection('teachers').doc(teacherUid).delete();

        return { success: true, message: "Teacher and all associated data have been deleted." };
    } catch (error: any) {
        console.error("Error deleting teacher:", error);
        return { success: false, error: error.message || 'An unknown error occurred while deleting the teacher.' };
    }
}


interface DeleteStudentInput {
    teacherUid: string;
    studentUid: string;
}

export async function deleteStudent({ teacherUid, studentUid }: DeleteStudentInput): Promise<ActionResponse> {
     if (!teacherUid || !studentUid) {
        return { success: false, error: "Teacher and Student UIDs are required." };
    }
    
    try {
        // Delete user from Authentication first.
        await adminAuth.deleteUser(studentUid);
        
        // Delete all student subcollections.
        const subcollections = ['messages', 'avatarLog'];
        for (const subcollection of subcollections) {
            await deleteCollection(`teachers/${teacherUid}/students/${studentUid}/${subcollection}`);
        }

        const batch = adminDb.batch();

        // Delete the main student document.
        const studentRef = adminDb.doc(`teachers/${teacherUid}/students/${studentUid}`);
        batch.delete(studentRef);

        // Delete the global lookup document.
        const globalStudentRef = adminDb.doc(`students/${studentUid}`);
        batch.delete(globalStudentRef);

        await batch.commit();

        return { success: true, message: "Student and all their data have been deleted." };

    } catch (error: any) {
        console.error("Error deleting student:", error);
        return { success: false, error: error.message || 'An unknown error occurred while deleting the student.' };
    }
}

export async function deleteStudentDataOnly({ teacherUid, studentUid }: DeleteStudentInput): Promise<ActionResponse> {
     if (!teacherUid || !studentUid) {
        return { success: false, error: "Teacher and Student UIDs are required." };
    }
    
    try {
        // This function will NOT delete the auth user.
        
        // Delete all student subcollections.
        const subcollections = ['messages', 'avatarLog'];
        for (const subcollection of subcollections) {
            await deleteCollection(`teachers/${teacherUid}/students/${studentUid}/${subcollection}`);
        }

        const batch = adminDb.batch();

        // Delete the main student document from the teacher's subcollection.
        const studentRef = adminDb.doc(`teachers/${teacherUid}/students/${studentUid}`);
        batch.delete(studentRef);

        // Delete the global lookup document. This is crucial to prevent re-entry issues.
        const globalStudentRef = adminDb.doc(`students/${studentUid}`);
        batch.delete(globalStudentRef);

        await batch.commit();

        return { success: true, message: "Student game data has been deleted. Their login still exists but is now orphaned." };

    } catch (error: any) {
        console.error("Error deleting student data:", error);
        return { success: false, error: error.message || 'An unknown error occurred while deleting the student data.' };
    }
}
