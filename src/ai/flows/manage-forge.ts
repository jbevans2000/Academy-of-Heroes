
'use server';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ArmorPiece } from '@/lib/forge';

type CreateArmorPieceInput = Omit<ArmorPiece, 'id' | 'isPublished' | 'transforms'>;

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function addArmorPiece(armorData: CreateArmorPieceInput): Promise<ActionResponse> {
  if (!armorData.name || !armorData.description || !armorData.imageUrl || !armorData.slot || !armorData.classRequirement) {
    return { success: false, error: 'Missing required armor data.' };
  }

  try {
    const armorRef = collection(db, 'armorPieces');
    await addDoc(armorRef, {
        ...armorData,
        levelRequirement: Number(armorData.levelRequirement) || 1,
        goldCost: Number(armorData.goldCost) || 0,
        isPublished: false,
        transforms: {},
        createdAt: serverTimestamp(),
    });
    return { success: true, message: 'Armor piece added to the forge.' };
  } catch (error: any) {
    console.error('Error adding armor piece: ', error);
    return { success: false, error: error.message || 'Failed to create armor piece.' };
  }
}
