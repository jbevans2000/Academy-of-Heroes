

export interface QuizQuestion {
    id: string;
    text: string;
    answers: string[];
    correctAnswer: number[]; // Use an array to support single or multiple correct answers
    questionType: 'single' | 'multiple' | 'true-false';
    imageUrl?: string;
}

export interface Quiz {
    questions: QuizQuestion[];
    settings: {
        requirePassing: boolean;
        passingScore: number; // Percentage
        includeInDailyTraining?: boolean; // New setting
    };
}

export type Company = {
    id: string;
    name: string;
    logoUrl?: string;
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
    // New Visibility Fields
    isVisibleToAll?: boolean;
    assignedCompanyIds?: string[];
    isActive?: boolean; // New field to control hub visibility
    hubType?: 'standard' | 'sidequest'; // New field for hub type
}

export interface LessonPart {
    id: string;
    content: string;
}

export interface Chapter {
    id:string;
    hubId: string;
    title: string;
    chapterNumber: number;
    isActive?: boolean; // New field to control chapter visibility
    // Story media
    storyContent: string;
    mainImageUrl: string;
    videoUrl: string;
    decorativeImageUrl1: string;
    decorativeImageUrl2: string;
    storyAdditionalContent: string;
    
    // DEPRECATED Lesson Media - will be migrated to lessonParts
    lessonContent?: string;
    lessonMainImageUrl?: string;
    lessonVideoUrl?: string;
    lessonDecorativeImageUrl1?: string;
    lessonDecorativeImageUrl2?: string;
    lessonAdditionalContent?: string;
    
    // NEW Lesson Structure
    lessonParts?: LessonPart[];

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


// --- ROYAL LIBRARY TYPES ---

export interface LibraryHub extends Omit<QuestHub, 'id'> {
    originalHubId: string;
    originalTeacherId: string;
    originalTeacherName: string;
    originalTeacherAvatarUrl?: string;
    subject: string;
    gradeLevel: string;
    tags: string[];
    sagaType: 'standalone' | 'ongoing';
    description: string;
    importCount: number;
    createdAt: any; // Firestore ServerTimestamp
}

export interface LibraryChapter extends Omit<Chapter, 'id'> {
    libraryHubId: string; // The ID of the document in the `library_hubs` collection
    originalChapterId: string;
    originalTeacherId: string;
    createdAt: any; // Firestore ServerTimestamp
}
