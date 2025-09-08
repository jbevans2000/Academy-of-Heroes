

export interface BaseBody {
    id: string;
    name: string;
    imageUrl: string;
    thumbnailUrl: string;
    modelUrl?: string;
    order?: number; // Add order for sorting
}

export interface Hairstyle {
    id: string;
    styleName: string;
    baseImageUrl: string; // The single image used for sizing
    thumbnailUrl?: string; // Thumbnail for the main style selector
    modelUrl?: string; // URL for the 3D .glb model
    colors: { 
        imageUrl: string;
        thumbnailUrl?: string; // Thumbnail for the color swatch
        name: string;
        textureUrl?: string; // URL for the 3D model's color texture
    }[]; // An array for all color variations
    transforms: {
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
        }
    };
    isPublished: boolean;
    createdAt?: any;
}

export type ArmorSlot = 'head' | 'shoulders' | 'chest' | 'hands' | 'legs' | 'feet';
export type ArmorClassRequirement = 'Any' | 'Guardian' | 'Healer' | 'Mage';

export interface ArmorPiece {
    id: string;
    name: string;
    description: string;
    imageUrl: string; // This will be the display/icon image
    thumbnailUrl?: string; // Thumbnail for selection lists
    modelUrl?: string; // URL for the 3D .glb model
    modularImageUrl: string; // This is the image for the character overlay (e.g., left glove)
    modularImageUrl2?: string; // Optional second image for pairs (e.g., right glove)
    slot: ArmorSlot;
    classRequirement: ArmorClassRequirement;
    levelRequirement: number;
    goldCost: number;
    setName?: string; 
    transforms: {
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
        }
    };
     transforms2?: { // Transforms for the second modular image
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
        }
    };
    isPublished: boolean;
    createdAt?: any;
}
