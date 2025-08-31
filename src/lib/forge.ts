
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
    baseImageUrl: string;
    colors: { name: string; imageUrl: string; }[];
    transforms: {
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
        }
    };
    isPublished: boolean;
}

export type ArmorSlot = 'head' | 'shoulders' | 'chest' | 'hands' | 'legs' | 'feet';

export interface ArmorPiece {
    id: string;
    name: string;
    imageUrl: string;
    slot: ArmorSlot;
    transforms: {
        [bodyId: string]: {
            x: number;
            y: number;
            scale: number;
        }
    };
    isPublished: boolean;
}
