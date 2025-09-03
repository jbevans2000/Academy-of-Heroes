
export interface QuizQuestion {
    id: string;
    text: string;
    answers: string[];
    correctAnswerIndex: number;
}

export interface Quiz {
    questions: QuizQuestion[];
    settings: {
        requirePassing: boolean;
        passingScore: number; // Percentage
    };
}

export interface QuestHub {
    id: string;
    name: string;
    hubOrder: number; // e.g. 1, 2, 3... defines the sequence of hubs
    worldMapUrl: string; // The map image for the hub itself (e.g., Capitol City map)
    coordinates: { x: number; y: number }; // Position on the main world map
    storySummary?: string; // AI-generated running summary of the plot for this hub.
    // New Reward Fields
    areRewardsEnabled?: boolean;
    rewardXp?: number;
    rewardGold?: number;
}

export interface Chapter {
    id:string;
    hubId: string;
    title: string;
    chapterNumber: number;
    // Story media
    storyContent: string;
    mainImageUrl: string;
    videoUrl: string;
    decorativeImageUrl1: string;
    decorativeImageUrl2: string;
    storyAdditionalContent: string;
    // Lesson media
    lessonContent: string;
    lessonMainImageUrl: string;
    lessonVideoUrl: string;
    lessonDecorativeImageUrl1: string;
    lessonDecorativeImageUrl2: string;
    lessonAdditionalContent: string;
    
    coordinates: { x: number; y: number }; // Position on the hub map
    quiz?: Quiz;
}

export interface QuestCompletionRequest {
    id: string;
    teacherUid: string;
    studentUid: string;
    studentName: string;
    characterName: string;
    hubId: string;
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    requestedAt: any; // Firestore ServerTimestamp
    quizScore?: number;
    quizAnswers?: { question: string; studentAnswer: string; correctAnswer: string; isCorrect: boolean }[];
}
