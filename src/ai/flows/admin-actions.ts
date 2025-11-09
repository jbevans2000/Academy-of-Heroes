
'use server';
/**
 * @fileOverview A secure, server-side flow for admin-only actions like deleting users.
 */
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { doc, setDoc } from 'firebase/firestore';

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
        
        // Flag for auth deletion on next login
        await adminDb.collection('deleted-users').doc(teacherUid).set({ deletionRequested: true });

        return { success: true, message: "Teacher data has been deleted. Their login account will be removed upon their next login attempt." };
    } catch (error: any) {
        console.error("Error deleting teacher data:", error);
        return { success: false, error: error.message || 'An unknown error occurred while deleting the teacher data.' };
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
        
        // Then, flag the user for auth deletion on their next login.
        // This is more reliable than trying to delete the auth user from the server here.
        await adminDb.collection('deleted-users').doc(studentUid).set({ deletionRequested: true });
        
        return { success: true, message: "Student data has been deleted. Their login account will be removed upon their next login attempt." };

    } catch (error: any) {
        console.error("Error deleting student:", error);
        return { success: false, error: error.message || 'An unknown error occurred while deleting the student.' };
    }
}
