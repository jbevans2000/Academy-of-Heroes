
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
    
    // Use the base HP from classData for level 1, otherwise use the student's current HP
    // for incremental updates.
    let startingHp = student.level === 1 && student.class ? classData[student.class].baseStats.hp : student.hp;

    let totalHpGain = 0;
    if (newLevel > oldLevel) {
        const levelsGained = newLevel - oldLevel;
        for (let i = 0; i < levelsGained; i++) {
            totalHpGain += getHpGainForClass(student.class);
        }
        console.log(`Leveled up! Gained ${levelsGained} level(s) and ${totalHpGain} HP.`);
    }

    // If we are recalculating (student level is 1), we start from base HP.
    // Otherwise, we add to current HP.
    const finalHp = student.level === 1 ? startingHp + totalHpGain : student.hp + totalHpGain;

    return {
        newLevel: newLevel,
        newHp: finalHp,
    };
}
