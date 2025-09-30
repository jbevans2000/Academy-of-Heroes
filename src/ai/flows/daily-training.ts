
'use server';

import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student, Chapter } from '@/lib/data';
import { logAvatarEvent } from '@/lib/avatar-log';
import { calculateLevel, calculateHpGain, calculateMpGain } from '@/lib/game-mechanics';
import { getDuelSettings } from './manage-duels';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface CompleteTrainingInput {
    teacherUid: string;
    studentUid: string;
    score: number; // e.g., 8
    totalQuestions: number; // e.g., 10
}

export async function completeDailyTraining(input: CompleteTrainingInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, score, totalQuestions } = input;
    if (!teacherUid || !studentUid) return { success: false, error: 'Invalid input.' };

    try {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        const [studentSnap, settings] = await Promise.all([
            getDoc(studentRef),
            getDuelSettings(teacherUid)
        ]);

        if (!studentSnap.exists()) throw new Error("Student not found.");
        const student = studentSnap.data() as Student;

        // Check if the student has already received rewards today.
        let alreadyCompletedToday = false;
        if (student.lastDailyTraining) {
            const today = new Date();
            const lastTrainingDate = student.lastDailyTraining.toDate();
            // Using a 23-hour check to be slightly more lenient than a strict calendar day check
            const hoursSinceLastCompletion = (today.getTime() - lastTrainingDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastCompletion < 23) {
                alreadyCompletedToday = true;
            }
        }
        
        if (alreadyCompletedToday) {
            // Allow them to complete it, but don't give rewards.
            return { success: true, message: "You successfully completed another round of training today, but can only recieve rewards once every 24 hours, as per the Guild Leader's Instructions!" };
        }


        // If not completed today, proceed with rewards.
        const scorePercentage = totalQuestions > 0 ? score / totalQuestions : 0;
        
        const xpToAward = Math.ceil((settings.dailyTrainingXpReward || 0) * scorePercentage);
        const goldToAward = Math.ceil((settings.dailyTrainingGoldReward || 0) * scorePercentage);

        const updates: any = {
            lastDailyTraining: serverTimestamp(),
        };

        if (xpToAward > 0) updates.xp = increment(xpToAward);
        if (goldToAward > 0) updates.gold = increment(goldToAward);

        // Handle Level Up
        const newXp = (student.xp || 0) + xpToAward;
        const currentLevel = student.level || 1;
        const newLevel = calculateLevel(newXp);
        
        if (newLevel > currentLevel) {
            const levelsGained = newLevel - currentLevel;
            updates.level = newLevel;
            updates.hp = (student.hp || 0) + calculateHpGain(student.class, levelsGained);
            updates.mp = (student.mp || 0) + calculateMpGain(student.class, levelsGained);
        }

        await updateDoc(studentRef, updates);

        if (xpToAward > 0 || goldToAward > 0) {
            await logAvatarEvent(teacherUid, studentUid, {
                source: 'Daily Training',
                xp: xpToAward,
                gold: goldToAward,
                reason: `Scored ${score}/${totalQuestions} on daily quiz.`,
            });
        }

        return { success: true, message: `Training complete! You earned ${xpToAward} XP and ${goldToAward} Gold!` };

    } catch (error: any) {
        console.error("Error completing daily training:", error);
        return { success: false, error: error.message || 'Failed to record training completion.' };
    }
}
