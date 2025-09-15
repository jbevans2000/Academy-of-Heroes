
'use server';
/**
 * @fileOverview A server-side flow for managing teacher accounts and data.
 */
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';
import { logGameEvent } from '@/lib/gamelog';

// Initialize the Firebase Admin App
getFirebaseAdminApp();


interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface UpdateProfileInput {
  teacherUid: string;
  name: string;
  schoolName: string;
  className: string;
  contactEmail: string;
  address: string;
}

export async function updateTeacherProfile(input: UpdateProfileInput): Promise<ActionResponse> {
  try {
    const teacherRef = doc(db, 'teachers', input.teacherUid);
    await updateDoc(teacherRef, {
      name: input.name,
      schoolName: input.schoolName,
      className: input.className,
      contactEmail: input.contactEmail,
      address: input.address,
    });
    
    await logGameEvent(input.teacherUid, 'GAMEMASTER', 'Updated their profile information.');

    return { success: true };
  } catch (e: any) {
    console.error("Error in updateTeacherProfile:", e);
    return { success: false, error: e.message || 'Failed to update profile in Firestore.' };
  }
}

interface UpdateReminderInput {
  teacherUid: string;
  title: string;
  message: string;
  isActive: boolean;
}

export async function updateDailyReminder(input: UpdateReminderInput): Promise<ActionResponse> {
  try {
    const teacherRef = doc(db, 'teachers', input.teacherUid);
    await updateDoc(teacherRef, {
      dailyReminderTitle: input.title,
      dailyReminderMessage: input.message,
      isDailyReminderActive: input.isActive,
    });
    return { success: true, message: 'Daily reminder updated successfully!' };
  } catch (e: any) {
    console.error("Error in updateDailyReminder:", e);
    return { success: false, error: e.message || 'Failed to update the daily reminder.' };
  }
}

interface UpdateRegenInput {
    teacherUid: string;
    regenPercentage: number;
}

export async function updateDailyRegen(input: UpdateRegenInput): Promise<ActionResponse> {
    const { teacherUid, regenPercentage } = input;
    if (regenPercentage < 0 || regenPercentage > 100) {
        return { success: false, error: 'Percentage must be between 0 and 100.' };
    }
    try {
        const teacherRef = doc(db, 'teachers', teacherUid);
        await updateDoc(teacherRef, {
            dailyRegenPercentage: regenPercentage,
        });
        await logGameEvent(teacherUid, 'GAMEMASTER', `Set daily HP/MP regeneration to ${regenPercentage}%.`);
        return { success: true, message: 'Daily regeneration rate updated!' };
    } catch (e: any) {
        console.error("Error in updateDailyRegen:", e);
        return { success: false, error: e.message || 'Failed to update regeneration rate.' };
    }
}


export async function deleteTeacher(teacherUid: string): Promise<ActionResponse> {
    const auth = getAuth(getFirebaseAdminApp());

    try {
        // 1. Delete all students of the teacher from Firebase Auth
        const studentsSnapshot = await getDocs(collection(db, 'teachers', teacherUid, 'students'));
        const studentUids = studentsSnapshot.docs.map(doc => doc.id);

        if (studentUids.length > 0) {
            // Firebase Auth Admin SDK can delete up to 1000 users at once.
            // For larger classes, this might need batching, but this is sufficient for most cases.
            await auth.deleteUsers(studentUids);
        }
        
        // 2. Delete all of the teacher's subcollections and the teacher document itself from Firestore
        const teacherRef = doc(db, 'teachers', teacherUid);
        const subcollections = ['students', 'pendingStudents', 'boons', 'pendingBoonRequests', 'boonTransactions', 'gameLog', 'bossBattles', 'savedBattles', 'questHubs', 'chapters', 'companies', 'groupBattleSummaries'];

        for (const sub of subcollections) {
            const subcollectionRef = collection(teacherRef, sub);
            const snapshot = await getDocs(subcollectionRef);
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        }
        
        // After subcollections are gone, delete the main teacher doc
        await deleteDoc(teacherRef);
        
        // 3. Delete the global student metadata documents
        if (studentUids.length > 0) {
            const studentMetaBatch = writeBatch(db);
            studentUids.forEach(uid => {
                const studentMetaRef = doc(db, 'students', uid);
                studentMetaBatch.delete(studentMetaRef);
            });
            await studentMetaBatch.commit();
        }

        // 4. Finally, delete the teacher from Firebase Auth
        await auth.deleteUser(teacherUid);

        return { success: true, message: "Teacher and all associated data have been permanently deleted." };

    } catch (error: any) {
        console.error("Error deleting teacher:", error);
        return { success: false, error: error.message || 'Failed to complete teacher deletion.' };
    }
}
