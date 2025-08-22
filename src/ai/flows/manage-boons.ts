
'use server';

import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Boon } from '@/lib/boons';
import { logGameEvent } from '@/lib/gamelog';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

type CreateBoonInput = Omit<Boon, 'id' | 'createdAt' | 'isVisibleToStudents'>;

export async function createBoon(teacherUid: string, boonData: CreateBoonInput): Promise<ActionResponse> {
  if (!teacherUid) return { success: false, error: 'User not authenticated.' };
  if (!boonData.name || boonData.cost < 0) {
    return { success: false, error: 'Invalid boon data. Name and a non-negative cost are required.' };
  }

  try {
    const boonsRef = collection(db, 'teachers', teacherUid, 'boons');
    await addDoc(boonsRef, {
      ...boonData,
      createdAt: serverTimestamp(),
      isVisibleToStudents: true, // Default to visible when manually created
    });
    await logGameEvent(teacherUid, 'GAMEMASTER', `Created a new boon: ${boonData.name}.`);
    return { success: true, message: 'Boon created successfully.' };
  } catch (error: any) {
    console.error("Error creating boon: ", error);
    return { success: false, error: error.message || 'Failed to create boon.' };
  }
}

type UpdateBoonInput = Omit<Boon, 'createdAt'>;

export async function updateBoon(teacherUid: string, boonData: UpdateBoonInput): Promise<ActionResponse> {
  if (!teacherUid) return { success: false, error: 'User not authenticated.' };
  if (!boonData.name || boonData.cost < 0) {
    return { success: false, error: 'Invalid boon data.' };
  }

  try {
    const boonRef = doc(db, 'teachers', teacherUid, 'boons', boonData.id);
    const { id, ...dataToUpdate } = boonData;
    await updateDoc(boonRef, dataToUpdate);
    await logGameEvent(teacherUid, 'GAMEMASTER', `Updated boon: ${boonData.name}.`);
    return { success: true, message: 'Boon updated successfully.' };
  } catch (error: any) {
    console.error("Error updating boon: ", error);
    return { success: false, error: error.message || 'Failed to update boon.' };
  }
}

export async function updateBoonVisibility(teacherUid: string, boonId: string, isVisible: boolean): Promise<ActionResponse> {
    if (!teacherUid) return { success: false, error: 'User not authenticated.' };
    try {
        const boonRef = doc(db, 'teachers', teacherUid, 'boons', boonId);
        await updateDoc(boonRef, { isVisibleToStudents: isVisible });
        await logGameEvent(teacherUid, 'GAMEMASTER', `Set boon ${boonId} visibility to ${isVisible}.`);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating boon visibility:", error);
        return { success: false, error: "Failed to update boon visibility." };
    }
}

export async function deleteBoon(teacherUid: string, boonId: string): Promise<ActionResponse> {
  if (!teacherUid) return { success: false, error: 'User not authenticated.' };

  try {
    const boonRef = doc(db, 'teachers', teacherUid, 'boons', boonId);
    await deleteDoc(boonRef);
    await logGameEvent(teacherUid, 'GAMEMASTER', `Deleted boon with ID: ${boonId}.`);
    return { success: true, message: 'Boon deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting boon: ", error);
    return { success: false, error: error.message || 'Failed to delete boon.' };
  }
}
