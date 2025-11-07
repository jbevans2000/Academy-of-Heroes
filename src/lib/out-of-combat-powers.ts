
import type { ClassType } from "./data";

export interface OutOfCombatPower {
    name: string;
    description: string;
    level: number;
    mpCost: number;
    target?: 'ally';
    targetCount?: number;
    targetSelf?: boolean;
    isMultiStep?: boolean; // For powers that need an input step first
    imageUrl: string;
}

interface ClassOutOfCombatPowers {
    [key: string]: OutOfCombatPower[];
}

export const outOfCombatPowers: ClassOutOfCombatPowers = {
  Healer: [
    {
      name: 'Lesser Heal',
      description: 'You call upon the powers of life to soothe your party’s wounds!',
      level: 2,
      mpCost: 3,
      target: 'ally',
      targetCount: 2,
      targetSelf: true,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/2025-09-07T05%3A32%3A24_27616%2FLesser%20Heal.jpg?alt=media&token=7d7d2076-1539-4a5b-8a38-255787527822',
    },
    {
      name: 'Focused Restoration',
      description: 'You point your healing energy towards a single ally, restoring a large amount of their health. Ally must have less than 50% health.',
      level: 8,
      mpCost: 12,
      target: 'ally',
      targetCount: 1,
      targetSelf: true,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/2025-09-07T05%3A32%3A24_27616%2Ffocused%20restoration.jpg?alt=media&token=e71c9449-6b54-44eb-9c01-762797da1b6d',
    },
  ],
  Mage: [
     {
      name: 'Psionic Aura',
      description: 'You call upon the leylines to recharge the arcane potential of TWO Allies. Targets must be at or below 75% of their max MP.',
      level: 2,
      mpCost: 4,
      target: 'ally',
      targetSelf: false,
      targetCount: 2,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/2025-09-07T05%3A32%3A24_27616%2Fpsionic%20aura.jpg?alt=media&token=d122945d-944b-4007-adc4-1330763dae70',
    },
    {
      name: 'Psychic Flare',
      description: "You channel a beam of restorative arcane energies into an ally, restoring them to full magic points. Target must be below 50% MP. This power costs 50% of your current Magic Points, with a minimum cost of 20 MP.",
      level: 9,
      mpCost: 20, // Min cost, actual is dynamic
      target: 'ally',
      targetSelf: true, // Can target self
      targetCount: 1,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/2025-09-07T05%3A32%3A24_27616%2Fpsychic%20flare.jpg?alt=media&token=1b1d3051-2030-452c-94d8-06109e632e95',
    },
  ],
  Guardian: [
    {
      name: 'Absorb',
      description: 'Convert your own life force into magical energy. For every 2 HP sacrificed, you will gain 1 MP.',
      level: 5,
      mpCost: 0,
      isMultiStep: true,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/2025-09-07T05%3A32%3A24_27616%2Fabsorb.jpg?alt=media&token=425d506a-a534-4d23-9f87-3d964f51e360',
    },
  ],
};
