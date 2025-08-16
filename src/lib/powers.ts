
export type PowerType = 'damage' | 'support' | 'healing' | 'utility';

export interface Power {
    name: string;
    description: string;
    level: number;
    type: PowerType;
}

interface ClassPowers {
    [key: string]: Power[];
}

export const classPowers: ClassPowers = {
  Mage: [
    {
      name: 'Wildfire',
      description: 'Deals 2d6 + your Level in damage to the boss on a correct answer.',
      level: 1,
      type: 'damage',
    },
    {
      name: 'Psionic Aura',
      description: 'Two random players recharge 1d4 + your Level in Magic Points.',
      level: 3,
      type: 'support',
    },
    {
      name: 'Sorcerer’s Intuition',
      description: 'Guarantees an automatic hit for 3 base damage, regardless of your answer.',
      level: 5,
      type: 'utility',
    },
    {
      name: 'Psychic Flare',
      description: 'A teammate of your choice replenishes ALL of their magic points.',
      level: 7,
      type: 'support',
    },
    {
      name: 'Elemental Fusion',
      description: 'Your party scores DOUBLE base damage for all correct answers. (Max 1 use per battle)',
      level: 9,
      type: 'damage',
    },
    {
      name: 'Mage Shield',
      description: 'Shield 3 players of your choice, making them immune to damage for 3 rounds.',
      level: 11,
      type: 'support',
    },
    {
      name: 'Chaos Storm',
      description: 'Deals a massive 3d20 + your Level in damage. (Max 1 use per battle)',
      level: 13,
      type: 'damage',
    },
    {
      name: 'Arcane Sacrifice',
      description: 'Your HP falls to zero, but all other players have their power slots restored and gain a 25% XP bonus.',
      level: 15,
      type: 'utility',
    },
  ],
  Guardian: [
    // To be added later
  ],
  Healer: [
    // To be added later
  ],
};
