
export interface QuestHub {
    id: string;
    name: string;
    worldMapUrl: string; // The map image for the hub itself (e.g., Capitol City map)
    coordinates: { x: number; y: number }; // Position on the main world map
}

export interface Chapter {
    id: string;
    hubId: string;
    title: string;
    chapterNumber: number;
    storyContent: string;
    lessonContent: string;
    mainImageUrl: string;
    videoUrl: string;
    decorativeImageUrl1: string;
    decorativeImageUrl2: string;
    coordinates: { x: number; y: number }; // Position on the hub map
}
