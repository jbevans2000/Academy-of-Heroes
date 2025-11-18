
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
    isDuelsEnabled?: boolean;
    duelCost?: number;
    dailyDuelLimit?: number;
    isDailyLimitEnabled?: boolean;
    includeDuelsInDailyTraining?: boolean; // New setting
    numNormalQuestions?: number;
    numSuddenDeathQuestions?: number;
    dailyTrainingXpReward?: number;
    dailyTrainingGoldReward?: number;
    isDailyTrainingEnabled?: boolean;
}
