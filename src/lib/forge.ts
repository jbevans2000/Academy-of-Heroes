
export interface BaseBody {
    id: string;
    name: string;
    imageUrl: string;
    thumbnailUrl: string;
    order?: number; // Add order for sorting
    gender?: 'male' | 'female';
}

export type HairstyleColor = { 
    imageUrl: string;
    thumbnailUrl?: string;
    name: string;
};

export interface Hairstyle {
    id: string;
    styleName: string;
    baseImageUrl: string; // The single image used for sizing
    thumbnailUrl?: string; // Thumbnail for the main style selector
    colors: HairstyleColor[]; // An array for all color variations
    transforms: { // For 2D sizing
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
            rotation?: number;
        }
    };
    isPublished: boolean;
    createdAt?: any;
}

export type ArmorSlot = 'head' | 'shoulders' | 'chest' | 'hands' | 'legs' | 'feet' | 'Pet';
export type ArmorClassRequirement = 'Any' | 'Guardian' | 'Healer' | 'Mage';

export interface ArmorPiece {
    id: string;
    name: string;
    description: string;
    imageUrl: string; // This will be the display/icon image
    thumbnailUrl?: string; // Thumbnail for selection lists
    modularImageUrl: string; // This is the image for the character overlay (e.g., left glove) or fallback for chest
    modularImageUrlMale?: string; // For chest pieces
    modularImageUrlFemale?: string; // For chest pieces
    modularImageUrl2?: string; // Optional second image for pairs (e.g., right glove)
    slot: ArmorSlot;
    classRequirement: ArmorClassRequirement;
    levelRequirement: number;
    goldCost: number;
    setName?: string; 
    transforms: { // For 2D primary image
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
            rotation?: number;
        }
    };
     transforms2?: { // For 2D secondary image
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
            rotation?: number;
        }
    };
    isPublished: boolean;
    createdAt?: any;
}
