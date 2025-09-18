

import type { ClassType } from "./data";

export const MAX_LEVEL = 20;
// XP required to reach level 20 is 15000.
export const XP_FOR_MAX_LEVEL = 15000;

// XP thresholds for each level. To reach level X, you need xpForLevel[X-1] total XP.
const xpForLevel = {
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
};

export function calculateLevel(xp: number): number {
    if (xp < 0) return 1;
    if (xp >= XP_FOR_MAX_LEVEL) return MAX_LEVEL;
    
    let currentLevel = 1;
    for (let level = 2; level <= MAX_LEVEL; level++) {
        if (xp >= xpForLevel[level as keyof typeof xpForLevel]) {
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


// New function to calculate base max HP without randomness, for resetting after battles
export function calculateBaseMaxHp(characterClass: ClassType, level: number, statType: 'hp' | 'mp' = 'hp'): number {
    const baseStats: { [key in ClassType]?: { base: number, perLevel: number } } = {
        'Mage': { base: 6, perLevel: 3 }, // Average of 1d4 is 2.5, let's say 3
        'Healer': { base: 8, perLevel: 4 }, // Average of 1d6 is 3.5, let's say 4
        'Guardian': { base: 12, perLevel: 5 } // Average of 1d8 is 4.5, let's say 5
    };
    
    const magicStats: { [key in ClassType]?: { base: number, perLevel: number } } = {
        'Mage': { base: 15, perLevel: 5 }, // Avg of 1d8
        'Healer': { base: 12, perLevel: 4 }, // Avg of 1d6
        'Guardian': { base: 8, perLevel: 3 } // Avg of 1d4
    };

    const stats = statType === 'hp' ? baseStats[characterClass] : magicStats[characterClass];
    if (!stats) return 0;
    
    return stats.base + (stats.perLevel * (level - 1));
}
