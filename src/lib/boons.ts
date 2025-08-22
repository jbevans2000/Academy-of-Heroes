
export type BoonEffect = {
  type: 'BACKGROUND_CHANGE';
  value: string; // e.g., the URL of the background image
};

export type Boon = {
  id: string;
  name: string;
  description: string;
  cost: number;
  imageUrl: string;
  effect: BoonEffect;
  createdAt: any; // Firestore ServerTimestamp
};
