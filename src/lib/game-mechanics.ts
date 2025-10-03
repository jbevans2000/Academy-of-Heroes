
import type { ClassType, Student } from "./data";

export const MAX_LEVEL = 30;
// XP required to reach level 30 is 55000.
export const XP_FOR_MAX_LEVEL = 55000;

// XP thresholds for each level. To reach level X, you need xpForLevel[X] total XP.
export const xpForLevel: { [level: number]: number } = {
    1: 0,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
    6: 600,
    7: 900,
    8: 1400,
    9: 2000,
    10: 2600,
    11: 3200,
    12: 3800,
    13: 4600,
    14: 5400,
    15: 6500,
    16: 7800,
    17: 9000,
    18: 11000,
    19: 12500,
    20: 15000,
    21: 17500,
    22: 20000,
    23: 23000,
    24: 26000,
    25: 30000,
    26: 34000,
    27: 38000,
    28: 43000,
    29: 48000,
    30: 55000,
};

export function calculateLevel(xp: number, customXpTable?: { [level: number]: number }): number {
    const table = customXpTable && Object.keys(customXpTable).length > 0 ? customXpTable : xpForLevel;
    const maxXP = table[MAX_LEVEL] || XP_FOR_MAX_LEVEL;

    if (xp < 0) return 1;
    if (xp >= maxXP) return MAX_LEVEL;
    
    let currentLevel = 1;
    for (let level = 2; level <= MAX_LEVEL; level++) {
        if (xp >= table[level]) {
            currentLevel = level;
        } else {
            break;
        }
    }
    return currentLevel;
}

function rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
}

export function calculateHpGain(
    characterClass: ClassType, 
    levelsGained: number
): number {
    let totalHpGained = 0;
    
    const hitDieSides: { [key in ClassType]?: number } = {
        'Mage': 4,
        'Healer': 6,
        'Guardian': 8
    };

    const dieSides = hitDieSides[characterClass];

    if (dieSides) {
        for (let i = 0; i < levelsGained; i++) {
            totalHpGained += rollDie(dieSides);
        }
    }
    
    return totalHpGained;
}

export function calculateMpGain(
    characterClass: ClassType, 
    levelsGained: number
): number {
    let totalMpGained = 0;
    
    const magicDieSides: { [key in ClassType]?: number } = {
        'Mage': 8,
        'Healer': 6,
        'Guardian': 4
    };

    const dieSides = magicDieSides[characterClass];

    if (dieSides) {
        for (let i = 0; i < levelsGained; i++) {
            totalMpGained += rollDie(dieSides);
        }
    }
    
    return totalMpGained;
}


/**
 * Calculates a non-random, deterministic base stat value for a given level.
 * This is used for de-leveling a student to avoid the complexity of reversing random dice rolls.
 * It should NOT be used for calculating gains during a level-up.
 * The 'perLevel' value is the rounded-up average of the class's hit/magic die.
 * @param characterClass The student's class.
 * @param level The target level.
 * @param statType 'hp' or 'mp'.
 * @returns The calculated base maximum for that stat.
 */
export function calculateBaseMaxHp(characterClass: ClassType, level: number, statType: 'hp' | 'mp' = 'hp'): number {
    const baseStats: { [key in ClassType]?: { base: number, perLevel: number } } = {
        'Guardian': { base: 12, perLevel: 5 }, // Avg of 1d8 (4.5) rounded up
        'Healer': { base: 8, perLevel: 4 },   // Avg of 1d6 (3.5) rounded up
        'Mage': { base: 6, perLevel: 3 },     // Avg of 1d4 (2.5) rounded up
    };
    
    const magicStats: { [key in ClassType]?: { base: number, perLevel: number } } = {
        'Guardian': { base: 8, perLevel: 3 }, // Avg of 1d4 (2.5) rounded up
        'Healer': { base: 12, perLevel: 4 },  // Avg of 1d6 (3.5) rounded up
        'Mage': { base: 15, perLevel: 5 },   // Avg of 1d8 (4.5) rounded up
    };

    const stats = statType === 'hp' ? baseStats[characterClass] : magicStats[characterClass];
    if (!stats) return 0;
    
    return stats.base + (stats.perLevel * (level - 1));
}


/**
 * Centralized function to handle all level-up and level-down logic.
 * @param studentData The current data of the student.
 * @param newXp The student's new total XP.
 * @returns An object with the stats to update.
 */
export function handleLevelChange(studentData: Student, newXp: number, customXpTable?: { [level: number]: number }): Partial<Student> {
    const updates: Partial<Student> = { xp: newXp };
    const currentLevel = studentData.level || 1;
    const newLevel = calculateLevel(newXp, customXpTable);

    if (newLevel > currentLevel) {
        const levelsGained = newLevel - currentLevel;
        updates.level = newLevel;
        // Correctly increment max stats by ADDING gains to existing values
        updates.maxHp = (studentData.maxHp || calculateBaseMaxHp(studentData.class, currentLevel, 'hp')) + calculateHpGain(studentData.class, levelsGained);
        updates.maxMp = (studentData.maxMp || calculateBaseMaxHp(studentData.class, currentLevel, 'mp')) + calculateMpGain(studentData.class, levelsGained);
        // Restore to new max on level up
        updates.hp = updates.maxHp;
        updates.mp = updates.maxMp;
    } else if (newLevel < currentLevel) {
        updates.level = newLevel;
        // De-leveling: Recalculate base stats for the new, lower level
        updates.maxHp = calculateBaseMaxHp(studentData.class, newLevel, 'hp');
        updates.maxMp = calculateBaseMaxHp(studentData.class, newLevel, 'mp');
        // Cap current HP/MP at new max values
        updates.hp = Math.min(studentData.hp, updates.maxHp);
        updates.mp = Math.min(studentData.mp, updates.maxMp);
    }
    
    return updates;
}
