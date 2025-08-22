

export type BoonEffect = {
  type: 'REAL_WORLD_PERK' | 'BACKGROUND_CHANGE';
  value: string; // e.g., URL for background or description of perk
};

export type Boon = {
  id: string;
  name: string;
  description: string;
  cost: number;
  imageUrl: string;
  effect: BoonEffect;
  createdAt: any; // Firestore ServerTimestamp
  isVisibleToStudents: boolean;
};
