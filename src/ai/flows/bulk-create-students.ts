
'use server';
/**
 * SACROSANCT: DO NOT TOUCH
 * This file uses the Firebase Admin SDK and its logic has been confirmed to be correct.
 * DO NOT MODIFY this file or any functions within it under any circumstances.
 */

import { getAdminAuth } from '@/lib/firebaseAdmin';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { classData, type ClassType } from '@/lib/data';

export interface StudentData {
    studentName: string;
    characterName: string;
    studentId: string; // This will be the username for alias-based login
    password?: string; // Optional because it's client-provided
    class: ClassType;
}

interface BulkCreateInput {
  teacherUid: string;
  students: StudentData[];
}

interface BulkCreateResponse {
  success: boolean;
  createdCount: number;
  failedCount: number;
  failedDetails?: { studentName: string, reason: string }[];
  error?: string;
}

export async function bulkCreateStudents(input: BulkCreateInput): Promise<BulkCreateResponse> {
  const { teacherUid, students } = input;
  if (!teacherUid || !students || students.length === 0) {
    return { success: false, createdCount: 0, failedCount: 0, error: 'Invalid input.' };
  }

  const adminAuth = getAdminAuth();
  const firestoreBatch = writeBatch(db);
  
  let createdCount = 0;
  const failedDetails: { studentName: string, reason: string }[] = [];

  for (const student of students) {
    try {
      const { studentName, characterName, studentId, password, class: studentClass } = student;

      if (!studentName || !characterName || !studentId || !password || !studentClass) {
        failedDetails.push({ studentName: studentName || 'N/A', reason: 'Missing required fields.' });
        continue;
      }
      
      const classInfo = classData[studentClass];
      if (!classInfo) {
        failedDetails.push({ studentName, reason: `Invalid class type: ${studentClass}` });
        continue;
      }

      // Step 1: Create user in Firebase Authentication
      const userRecord = await adminAuth.createUser({
        email: `${studentId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`,
        password: password,
        displayName: studentName,
      });

      // Step 2: Create user documents in Firestore
      const baseStats = classInfo.baseStats;
      
      // Document in teacher's subcollection
      const studentRef = doc(db, 'teachers', teacherUid, 'students', userRecord.uid);
      firestoreBatch.set(studentRef, {
        uid: userRecord.uid,
        teacherUid: teacherUid,
        studentId: studentId,
        email: userRecord.email,
        studentName: studentName,
        characterName: characterName,
        class: studentClass,
        avatarUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Sep%2027%2C%202025%2C%2009_44_04%20AM.png?alt=media&token=0920ef19-d5d9-43b1-bab7-5ab134373ed3',
        xp: 0,
        gold: 0,
        level: 1,
        hp: baseStats.hp,
        mp: baseStats.mp,
        maxHp: baseStats.hp,
        maxMp: baseStats.mp,
        questProgress: {},
        hubsCompleted: 0,
        inBattle: false,
        inDuel: false,
        isArchived: false,
        isHidden: false,
      });

      // Global student lookup document
      const globalStudentRef = doc(db, 'students', userRecord.uid);
      firestoreBatch.set(globalStudentRef, {
        teacherUid: teacherUid,
        approved: true,
      });

      createdCount++;
    } catch (error: any) {
      console.error(`Failed to create student ${student.studentName}:`, error);
      let reason = 'An unknown server error occurred.';
      if (error.code === 'auth/email-already-exists') {
          reason = `A user with the username '${student.studentId}' already exists.`;
      } else if (error.code === 'auth/invalid-password') {
          reason = 'Password must be at least 6 characters long.';
      } else {
          reason = error.message;
      }
      failedDetails.push({ studentName: student.studentName, reason });
    }
  }
  
  try {
    await firestoreBatch.commit();
    return {
      success: true,
      createdCount,
      failedCount: failedDetails.length,
      failedDetails,
    };
  } catch(error: any) {
      return { success: false, createdCount: 0, failedCount: students.length, error: 'Failed to save student data to database.' };
  }
}
