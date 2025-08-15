
'use client';

import { classData, type Student, type ClassType } from "./data";

/**
 * Rolls a six-sided die.
 * @returns A random number between 1 and 6.
 */
function rollD6(): number {
    return Math.floor(Math.random() * 6) + 1;
}

/**
 * Calculates the HP gain for a specific class on level up.
 * @param characterClass The class of the character.
 * @returns The amount of HP gained.
 */
function getHpGainForClass(characterClass: ClassType): number {
    if (!characterClass) return rollD6();
    const baseRoll = rollD6();
    switch (characterClass) {
        case 'Guardian':
            return baseRoll + 3;
        case 'Healer':
            return baseRoll + 2;
        case 'Mage':
            return baseRoll + 1;
        default:
            return baseRoll; // Default case
    }
}

/**
 * Calculates the new level and HP for a student based on new XP.
 * This function can calculate from any level, assuming the base HP is correct for that level.
 * To recalculate from scratch, pass in a student object at level 1 with base HP.
 * @param student The student's current data (or a base version for recalculation).
 * @param newXp The student's new total XP.
 * @returns An object with the new level and new HP.
 */
export function calculateLevelUp(student: Pick<Student, 'xp' | 'level' | 'hp' | 'class'>, newXp: number): { newLevel: number, newHp: number } {
    const oldLevel = student.level;
    const newLevel = Math.floor(newXp / 100) + 1;
    
    // Always start with the base HP for the class.
    let finalHp = student.class ? classData[student.class].baseStats.hp : 100;

    // If the student is leveling up or we are recalculating, calculate total HP from scratch.
    if (newLevel > 1) {
        // Loop from level 2 up to the new level, accumulating HP gain for each level.
        for (let i = 2; i <= newLevel; i++) {
            finalHp += getHpGainForClass(student.class);
        }
    }

    if (newLevel > oldLevel) {
        console.log(`Leveled up! ${student.class} went from Lvl ${oldLevel} to ${newLevel}. HP is now ${finalHp}.`);
    }

    return {
        newLevel: newLevel,
        newHp: finalHp,
    };
}

