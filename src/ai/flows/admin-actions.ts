
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
        // First, delete all Firestore data associated with the teacher.
        const subcollections = [
            'students', 'pendingStudents', 'questHubs', 'chapters', 'bossBattles',
            'savedBattles', 'groupBattleSummaries', 'boons', 'pendingBoonRequests',
            'boonTransactions', 'gameLog', 'wheelOfFateEvents', 'duelQuestionSections',
            'companies', 'missions', 'guildHallMessages'
        ];
        
        for (const subcollection of subcollections) {
            await deleteCollection(`teachers/${teacherUid}/${subcollection}`);
        }
        
        // Then, delete the main teacher document.
        await adminDb.collection('teachers').doc(teacherUid).delete();

        // Finally, attempt to delete the user from Firebase Authentication.
        // This might fail if the token is expired, but the data will be gone.
        await adminAuth.deleteUser(teacherUid);

        return { success: true, message: "Teacher and all associated data have been deleted." };
    } catch (error: any) {
        console.error("Error deleting teacher:", error);
        // If the error is specifically about auth deletion, we can still consider it a partial success.
        if (error.code === 'auth/user-not-found' || error.message.includes('Could not refresh access token')) {
            return { success: true, message: 'Teacher data deleted, but the auth account could not be removed automatically. It may need to be removed manually from the Firebase Console.' };
        }
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
        // First, delete all Firestore data to ensure the student is removed from the app.
        const subcollections = ['messages', 'avatarLog'];
        for (const subcollection of subcollections) {
            await deleteCollection(`teachers/${teacherUid}/students/${studentUid}/${subcollection}`);
        }

        const batch = adminDb.batch();
        
        const studentRef = adminDb.doc(`teachers/${teacherUid}/students/${studentUid}`);
        batch.delete(studentRef);

        const globalStudentRef = adminDb.doc(`students/${studentUid}`);
        batch.delete(globalStudentRef);

        await batch.commit();
        
        // Then, attempt to delete the user from Authentication.
        // This is the part that might fail, but the user is already "gone" from the app's perspective.
        await adminAuth.deleteUser(studentUid);
        
        return { success: true, message: "Student account and all associated data have been deleted." };

    } catch (error: any) {
        console.error("Error deleting student:", error);
         if (error.code === 'auth/user-not-found' || error.message.includes('Could not refresh access token')) {
            return { success: true, message: 'Student data deleted, but the login account could not be removed automatically. It may need to be removed manually from the Firebase Console.' };
        }
        return { success: false, error: error.message || 'An unknown error occurred while deleting the student.' };
    }
}
