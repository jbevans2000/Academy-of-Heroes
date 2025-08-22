
'use server';

import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Boon } from '@/lib/boons';
import { logGameEvent } from '@/lib/gamelog';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const defaultBoons = [
  {
    name: "Jester's Favor",
    description: "Share a school-appropriate joke with the class.",
    cost: 50,
    imageUrl: "https://placehold.co/400x400.png",
    effect: { type: 'REAL_WORLD_PERK', value: "Tell a joke in class." },
  },
  {
    name: "Scribe's Permission",
    description: "Use a special pen or marker for your assignments for the day.",
    cost: 75,
    imageUrl: "https://placehold.co/400x400.png",
    effect: { type: 'REAL_WORLD_PERK', value: "Use a special pen for the day." },
  },
  {
    name: "Wanderer's Pass",
    description: "Choose your seat for one class period.",
    cost: 100,
    imageUrl: "https://placehold.co/400x400.png",
    effect: { type: 'REAL_WORLD_PERK', value: "Choose seat for the day." },
  },
  {
    name: "Oracle's Insight",
    description: "Get a one-minute private consultation with the Guildmaster about an assignment.",
    cost: 150,
    imageUrl: "https://placehold.co/400x400.png",
    effect: { type: 'REAL_WORLD_PERK', value: "1-minute private teacher consultation." },
  },
  {
    name: "Bard's Tune",
    description: "Listen to music with headphones during independent work.",
    cost: 200,
    imageUrl: "https://placehold.co/400x400.png",
    effect: { type: 'REAL_WORLD_PERK', value: "Listen to music during independent work." },
  },
  {
    name: "Time-Turner's Grace",
    description: "A 24-hour extension on one assignment.",
    cost: 300,
    imageUrl: "https://placehold.co/400x400.png",
    effect: { type: 'REAL_WORLD_PERK', value: "24-hour assignment extension." },
  },
  {
    name: "Scholar's Pardon",
    description: "A one-time pass on a single, small homework assignment.",
    cost: 500,
    imageUrl: "https://placehold.co/400x400.png",
    effect: { type: 'REAL_WORLD_PERK', value: "Single small homework pass." },
  },
  {
    name: "Emissary's Duty",
    description: "Be the line leader or designated helper for the day.",
    cost: 120,
    imageUrl: "https://placehold.co/400x400.png",
    effect: { type: 'REAL_WORLD_PERK', value: "Line leader or teacher's helper." },
  },
  {
    name: "Keeper of the Scroll",
    description: "Be in charge of the remote control for the projector for one lesson.",
    cost: 90,
    imageUrl: "https://placehold.co/400x400.png",
    effect: { type: 'REAL_WORLD_PERK', value: "Controls the projector remote." },
  },
];


type CreateBoonInput = Omit<Boon, 'id' | 'createdAt' | 'isVisibleToStudents'>;

export async function populateDefaultBoons(teacherUid: string): Promise<ActionResponse> {
  if (!teacherUid) return { success: false, error: 'User not authenticated.' };
  try {
      const boonsRef = collection(db, 'teachers', teacherUid, 'boons');
      const batch = writeBatch(db);

      defaultBoons.forEach(boon => {
          const docRef = doc(boonsRef);
          batch.set(docRef, { ...boon, isVisibleToStudents: false, createdAt: serverTimestamp() });
      });
      await batch.commit();
      await logGameEvent(teacherUid, 'GAMEMASTER', 'Populated the Boons Workshop with default items.');
      return { success: true };
  } catch (error: any) {
      console.error("Error populating boons:", error);
      return { success: false, error: error.message || "Could not add the default boons." };
  }
}

export async function createBoon(teacherUid: string, boonData: CreateBoonInput): Promise<ActionResponse> {
  if (!teacherUid) return { success: false, error: 'User not authenticated.' };
  if (!boonData.name || boonData.cost < 0) {
    return { success: false, error: 'Invalid boon data. Name and a non-negative cost are required.' };
  }

  try {
    const boonsRef = collection(db, 'teachers', teacherUid, 'boons');
    await addDoc(boonsRef, {
      ...boonData,
      isVisibleToStudents: false, // Always hidden by default
      createdAt: serverTimestamp(),
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
    
    // Also update the public boon if it exists
    if (boonData.isVisibleToStudents) {
        const publicBoonRef = doc(db, 'publicBoons', teacherUid, 'boons', boonData.id);
        await setDoc(publicBoonRef, {
             name: boonData.name,
             description: boonData.description,
             cost: boonData.cost,
             imageUrl: boonData.imageUrl,
             effect: boonData.effect
        }, { merge: true });
    }

    await logGameEvent(teacherUid, 'GAMEMASTER', `Updated boon: ${boonData.name}.`);
    return { success: true, message: 'Boon updated successfully.' };
  } catch (error: any) {
    console.error("Error updating boon: ", error);
    return { success: false, error: error.message || 'Failed to update boon.' };
  }
}

export async function updateBoonVisibility(teacherUid: string, boonId: string, boon: Boon, isVisible: boolean): Promise<ActionResponse> {
    if (!teacherUid) return { success: false, error: 'User not authenticated.' };
    
    const teacherBoonRef = doc(db, 'teachers', teacherUid, 'boons', boonId);
    const publicBoonRef = doc(db, 'publicBoons', teacherUid, 'boons', boonId);

    try {
        if (isVisible) {
            // Make boon visible: update teacher's copy and create/update public copy
            const batch = writeBatch(db);
            batch.update(teacherBoonRef, { isVisibleToStudents: true });
            
            // Data for the public document (only safe fields)
            const publicData = {
                name: boon.name,
                description: boon.description,
                cost: boon.cost,
                imageUrl: boon.imageUrl,
                effect: boon.effect
            };
            batch.set(publicBoonRef, publicData);

            await batch.commit();

        } else {
            // Make boon hidden: update teacher's copy and delete public copy
             const batch = writeBatch(db);
             batch.update(teacherBoonRef, { isVisibleToStudents: false });
             batch.delete(publicBoonRef);
             await batch.commit();
        }

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
    const batch = writeBatch(db);
    // Delete the teacher's version
    const boonRef = doc(db, 'teachers', teacherUid, 'boons', boonId);
    batch.delete(boonRef);

    // Also delete the public version if it exists
    const publicBoonRef = doc(db, 'publicBoons', teacherUid, 'boons', boonId);
    batch.delete(publicBoonRef);

    await batch.commit();

    await logGameEvent(teacherUid, 'GAMEMASTER', `Deleted boon with ID: ${boonId}.`);
    return { success: true, message: 'Boon deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting boon: ", error);
    return { success: false, error: error.message || 'Failed to delete boon.' };
  }
}
