
'use server';

import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, writeBatch, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Boon } from '@/lib/boons';
import { logGameEvent } from '@/lib/gamelog';
import { logBoonTransaction } from '@/lib/transactions';

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
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2FJester's%20Favor.jpg?alt=media&token=294dd79f-bc38-4465-86c2-50fbbedbbc60",
    effect: { type: 'REAL_WORLD_PERK', value: "Tell a joke in class." },
    requiresApproval: true,
    studentMessage: "Inform your Guild Leader you have used this Reward!",
  },
  {
    name: "Scribe's Permission",
    description: "Use a special pen or marker for your assignments for the day.",
    cost: 75,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2FScribe's%20Permission.jpg?alt=media&token=424602ba-50d4-4b00-9379-286024d93a5f",
    effect: { type: 'REAL_WORLD_PERK', value: "Use a special pen for the day." },
    requiresApproval: false,
    studentMessage: "Inform your Guild Leader you have used this Reward!",
  },
  {
    name: "Wanderer's Pass",
    description: "Choose your seat for one class period.",
    cost: 100,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2FWanderer's%20Pass.jpg?alt=media&token=69ce6dcc-5e34-46ae-ba00-c17bf500da33",
    effect: { type: 'REAL_WORLD_PERK', value: "Choose seat for the day." },
    requiresApproval: true,
    studentMessage: "Inform your Guild Leader you have used this Reward!",
  },
  {
    name: "Emissary's Duty",
    description: "Deliver a message to another classroom or teacher.",
    cost: 120,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2FEmissary's%20Duty.jpg?alt=media&token=45484a0f-d05c-40d7-bae0-6a2cbedc9242",
    effect: { type: 'REAL_WORLD_PERK', value: "Deliver a message to another classroom." },
    requiresApproval: true,
    studentMessage: "Inform your Guild Leader you have used this Reward!",
  },
  {
    name: "Oracle's Insight",
    description: "Get a one-minute private consultation with the Guildmaster about an assignment.",
    cost: 150,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2FOracle's%20Insight.jpg?alt=media&token=a41ef92b-6b7f-4ea4-80da-50372fd109aa",
    effect: { type: 'REAL_WORLD_PERK', value: "1-minute private teacher consultation." },
    requiresApproval: true,
    studentMessage: "Inform your Guild Leader you have used this Reward!",
  },
  {
    name: "Bard's Tune",
    description: "Listen to music with headphones during independent work.",
    cost: 200,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2FBard's%20Tune.jpg?alt=media&token=89a03ef6-26bc-46fa-9b84-2183f6528437",
    effect: { type: 'REAL_WORLD_PERK', value: "Listen to music during independent work." },
    requiresApproval: false,
    studentMessage: "Inform your Guild Leader you have used this Reward!",
  },
  {
    name: "Hero's Respite",
    description: "Leave 5 minutes early for recess.",
    cost: 200,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2FHeroes%20Respite.jpg?alt=media&token=3419c982-2aec-4ab7-adce-07011af329a6",
    effect: { type: 'REAL_WORLD_PERK', value: "Leave 5 minutes early for recess." },
    requiresApproval: true,
    studentMessage: "Inform your Guild Leader you have used this Reward!",
  },
  {
    name: "Time-Turner's Grace",
    description: "A 24-hour extension on one assignment.",
    cost: 300,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2FTime%20Turner's%20Grace.jpg?alt=media&token=57032694-2c8a-42ec-b26e-7c0a2c414d50",
    effect: { type: 'REAL_WORLD_PERK', value: "24-hour assignment extension." },
    requiresApproval: false,
    studentMessage: "Inform your Guild Leader you have used this Reward!",
  },
   {
    name: "Keeper of the Scroll",
    description: "Erase one incorrect answer on a past assignment before it is graded.",
    cost: 400,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2FKeeper%20of%20the%20Scroll.jpg?alt=media&token=8a3bcfce-a86c-40a3-8cba-1b7a4754f3dd",
    effect: { type: 'REAL_WORLD_PERK', value: "Erase one incorrect answer on a past assignment." },
    requiresApproval: false,
    studentMessage: "Inform your Guild Leader you have used this Reward!",
  },
  {
    name: "Scholar's Pardon",
    description: "A one-time pass on a single, small homework assignment.",
    cost: 500,
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/boon-icons%2FScholar's%20Pardon.jpg?alt=media&token=900a3c30-0a94-4585-bff6-13621f9a1a33",
    effect: { type: 'REAL_WORLD_PERK', value: "Single small homework pass." },
    requiresApproval: false,
    studentMessage: "Inform your Guild Leader you have used this Reward!",
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
      isVisibleToStudents: true, // Visible by default now
      createdAt: serverTimestamp(),
    });
    await logGameEvent(teacherUid, 'GAMEMASTER', `Created a new boon: ${boonData.name}.`);
    return { success: true, message: 'Boon created successfully.' };
  } catch (error: any) {
    console.error("Error creating boon: ", error);
    return { success: false, error: error.message || 'Failed to create boon.' };
  }
}

