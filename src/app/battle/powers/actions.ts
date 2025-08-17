'use server';

import { doc, getDoc, collection, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { Power } from '@/lib/powers';
import { logGameEvent } from '@/lib/gamelog';
import { useNaturesGuidance } from './natures-guidance';


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
    
    // Dispatch to the correct power logic based on its name
    switch(power.name) {
        case 'Nature’s Guidance':
            return useNaturesGuidance({ teacherUid, studentUid, battleId, power });
        // Future powers can be added as cases here
        // case 'Wildfire':
        //    return useWildfire({ teacherUid, studentUid, battleId, power });
        default:
            console.log(`Power "${power.name}" used by student ${studentUid} in battle ${battleId} for teacher ${teacherUid}.`);
             return {
                success: false,
                message: `The logic for ${power.name} has not been implemented yet.`,
            }
    }
}
