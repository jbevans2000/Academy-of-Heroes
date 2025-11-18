
'use server';

import { doc, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logAvatarEvent, type LogEventSource } from '@/lib/avatar-log';
import { handleLevelChange, MAX_LEVEL, XP_FOR_MAX_LEVEL } from '@/lib/game-mechanics';
import type { Student } from '@/lib/data';

interface UpdateStatsInput {
    teacherUid: string;
    studentUids: string[];
    xp?: number;
    gold?: number;
    hp?: number;
    mp?: number;
    reason: string;
}

interface UpdateStatsResponse {
    success: boolean;
    error?: string;
    studentCount?: number;
    maxLevelCount?: number;
}

export async function updateStudentStats(input: UpdateStatsInput): Promise<UpdateStatsResponse> {
    const { teacherUid, studentUids, xp, gold, hp, mp, reason } = input;
    if (!teacherUid || studentUids.length === 0) {
        return { success: false, error: 'Invalid input provided.' };
    }

    const batch = writeBatch(db);
    let studentsAtMaxLevel = 0;

    try {
        const teacherRef = doc(db, 'teachers', teacherUid);
        const teacherSnap = await getDoc(teacherRef);
        const levelingTable = teacherSnap.exists() ? teacherSnap.data().levelingTable : null;

        for (const uid of studentUids) {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', uid);
            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {
                const studentData = studentSnap.data() as Student;
                let updates: Partial<Student> = {};

                // Handle XP and Leveling
                if (xp) {
                    const currentLevel = studentData.level || 1;
                    if (currentLevel >= MAX_LEVEL && xp > 0) {
                        studentsAtMaxLevel++;
                    } else {
                        const currentXp = studentData.xp || 0;
                        let newXp = Math.max(0, currentXp + xp);
                        if (newXp > XP_FOR_MAX_LEVEL) newXp = XP_FOR_MAX_LEVEL;
                        
                        const levelUpdates = handleLevelChange(studentData, newXp, levelingTable);
                        updates = { ...updates, ...levelUpdates };
                    }
                }

                // Handle Gold
                if (gold) {
                    const currentGold = studentData.gold || 0;
                    updates.gold = Math.max(0, currentGold + gold);
                }
                
                // Handle HP
                if (hp) {
                    const currentHp = studentData.hp || 0;
                    updates.hp = Math.max(0, Math.min(studentData.maxHp, currentHp + hp));
                }

                // Handle MP
                if (mp) {
                    const currentMp = studentData.mp || 0;
                    updates.mp = Math.max(0, Math.min(studentData.maxMp, currentMp + mp));
                }


                if (Object.keys(updates).length > 0) {
                    batch.update(studentRef, updates);
                }
                
                // Always log the event
                await logAvatarEvent(teacherUid, uid, {
                    source: 'Teacher Award',
                    xp: (xp && studentData.level < MAX_LEVEL) ? xp : undefined,
                    gold: gold || undefined,
                    hp: hp || undefined,
                    mp: mp || undefined,
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
        console.error("Error in updateStudentStats flow:", error);
        return { success: false, error: error.message || "Failed to update stats." };
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
    const [studentSnap, teacherSnap] = await Promise.all([
        getDoc(studentRef),
        getDoc(doc(db, 'teachers', teacherUid))
    ]);
    
    if (!studentSnap.exists()) throw new Error("Student not found.");
    
    const studentData = studentSnap.data() as Student;
    const levelingTable = teacherSnap.exists() ? teacherSnap.data().levelingTable : null;
    const oldValue = studentData[stat] || 0;
    const change = value - oldValue;
    
    let updates: Partial<Student> = { [stat]: value };

    if (stat === 'xp') {
      const levelUpdates = handleLevelChange(studentData, value, levelingTable);
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

    