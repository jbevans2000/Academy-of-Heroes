'use server';
import { doc, getDoc, runTransaction, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import type { Power } from '@/lib/powers';
import { logGameEvent } from '@/lib/gamelog';

interface UsePowerInput {
    teacherUid: string;
    studentUid: string;
    battleId: string;
    power: Power;
}

interface LiveBattleState {
  battleId: string;
  currentQuestionIndex: number;
  naturesGuidanceUses?: number;
  removedAnswerIndices?: number[];
}

interface BattleDefinition {
    questions: {
        correctAnswerIndex: number;
        answers: string[];
    }[];
}

async function useNaturesGuidance(input: UsePowerInput): Promise<{ success: boolean; message: string }> {
    const { teacherUid, studentUid, battleId, power } = input;

    try {
        const battleDefRef = doc(db, 'teachers', teacherUid, 'bossBattles', battleId);
        const battleDefSnap = await getDoc(battleDefRef);
        if (!battleDefSnap.exists()) {
            throw new Error("Battle definition not found.");
        }
        const battleDef = battleDefSnap.data() as BattleDefinition;

        const result = await runTransaction(db, async (transaction) => {
            const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
            const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);

            const [liveBattleSnap, studentSnap] = await Promise.all([
                transaction.get(liveBattleRef),
                transaction.get(studentRef)
            ]);

            if (!liveBattleSnap.exists()) {
                throw new Error("Live battle not found.");
            }
            if (!studentSnap.exists()) {
                throw new Error("Student not found.");
            }

            const liveBattleData = liveBattleSnap.data() as LiveBattleState;
            const studentData = studentSnap.data() as Student;
            
            if (studentData.mp < power.mpCost) {
                return { success: false, message: "Not enough MP to cast Nature's Guidance!" };
            }

            const usesThisRound = liveBattleData.naturesGuidanceUses || 0;
            if (usesThisRound >= 2) {
                await logGameEvent(teacherUid, 'BOSS_BATTLE', `${studentData.characterName} attempted to use Nature's Guidance, but the way was already clear.`);
                return { success: false, message: "The Spirits Refuse to Answer Your Call!" };
            }

            const currentQuestion = battleDef.questions[liveBattleData.currentQuestionIndex];
            const incorrectAnswerIndices = currentQuestion.answers
                .map((_, index) => index)
                .filter(index => index !== currentQuestion.correctAnswerIndex);
            
            const alreadyRemoved = liveBattleData.removedAnswerIndices || [];
            const availableToRemove = incorrectAnswerIndices.filter(index => !alreadyRemoved.includes(index));

            if (availableToRemove.length === 0) {
                 return { success: false, message: "No more incorrect answers can be removed!" };
            }

            const indexToRemove = availableToRemove[Math.floor(Math.random() * availableToRemove.length)];

            transaction.update(studentRef, { mp: increment(-power.mpCost) });
            transaction.update(liveBattleRef, {
                naturesGuidanceUses: increment(1),
                removedAnswerIndices: [...alreadyRemoved, indexToRemove],
                powerEventMessage: `Glimmering light surrounds the question, revealing a false path!`
            });

            await logGameEvent(teacherUid, 'BOSS_BATTLE', `${studentData.characterName} used Nature's Guidance.`);
            return { success: true, message: `An incorrect answer has been revealed!` };
        });

        return result;

    } catch (error) {
        console.error("Error in useNaturesGuidance transaction:", error);
        return { success: false, message: "An unexpected error occurred while casting the power." };
    }
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