type UpdateBoonInput = Partial<Boon> & { id: string };

export async function updateBoon(teacherUid: string, boonData: UpdateBoonInput): Promise<ActionResponse> {
  if (!teacherUid) return { success: false, error: 'User not authenticated.' };
  
  try {
    const boonRef = doc(db, 'teachers', teacherUid, 'boons', boonData.id);
    const { id, ...dataToUpdate } = boonData;
    await updateDoc(boonRef, dataToUpdate);
    await logGameEvent(teacherUid, 'GAMEMASTER', `Updated boon: ${boonData.name || boonData.id}.`);
    return { success: true, message: 'Boon updated successfully.' };
  } catch (error: any) {
    console.error("Error updating boon: ", error);
    return { success: false, error: error.message || 'Failed to update boon.' };
  }
}

export async function updateBoonVisibility(teacherUid: string, boonId: string, isVisible: boolean): Promise<ActionResponse> {
    if (!teacherUid) return { success: false, error: 'User not authenticated.' };
    
    const boonRef = doc(db, 'teachers', teacherUid, 'boons', boonId);

    try {
        await setDoc(boonRef, { isVisibleToStudents: isVisible }, { merge: true });
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

interface ApproveBoonRequestInput {
    teacherUid: string;
    requestId: string;
}

export async function approveBoonRequest(input: ApproveBoonRequestInput): Promise<ActionResponse> {
    const { teacherUid, requestId } = input;
    if (!teacherUid || !requestId) return { success: false, error: 'Invalid input.' };

    const requestRef = doc(db, 'teachers', teacherUid, 'pendingBoonRequests', requestId);

    try {
        return await runTransaction(db, async (transaction) => {
            const requestSnap = await transaction.get(requestRef);
            if (!requestSnap.exists()) throw new Error("This boon request no longer exists.");

            const { studentUid, boonId, boonName, cost, characterName } = requestSnap.data();
            const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
            const studentSnap = await transaction.get(studentRef);

            if (!studentSnap.exists()) throw new Error("The student who made this request could not be found.");

            const student = studentSnap.data();

            if (student.gold < cost) {
                // If student can't afford it anymore, delete the request and inform teacher.
                transaction.delete(requestRef);
                return { success: false, error: `${characterName} no longer has enough gold (${cost}) for this boon. Request removed.` };
            }

            const newGold = student.gold - cost;
            const currentQuantity = student.inventory?.[boonId] || 0;
            const newQuantity = currentQuantity + 1;

            transaction.update(studentRef, { 
                gold: newGold,
                [`inventory.${boonId}`]: newQuantity
            });
            
            await logBoonTransaction(teacherUid, studentUid, characterName, boonName, 'purchase', cost);

            // Delete the processed request
            transaction.delete(requestRef);

            await logGameEvent(teacherUid, 'GAMEMASTER', `Approved boon purchase for ${characterName}: ${boonName}.`);

            return { success: true, message: `Boon purchase for ${characterName} approved!` };
        });
    } catch (error: any) {
        console.error("Error approving boon request:", error);
        return { success: false, error: error.message || 'Failed to approve request.' };
    }
}

export async function denyBoonRequest(teacherUid: string, requestId: string): Promise<ActionResponse> {
    if (!teacherUid || !requestId) return { success: false, error: 'Invalid input.' };

    try {
        const requestRef = doc(db, 'teachers', teacherUid, 'pendingBoonRequests', requestId);
        await deleteDoc(requestRef);

        await logGameEvent(teacherUid, 'GAMEMASTER', `Denied and deleted boon request ${requestId}.`);
        return { success: true, message: 'Request denied.' };
    } catch (error: any) {
        console.error("Error denying boon request:", error);
        return { success: false, error: "Failed to deny the request." };
    }
}

    

    
