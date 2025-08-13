export type Avatar = {
  id: number;
  src: string;
  name: string;
  hint: string;
};

export type Background = {
  id: number;
  src: string;
  name: string;
  hint: string;
};

export const avatars: Avatar[] = [
  { id: 1, src: 'https://placehold.co/256x256/A5C9CA/393E46?text=A1', name: 'Knight', hint: 'knight fantasy' },
  { id: 2, src: 'https://placehold.co/256x256/A5C9CA/393E46?text=A2', name: 'Mage', hint: 'mage fantasy' },
  { id: 3, src: 'https://placehold.co/256x256/A5C9CA/393E46?text=A3', name: 'Ranger', hint: 'ranger forest' },
  { id: 4, src: 'https://placehold.co/256x256/A5C9CA/393E46?text=A4', name: 'Rogue', hint: 'rogue shadow' },
  { id: 5, src: 'https://placehold.co/256x256/A5C9CA/393E46?text=A5', name: 'Cleric', hint: 'cleric holy' },
  { id: 6, src: 'https://placehold.co/256x256/A5C9CA/393E46?text=A6', name: 'Barbarian', hint: 'barbarian warrior' },
];

export const backgrounds: Background[] = [
  { id: 1, src: 'https://placehold.co/800x600/393E46/EAEAEA?text=BG1', name: 'Castle', hint: 'fantasy castle' },
  { id: 2, src: 'https://placehold.co/800x600/393E46/EAEAEA?text=BG2', name: 'Enchanted Forest', hint: 'enchanted forest' },
  { id: 3, src: 'https://placehold.co/800x600/393E46/EAEAEA?text=BG3', name: 'Mountain Peak', hint: 'mountain peak' },
  { id: 4, src: 'https://placehold.co/800x600/393E46/EAEAEA?text=BG4', name: 'Mystic Library', hint: 'mystic library' },
];

export const studentData = {
  name: 'Alex',
  xp: 1250,
  gold: 300,
  currentAvatarId: 1,
  currentBackgroundId: 1,
};
