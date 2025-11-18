

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
  requiresApproval?: boolean; // Does this boon purchase need teacher approval?
  studentMessage?: string; // A message shown to the student on use.
  levelRequirement?: number; // Minimum level to purchase.
  allowStudentInstructions?: boolean; // New: Does this boon require student input on use?
};

export interface PendingBoonRequest {
    id: string;
    studentUid: string;
    studentName: string;
    characterName: string;
    boonId: string;
    boonName: string;
    cost: number;
    requestedAt: any; // Firestore ServerTimestamp
}

export interface BoonTransaction {
    id: string;
    studentUid: string;
    characterName: string;
    boonName: string;
    transactionType: 'purchase' | 'use';
    cost?: number; // Only for purchases
    timestamp: any; // Firestore ServerTimestamp
    studentInstructions?: string; // New: Instructions from the student on use.
}
