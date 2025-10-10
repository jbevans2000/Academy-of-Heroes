
'use server';

import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
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
