
'use server';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type LogEventSource = 
    | 'Quest Completion'
    | 'Boss Battle'
    | 'Group Battle'
    | 'Duel Victory'
    | 'Daily Training'
    | 'Teacher Award'
    | 'Manual Edit';

export interface AvatarLogEntry {
  timestamp: any; // Firestore ServerTimestamp
  source: LogEventSource;
  xp?: number;
  gold?: number;
  reason?: string; // Optional message, especially for teacher awards
}

/**
 * Records an event to a student's avatar log.
 * This is a "fire-and-forget" operation from the caller's perspective.
 * @param teacherUid The UID of the teacher.
 * @param studentUid The UID of the student.
 * @param entry The log entry data.
 */
export async function logAvatarEvent(
  teacherUid: string,
  studentUid: string,
  entry: Omit<AvatarLogEntry, 'timestamp'>
): Promise<void> {
  if (!teacherUid || !studentUid) {
    console.error("Failed to log avatar event: IDs missing.");
    return;
  }
  try {
    const logRef = collection(db, 'teachers', teacherUid, 'students', studentUid, 'avatarLog');
    await addDoc(logRef, {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to write to avatar log:", {
      teacherUid,
      studentUid,
      entry,
      error,
    });
  }
}
