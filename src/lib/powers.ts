
export type PowerType = 'damage' | 'support' | 'healing' | 'utility';

export interface Power {
    name: string;
    description: string;
    level: number;
    mpCost: number;
    type: PowerType;
    target?: 'ally' | 'fallen';
    targetCount?: number;
    targetSelf?: boolean;
    isMultiStep?: boolean;
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
      targetSelf: false,
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
      description: 'You channel a beam of restorative arcane energies into an ally, restoring them to full magic points. Target must be below 50% MP.',
      level: 9,
      mpCost: 18,
      type: 'support',
      target: 'ally',
      targetSelf: false,
      targetCount: 1,
    },
     {
      name: 'Elemental Fusion',
      description: 'You pour elemental knowledge into your ally’s attacks, tripling the effectiveness of their strikes. This triples the power damage for the round. (Max 2 uses per player / per battle. Max 6 uses globally).',
      level: 13,
      mpCost: 24,
      type: 'damage',
    },
     {
      name: 'Arcane Shield',
      description: 'A barrier of arcane energy enfolds 3 allies of your choice for the next 3 rounds, protecting them from damage.',
      level: 15,
      mpCost: 24,
      type: 'support',
      target: 'ally',
      targetCount: 3,
      targetSelf: true,
    },
    {
      name: 'Chaos Storm',
      description: 'You send a swirling storm of primordial chaos energy to smite your foe, dealing a high amount of damage.',
      level: 17,
      mpCost: 28,
      type: 'damage',
    },
    {
      name: 'Arcane Sacrifice',
      description: 'You become a conduit for raw magic, sacrificing your life force. Your HP and MP drop to zero and you cannot be revived. All other living allies gain +5 Max MP and restore 15 MP. The party receives a 25% XP bonus for the battle, but you forfeit all rewards. (Max 1 use per battle, entire party)',
      level: 20,
      mpCost: 0,
      type: 'utility',
    },
  ],
  Guardian: [
    {
      name: 'Guard',
      description: 'Shield up to 3 of your allied Mages or Healers from harm this round, redirecting any damage they would take to yourself.',
      level: 1,
      mpCost: 2,
      type: 'support',
      target: 'ally',
      targetCount: 3,
      targetSelf: false,
    },
    {
      name: 'Intercept',
      description: "Answer a question on a random teammate's behalf. If you are correct, you deal 5 additional base damage and your ally is considered correct. If you are wrong, you take their damage for them.",
      level: 2,
      mpCost: 4,
      type: 'damage',
    },
    {
      name: 'Absorb',
      description: 'Convert your own life force into magical energy. For every 2 HP sacrificed, you will gain 1 MP.',
      level: 5,
      mpCost: 0,
      type: 'support',
      isMultiStep: true,
    },
    {
      name: 'Berserker Strike',
      description: 'Roll 1d20. On 6+, deal that much damage + your level. On 1-5, you take damage equal to your level. This damage cannot be blocked.',
      level: 7,
      mpCost: 18,
      type: 'damage',
    },
    {
        name: 'Arcane Redirect',
        description: 'Empower a chosen number of allied Mages, doubling the damage of their Wildfire spells this round. Costs 15 MP per empowered Mage.',
        level: 9,
        mpCost: 15,
        type: 'support',
        isMultiStep: true,
    },
    {
      name: 'Zen Shield',
      description: 'You enter a state of perfect focus, creating a global shield that protects every active member of your party from all damage for one round. (Max 1 use per Guardian per battle)',
      level: 15,
      mpCost: 30,
      type: 'support',
    },
    {
      name: 'Inspiring Strike',
      description: "You let out a mighty war cry, inspiring your allies to fight with renewed vigor. The party's Power Damage from spells is tripled for this round. (Max 2 uses per Guardian per battle)",
      level: 17,
      mpCost: 35,
      type: 'damage',
    },
    {
      name: 'Martial Sacrifice',
      description: 'You make the ultimate sacrifice. Your HP and MP drop to zero and you cannot be revived this battle. You unleash a final, devastating blow, extend the duration of all allied shields by one round, and grant your party a 25% bonus to all XP and Gold earned. You will forfeit all personal rewards from this battle. (Max 1 use per battle, entire party)',
      level: 20,
      mpCost: 0,
      type: 'utility',
    },
  ],
  Healer: [
    {
      name: 'Nature’s Guidance',
      description: 'You call upon the spirits of nature. Has a base 20% chance to work, plus 1% per level you have. On success, one incorrect option is revealed. On failure, the power fizzles.',
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
      targetSelf: true,
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
      targetSelf: true,
      targetCount: 1,
    },
    {
      name: 'Divine Judgment',
      description: "Channel the party's collective will. A vote is called to either empower the party with a temporary HP boost or unleash divine energy on the boss. The effect triggers at the end of the round.",
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
      description: 'You become a font of life, sacrificing your own essence. Your HP and MP drop to zero and you cannot be revived. All other living allies gain +5 Max HP, restore 15 HP, and receive a 25% XP bonus for the battle. You forfeit all personal rewards. (Max 1 use per battle, entire party)',
      level: 20,
      mpCost: 0,
      type: 'utility',
    },
  ],
};
