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

export type Student = {
    id: number;
    name: string;
    xp: number;
    gold: number;
    currentAvatarId: number;
    currentBackgroundId: number;
}

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

export const studentData: Student = {
  id: 1,
  name: 'Alex',
  xp: 1250,
  gold: 300,
  currentAvatarId: 1,
  currentBackgroundId: 1,
};

export const allStudentData: Student[] = [
    studentData,
    { id: 2, name: 'Beth', xp: 2500, gold: 500, currentAvatarId: 2, currentBackgroundId: 2 },
    { id: 3, name: 'Charlie', xp: 800, gold: 150, currentAvatarId: 3, currentBackgroundId: 3 },
    { id: 4, name: 'Diana', xp: 3200, gold: 800, currentAvatarId: 4, currentBackgroundId: 4 },
    { id: 5, name: 'Ethan', xp: 150, gold: 20, currentAvatarId: 5, currentBackgroundId: 1 },
    { id: 6, name: 'Fiona', xp: 5000, gold: 1200, currentAvatarId: 6, currentBackgroundId: 2 },
]
