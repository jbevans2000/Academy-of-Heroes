
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
    {
      name: 'Guard',
      description: 'Shield 3 players this round, redirecting a portion of the damage to themselves.',
      level: 1,
      type: 'support',
    },
    {
      name: 'Intercept',
      description: 'Answer a question on a teammate\'s behalf. A correct answer deals 5 base damage to the boss.',
      level: 3,
      type: 'damage',
    },
    {
      name: 'Absorb',
      description: 'Soak an amount of damage for the party that is TRIPLE your current level.',
      level: 5,
      type: 'support',
    },
    {
      name: 'Berserker Strike',
      description: 'Roll 1d20. On 11+, deal that much damage + your level. On 1-10, you take 5 damage.',
      level: 7,
      type: 'damage',
    },
    {
      name: 'Arcane Redirect',
      description: 'Causes all damage done by Wildfires to be tripled this round.',
      level: 9,
      type: 'support',
    },
    {
      name: 'Zen Shield',
      description: 'Shields the entire team from one instance of damage from the boss.',
      level: 11,
      type: 'support',
    },
    {
      name: 'Inspiring Strike',
      description: 'Inspires allies, causing TRIPLE base damage for the party on a hit. (1 use per battle)',
      level: 13,
      type: 'damage',
    },
    {
      name: 'Sacrifice',
      description: 'Your HP drops to zero, but all allies receive a 50% XP bonus for the battle.',
      level: 15,
      type: 'utility',
    },
  ],
  Healer: [
    // To be added later
  ],
};
