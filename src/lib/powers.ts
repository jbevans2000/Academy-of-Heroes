

export type PowerType = 'damage' | 'support' | 'healing' | 'utility';

export interface Power {
    name: string;
    description: string;
    level: number;
    mpCost: number;
    type: PowerType;
    target?: 'ally' | 'fallen';
    targetCount?: number;
    // eligibilityCheck?: (caster: Student, target: Student) => boolean; // For more complex rules later
}

interface ClassPowers {
    [key: string]: Power[];
}

export const classPowers: ClassPowers = {
  Mage: [
    {
      name: 'Wildfire',
      description: 'On a correct answer, deals 2d6 + your Level in damage to the boss. Damage is rolled when cast.',
      level: 1,
      mpCost: 3,
      type: 'damage',
    },
    {
      name: 'Psionic Aura',
      description: 'You call upon the leylines to recharge the arcane potential of TWO Allies. Targets must be at or below 75% of their max MP.',
      level: 2,
      mpCost: 4,
      type: 'support',
      target: 'ally',
      targetCount: 2,
    },
    {
      name: 'Sorcerer’s Intuition',
      description: 'Your answer will deal base damage this round, even if it is incorrect. You can only use this power 3 times per battle.',
      level: 5,
      mpCost: 10,
      type: 'utility',
    },
    {
      name: 'Psychic Flare',
      description: 'You channel a beam of restorative arcane energies into an ally, restoring them to full magic points.',
      level: 9,
      mpCost: 18,
      type: 'support',
      target: 'ally',
      targetCount: 1,
    },
    {
      name: 'Elemental Fusion',
      description: 'Your party scores DOUBLE base damage for all correct answers. (Max 1 use per battle)',
      level: 9,
      mpCost: 25,
      type: 'damage',
    },
    {
      name: 'Mage Shield',
      description: 'Shield 3 players of your choice, making them immune to damage for 3 rounds.',
      level: 11,
      mpCost: 30,
      type: 'support',
    },
    {
      name: 'Chaos Storm',
      description: 'Deals a massive 3d20 + your Level in damage. (Max 1 use per battle)',
      level: 13,
      mpCost: 40,
      type: 'damage',
    },
    {
      name: 'Arcane Sacrifice',
      description: 'Your HP falls to zero, but all other players have their power slots restored and gain a 25% XP bonus.',
      level: 15,
      mpCost: 5,
      type: 'utility',
    },
  ],
  Guardian: [
    {
      name: 'Guard',
      description: 'Shield 3 players this round, redirecting a portion of the damage to themselves.',
      level: 1,
      mpCost: 8,
      type: 'support',
    },
    {
      name: 'Intercept',
      description: 'Answer a question on a teammate\'s behalf. A correct answer deals 5 base damage to the boss.',
      level: 3,
      mpCost: 10,
      type: 'damage',
    },
    {
      name: 'Absorb',
      description: 'Soak an amount of damage for the party that is TRIPLE your current level.',
      level: 5,
      mpCost: 15,
      type: 'support',
    },
    {
      name: 'Berserker Strike',
      description: 'Roll 1d20. On 11+, deal that much damage + your level. On 1-10, you take 5 damage.',
      level: 7,
      mpCost: 18,
      type: 'damage',
    },
    {
      name: 'Arcane Redirect',
      description: 'Causes all damage done by Wildfires to be tripled this round.',
      level: 9,
      mpCost: 20,
      type: 'support',
    },
    {
      name: 'Zen Shield',
      description: 'Shields the entire team from one instance of damage from the boss.',
      level: 11,
      mpCost: 25,
      type: 'support',
    },
    {
      name: 'Inspiring Strike',
      description: 'Inspires allies, causing TRIPLE base damage for the party on a hit. (1 use per battle)',
      level: 13,
      mpCost: 30,
      type: 'damage',
    },
    {
      name: 'Sacrifice',
      description: 'Your HP drops to 0, but all allies receive a 50% XP bonus for the battle.',
      level: 15,
      mpCost: 5,
      type: 'utility',
    },
  ],
  Healer: [
    {
      name: 'Nature’s Guidance',
      description: 'You call upon the spirits of nature to direct your path. One incorrect option on a multiple choice question will be revealed.',
      level: 1,
      mpCost: 3,
      type: 'utility',
    },
    {
      name: 'Lesser Heal',
      description: 'You call upon the powers of life to soothe your party’s wounds!',
      level: 2,
      mpCost: 3,
      type: 'healing',
      target: 'ally',
      targetCount: 2,
    },
    {
      name: 'Solar Empowerment',
      description: 'You intertwine the light of the sun into the energies of 3 allied mages. Their maximum hit points temporarily increase for the duration of the battle.',
      level: 4,
      mpCost: 8,
      type: 'support',
      target: 'ally',
      targetCount: 3,
    },
    {
      name: 'Enduring Spirit',
      description: 'You pierce the veil of reality and return an ally’s spirit to their body.',
      level: 6,
      mpCost: 10,
      type: 'healing',
      target: 'fallen',
      targetCount: 1,
    },
    {
      name: 'Focused Restoration',
      description: 'You point your healing energy towards a single ally, restoring a large amount of their health. Ally must have less than 50% health.',
      level: 8,
      mpCost: 12,
      type: 'healing',
      target: 'ally',
      targetCount: 1,
    },
    {
      name: 'Cosmic Divination',
      description: 'Peer into the future, allowing the team to vote on skipping the current question. Deals damage equal to your level regardless of the vote. (Max 2 uses per battle)',
      level: 10,
      mpCost: 15,
      type: 'utility',
    },
    {
      name: 'Regeneration Field',
      description: 'Heals all allies below max HP for 25% of your Level (rounded up). Excess healing is discarded.',
      level: 13,
      mpCost: 35,
      type: 'healing',
    },
    {
      name: 'Divine Sacrifice',
      description: 'Your HP falls to 0, but all players gain +5 Max HP, restore 10 HP, and get a 25% XP boost.',
      level: 15,
      mpCost: 5,
      type: 'utility',
    },
  ],
};
