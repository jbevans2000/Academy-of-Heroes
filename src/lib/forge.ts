

export interface BaseBody {
    id: string;
    name: string;
    imageUrl: string;
    width: number;
    height: number;
}

export interface Hairstyle {
    id: string;
    styleName: string;
    baseImageUrl: string; // The single image used for sizing
    colors: { name: string; imageUrl: string; }[]; // An array for all color variations
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
    modularImageUrl: string; // This is the image for the character overlay
    slot: ArmorSlot;
    classRequirement: ArmorClassRequirement;
    levelRequirement: number;
    goldCost: number;
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
