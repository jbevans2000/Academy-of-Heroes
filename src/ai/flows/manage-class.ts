
'use server';
/**
 * @fileOverview A server-side flow for managing class-wide student data.
 */
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logGameEvent } from '@/lib/gamelog';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function restoreAllStudentsHp(teacherUid: string): Promise<ActionResponse> {
    if (!teacherUid) {
        return { success: false, error: 'Teacher UID is required.' };
    }

    try {
        const studentsRef = collection(db, 'teachers', teacherUid, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        if (studentsSnapshot.empty) {
            return { success: true, message: 'No students found to restore.' };
        }

        const batch = writeBatch(db);
        studentsSnapshot.forEach(studentDoc => {
            const studentData = studentDoc.data();
            // Restore HP to maxHp
            batch.update(studentDoc.ref, { hp: studentData.maxHp });
        });

        await batch.commit();
        await logGameEvent(teacherUid, 'GAMEMASTER', 'Restored all students to maximum HP.');

        return { success: true, message: `${studentsSnapshot.size} student(s) have been restored to full health.` };
    } catch (error: any) {
        console.error("Error restoring all students' HP:", error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}

export async function restoreAllStudentsMp(teacherUid: string): Promise<ActionResponse> {
    if (!teacherUid) {
        return { success: false, error: 'Teacher UID is required.' };
    }

    try {
        const studentsRef = collection(db, 'teachers', teacherUid, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        if (studentsSnapshot.empty) {
            return { success: true, message: 'No students found to restore.' };
        }

        const batch = writeBatch(db);
        studentsSnapshot.forEach(studentDoc => {
            const studentData = studentDoc.data();
            // Restore MP to maxMp
            batch.update(studentDoc.ref, { mp: studentData.maxMp });
        });

        await batch.commit();
        await logGameEvent(teacherUid, 'GAMEMASTER', 'Restored all students to maximum MP.');

        return { success: true, message: `${studentsSnapshot.size} student(s) have been restored to full magic points.` };
    } catch (error: any) {
        console.error("Error restoring all students' MP:", error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}
