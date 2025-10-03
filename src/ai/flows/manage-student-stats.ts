
'use server';

import { doc, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logAvatarEvent, type LogEventSource } from '@/lib/avatar-log';
import { handleLevelChange, MAX_LEVEL, XP_FOR_MAX_LEVEL } from '@/lib/game-mechanics';
import type { Student } from '@/lib/data';

interface AwardRewardsInput {
    teacherUid: string;
    studentUids: string[];
    xp: number;
    gold: number;
    reason: string;
}

interface AwardRewardsResponse {
    success: boolean;
    error?: string;
    studentCount?: number;
    maxLevelCount?: number;
}

export async function awardRewards(input: AwardRewardsInput): Promise<AwardRewardsResponse> {
    const { teacherUid, studentUids, xp, gold, reason } = input;
    if (!teacherUid || studentUids.length === 0) {
        return { success: false, error: 'Invalid input provided.' };
    }

    const batch = writeBatch(db);
    let studentsAtMaxLevel = 0;

    try {
        for (const uid of studentUids) {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', uid);
            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {
                const studentData = studentSnap.data() as Student;
                let updates: Partial<Student> = {};

                // Handle XP and Leveling
                if (xp !== 0) {
                    const currentLevel = studentData.level || 1;
                    if (currentLevel >= MAX_LEVEL && xp > 0) {
                        studentsAtMaxLevel++;
                    } else {
                        const currentXp = studentData.xp || 0;
                        let newXp = Math.max(0, currentXp + xp);
                        if (newXp > XP_FOR_MAX_LEVEL) newXp = XP_FOR_MAX_LEVEL;
                        
                        const levelUpdates = handleLevelChange(studentData, newXp);
                        updates = { ...updates, ...levelUpdates };
                    }
                }

                // Handle Gold
                if (gold !== 0) {
                    const currentGold = studentData.gold || 0;
                    updates.gold = Math.max(0, currentGold + gold);
                }

                if (Object.keys(updates).length > 0) {
                    batch.update(studentRef, updates);
                }
                
                // Always log the event, even if only one stat changed or if at max level
                await logAvatarEvent(teacherUid, uid, {
                    source: 'Teacher Award',
                    xp: (studentData.level || 1) >= MAX_LEVEL && xp > 0 ? 0 : xp, // Don't log XP gain if at max level
                    gold: gold,
                    reason: reason,
                });
            }
        }

        await batch.commit();

        return {
            success: true,
            studentCount: studentUids.length,
            maxLevelCount: studentsAtMaxLevel,
        };

    } catch (error: any) {
        console.error("Error in awardRewards flow:", error);
        return { success: false, error: error.message || "Failed to bestow rewards." };
    }
}


interface SetStatInput {
  teacherUid: string;
  studentUid: string;
  stat: 'xp' | 'gold' | 'hp' | 'mp' | 'maxHp' | 'maxMp';
  value: number;
}

export async function setStudentStat(input: SetStatInput): Promise<{success: boolean, error?: string}> {
  const { teacherUid, studentUid, stat, value } = input;
   if (!teacherUid || !studentUid || value < 0) {
    return { success: false, error: "Invalid input." };
  }

  const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);

  try {
    const studentSnap = await getDoc(studentRef);
    if (!studentSnap.exists()) throw new Error("Student not found.");
    
    const studentData = studentSnap.data() as Student;
    const oldValue = studentData[stat] || 0;
    const change = value - oldValue;
    
    let updates: Partial<Student> = { [stat]: value };

    if (stat === 'xp') {
      const levelUpdates = handleLevelChange(studentData, value);
      updates = { ...updates, ...levelUpdates };
    }
    
    await updateDoc(studentRef, updates);
    
    // Log the change if it's XP or Gold
    if (stat === 'xp' || stat === 'gold') {
        const logSource: LogEventSource = 'Manual Edit';
        await logAvatarEvent(teacherUid, studentUid, {
            source: logSource,
            [stat]: change,
            reason: `Stat manually set to ${value}.`,
        });
    }

    return { success: true };

  } catch (error: any) {
    console.error("Error in setStudentStat:", error);
    return { success: false, error: error.message || 'Failed to update stat.' };
  }
}
    
