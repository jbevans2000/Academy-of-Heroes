

'use server';

import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ArmorPiece } from '@/lib/forge';

type CreateArmorPieceInput = Omit<ArmorPiece, 'id' | 'transforms' | 'transforms2' | 'createdAt'>;
type UpdateArmorPieceInput = Partial<ArmorPiece> & { id: string };


interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function addArmorPiece(armorData: CreateArmorPieceInput): Promise<ActionResponse> {
  const { name, description, imageUrl, slot, classRequirement } = armorData;
  if (!name || !description || !imageUrl || !slot || !classRequirement) {
    return { success: false, error: 'Missing required armor data.' };
  }
  
  if (slot === 'chest' && (!armorData.modularImageUrlMale || !armorData.modularImageUrlFemale)) {
    return { success: false, error: 'Chest pieces require both male and female modular images.' };
  } else if (slot !== 'chest' && !armorData.modularImageUrl) {
      return { success: false, error: 'A primary modular image is required for this slot.' };
  }

  try {
    const armorRef = collection(db, 'armorPieces');
    await addDoc(armorRef, {
        ...armorData,
        setName: armorData.setName || '',
        levelRequirement: Number(armorData.levelRequirement) || 1,
        goldCost: Number(armorData.goldCost) || 0,
        isPublished: armorData.isPublished || false,
        modularImageUrl: armorData.modularImageUrl || '',
        modularImageUrlMale: armorData.modularImageUrlMale || '',
        modularImageUrlFemale: armorData.modularImageUrlFemale || '',
        modularImageUrl2: armorData.modularImageUrl2 || '',
        transforms: {},
        transforms2: {},
        createdAt: serverTimestamp(),
    });
    return { success: true, message: 'Armor piece added to the forge.' };
  } catch (error: any) {
    console.error('Error adding armor piece: ', error);
    return { success: false, error: error.message || 'Failed to create armor piece.' };
  }
}

export async function updateArmorPiece(armorData: UpdateArmorPieceInput): Promise<ActionResponse> {
  if (!armorData.id) {
    return { success: false, error: 'Armor piece ID is required for an update.' };
  }
  try {
    const armorRef = doc(db, 'armorPieces', armorData.id);
    const { id, ...dataToUpdate } = armorData;
    await updateDoc(armorRef, dataToUpdate);
    return { success: true, message: 'Armor piece updated successfully.' };
  } catch (error: any) {
    console.error('Error updating armor piece: ', error);
    return { success: false, error: error.message || 'Failed to update armor piece.' };
  }
}

export async function deleteArmorPiece(armorId: string): Promise<ActionResponse> {
    if (!armorId) {
        return { success: false, error: 'Armor piece ID is required.' };
    }
    try {
        await deleteDoc(doc(db, 'armorPieces', armorId));
        return { success: true, message: 'Armor piece deleted.' };
    } catch (error: any) {
        console.error("Error deleting armor piece:", error);
        return { success: false, error: 'Failed to delete armor piece.' };
    }
}
