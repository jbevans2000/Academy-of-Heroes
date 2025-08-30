
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
