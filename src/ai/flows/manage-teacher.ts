
'use server';
/**
 * @fileOverview A server-side flow for managing teacher accounts and data.
 */
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth as auth } from '@/lib/firebaseAdmin';
import { logGameEvent } from '@/lib/gamelog';


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
  characterName?: string; // New field
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
      characterName: input.characterName || '', // Save character name
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
        await logGameEvent(teacherUid, 'GAMEMASTER', `Set daily HP/MP regeneration to ${'${regenPercentage}'}%.`);
        return { success: true, message: 'Daily regeneration rate updated!' };
    } catch (e: any) {
        console.error("Error in updateDailyRegen:", e);
        return { success: false, error: e.message || 'Failed to update regeneration rate.' };
    }
}

interface UpdateLevelingTableInput {
    teacherUid: string;
    levelingTable: { [level: number]: number };
}

export async function updateLevelingTable(input: UpdateLevelingTableInput): Promise<ActionResponse> {
    const { teacherUid, levelingTable } = input;
    try {
        const teacherRef = doc(db, 'teachers', teacherUid);
        await updateDoc(teacherRef, {
            levelingTable: levelingTable,
        });
        await logGameEvent(teacherUid, 'GAMEMASTER', 'Updated the custom leveling curve.');
        return { success: true, message: 'Custom leveling curve has been saved!' };
    } catch (e: any) {
        console.error("Error in updateLevelingTable:", e);
        return { success: false, error: e.message || 'Failed to save leveling curve.' };
    }
}


export async function deleteTeacher(teacherUid: string): Promise<ActionResponse> {
    try {
        // Find all students of the teacher to delete their global metadata
        const studentsSnapshot = await getDocs(collection(db, 'teachers', teacherUid, 'students'));
        const studentUids = studentsSnapshot.docs.map(doc => doc.id);
        
        // Delete all of the teacher's subcollections and the teacher document itself from Firestore
        const teacherRef = doc(db, 'teachers', teacherUid);
        const subcollections = ['students', 'pendingStudents', 'boons', 'pendingBoonRequests', 'boonTransactions', 'gameLog', 'bossBattles', 'savedBattles', 'questHubs', 'chapters', 'companies', 'groupBattleSummaries'];

        for (const sub of subcollections) {
            const subcollectionRef = collection(teacherRef, sub);
            const snapshot = await getDocs(subcollectionRef);
            if (!snapshot.empty) {
                const subBatch = writeBatch(db);
                snapshot.docs.forEach(d => subBatch.delete(d.ref));
                await subBatch.commit();
            }
        }
        
        // After subcollections are gone, delete the main teacher doc
        await deleteDoc(teacherRef);
        
        // Delete the global student metadata documents
        if (studentUids.length > 0) {
            const studentMetaBatch = writeBatch(db);
            studentUids.forEach(uid => {
                const studentMetaRef = doc(db, 'students', uid);
                studentMetaBatch.delete(studentMetaRef);
            });
            await studentMetaBatch.commit();
        }
        
        return { success: true, message: "Teacher data has been removed from Firestore. The authentication records remain." };

    } catch (error: any) {
        console.error("Error deleting teacher:", error);
        return { success: false, error: error.message || 'Failed to complete teacher data deletion.' };
    }
}
