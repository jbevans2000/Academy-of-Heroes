
export interface QuestHub {
    id: string;
    name: string;
    hubOrder: number; // e.g. 1, 2, 3... defines the sequence of hubs
    worldMapUrl: string; // The map image for the hub itself (e.g., Capitol City map)
    coordinates: { x: number; y: number }; // Position on the main world map
    storySummary?: string; // AI-generated running summary of the plot for this hub.
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
}
