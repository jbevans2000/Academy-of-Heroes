'use server';

import { doc, getDoc, collection, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { Power } from '@/lib/powers';

interface UsePowerInput {
    teacherUid: string;
    studentUid: string;
    battleId: string;
    power: Power;
}

/**
 * A server action that will handle the logic for using a power.
 * This is the entry point for all power activations.
 */
export async function usePower(input: UsePowerInput): Promise<{ success: boolean; message: string }> {
    const { teacherUid, studentUid, battleId, power } = input;
    
    console.log(`Power "${power.name}" used by student ${studentUid} in battle ${battleId} for teacher ${teacherUid}.`);

    // Placeholder: Future logic for different powers will go here.
    
    return {
        success: true,
        message: `${power.name} has been successfully cast!`,
    }
}
