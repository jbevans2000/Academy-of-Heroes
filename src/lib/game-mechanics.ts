

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
