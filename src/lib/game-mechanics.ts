

import type { ClassType } from "./data";

export function calculateLevel(xp: number): number {
    if (xp < 0) return 1;
    return Math.floor(xp / 100) + 1;
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
