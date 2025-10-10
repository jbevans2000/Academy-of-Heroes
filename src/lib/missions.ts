
export interface Mission {
    id: string;
    title: string;
    content: string; // Stored as HTML
    isAssigned: boolean;
    createdAt: any; // Firestore ServerTimestamp
    defaultXpReward?: number;
    defaultGoldReward?: number;
}
