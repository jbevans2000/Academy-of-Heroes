

export interface DuelQuestion {
    id: string;
    text: string;
    answers: string[];
    correctAnswerIndex: number;
}

export interface DuelQuestionSection {
    id: string;
    name: string;
    questionCount: number;
    isActive: boolean;
    createdAt: any; // Firestore ServerTimestamp
}

export interface DuelSettings {
    rewardXp: number;
    rewardGold: number;
}
