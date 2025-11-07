
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
      type: 'support',
      target: 'ally',
      targetSelf: false,
      targetCount: 2,
      outOfCombat: true,
    },
    {
      name: 'Psychic Flare',
      description: "You channel a beam of restorative arcane energies into an ally, restoring them to full magic points. Target must be below 50% MP. This power costs 50% of your current Magic Points, with a minimum cost of 20 MP.",
      level: 9,
      mpCost: 20, // Min cost, actual is dynamic
      type: 'support',
      target: 'ally',
      targetSelf: true, // Can target self
      targetCount: 1,
      outOfCombat: true,
    },
  ],
  Guardian: [
    {
      name: 'Veteran\'s Insight',
      description: 'Share your experience with up to 3 lower-level company members, granting each an XP boost. Costs 20% of your max MP and can be used once per day.',
      level: 10,
      mpCost: 0, // This is dynamic, but the field is required.
      target: 'ally',
      targetCount: 3,
      targetSelf: false,
      imageUrl: 'https://placehold.co/200x200.png',
    },
  ],
};
