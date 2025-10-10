
'use server';

import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logGameEvent } from '@/lib/gamelog';
import { logAvatarEvent } from '@/lib/avatar-log';
import type { Student } from '@/lib/data';

interface GradeSubmissionInput {
    teacherUid: string;
    studentUid: string;
    missionId: string;
    grade: string;
    feedback: string;
    xpAward: number;
    goldAward: number;
    status: 'complete' | 'resubmit';
}

interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export async function gradeSubmission(input: GradeSubmissionInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, missionId, grade, feedback, xpAward, goldAward, status } = input;
    if (!teacherUid || !studentUid || !missionId) {
        return { success: false, error: 'Invalid input provided.' };
    }

    try {
        const submissionRef = doc(db, 'teachers', teacherUid, 'missions', missionId, 'submissions', studentUid);
        
        const updates: any = {
            grade,
            feedback,
        };

        if (status === 'complete') {
            updates.status = 'completed';
            updates.xpAwarded = xpAward;
            updates.goldAwarded = goldAward;

            const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
            const studentUpdates: Partial<Student> = {};
            if (xpAward > 0) studentUpdates.xp = increment(xpAward);
            if (goldAward > 0) studentUpdates.gold = increment(goldAward);

            if (Object.keys(studentUpdates).length > 0) {
                await updateDoc(studentRef, studentUpdates);
                await logAvatarEvent(teacherUid, studentUid, {
                    source: 'Mission Completion',
                    xp: xpAward,
                    gold: goldAward,
                    reason: `Graded for mission: ${missionId}`
                });
            }
        } else { // 'resubmit'
            updates.status = 'draft';
        }

        await updateDoc(submissionRef, updates);

        const message = status === 'complete' ? 'Submission graded and rewards sent!' : 'Feedback sent. Student can now resubmit.';
        return { success: true, message };

    } catch (error: any) {
        console.error("Error grading submission:", error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}
