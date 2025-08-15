
'use client';

import type { Student, ClassType } from "./data";

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
 * @param student The student's current data.
 * @param newXp The student's new total XP.
 * @returns An object with the new level and new HP.
 */
export function calculateLevelUp(student: Pick<Student, 'xp' | 'level' | 'hp' | 'class'>, newXp: number): { newLevel: number, newHp: number } {
    const oldLevel = student.level;
    const newLevel = Math.floor(newXp / 100) + 1;
    
    let totalHpGain = 0;
    if (newLevel > oldLevel) {
        const levelsGained = newLevel - oldLevel;
        for (let i = 0; i < levelsGained; i++) {
            totalHpGain += getHpGainForClass(student.class);
        }
        console.log(`Leveled up! ${student.characterName} gained ${levelsGained} level(s) and ${totalHpGain} HP.`);
    }

    return {
        newLevel: newLevel,
        newHp: student.hp + totalHpGain,
    };
}
