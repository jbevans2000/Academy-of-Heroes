
'use server';

import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Mission } from '@/lib/missions';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  id?: string;
}

type CreateMissionInput = Omit<Mission, 'id' | 'createdAt'>;
type UpdateMissionInput = Partial<Omit<Mission, 'id' | 'createdAt'>> & { id: string };

export async function saveMission(teacherUid: string, missionData: CreateMissionInput | UpdateMissionInput): Promise<ActionResponse> {
  if (!teacherUid) return { success: false, error: 'User not authenticated.' };
  if (!missionData.title || !missionData.content) {
    return { success: false, error: 'Mission title and content are required.' };
  }

  try {
    const missionsRef = collection(db, 'teachers', teacherUid, 'missions');
    
    if ('id' in missionData) {
      // This is an update
      const { id, ...dataToUpdate } = missionData;
      const missionDocRef = doc(missionsRef, id);
      await updateDoc(missionDocRef, dataToUpdate);
      return { success: true, id };
    } else {
      // This is a new creation
      const newDocRef = await addDoc(missionsRef, {
        ...missionData,
        createdAt: serverTimestamp(),
      });
      return { success: true, id: newDocRef.id };
    }
  } catch (error: any) {
    console.error("Error saving mission: ", error);
    return { success: false, error: error.message || 'Failed to save mission.' };
  }
}

export async function deleteMission(teacherUid: string, missionId: string): Promise<ActionResponse> {
  if (!teacherUid || !missionId) return { success: false, error: 'Invalid input.' };
  try {
    const missionRef = doc(db, 'teachers', teacherUid, 'missions', missionId);
    await deleteDoc(missionRef);
    return { success: true, message: 'Mission deleted successfully.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete mission.' };
  }
}

// New functions for Phase 2

interface SaveDraftInput {
    teacherUid: string;
    studentUid: string;
    missionId: string;
    submissionContent: string;
    fileUrl?: string;
}

export async function saveMissionDraft(input: SaveDraftInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, missionId, submissionContent, fileUrl } = input;
    if (!teacherUid || !studentUid || !missionId) return { success: false, error: 'Invalid input.' };
    
    try {
        const subRef = doc(db, 'teachers', teacherUid, 'missions', missionId, 'submissions', studentUid);
        await updateDoc(subRef, {
            submissionContent: submissionContent,
            fileUrl: fileUrl || null,
            status: 'draft',
            lastSavedAt: serverTimestamp(),
        });
        return { success: true, message: 'Draft saved!' };
    } catch (error: any) {
        console.error("Error saving draft:", error);
        return { success: false, error: 'Failed to save draft.' };
    }
}

interface SubmitMissionInput {
    teacherUid: string;
    studentUid: string;
    missionId: string;
    submissionContent: string;
    fileUrl?: string;
}

export async function submitMission(input: SubmitMissionInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, missionId, submissionContent, fileUrl } = input;
    if (!teacherUid || !studentUid || !missionId) return { success: false, error: 'Invalid input.' };
    
    try {
        const subRef = doc(db, 'teachers', teacherUid, 'missions', missionId, 'submissions', studentUid);
        await updateDoc(subRef, {
            submissionContent: submissionContent,
            fileUrl: fileUrl || null,
            status: 'submitted',
            submittedAt: serverTimestamp(),
        });
        return { success: true, message: 'Mission submitted for review!' };
    } catch (error: any) {
        console.error("Error submitting mission:", error);
        return { success: false, error: 'Failed to submit mission.' };
    }
}
