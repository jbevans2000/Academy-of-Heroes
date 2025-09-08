

'use client';

import React from 'react';
import Image from 'next/image';
import type { Student } from '@/lib/data';
import { type ArmorPiece, type Hairstyle, type ArmorSlot, type BaseBody } from '@/lib/forge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const slotZIndex: Record<ArmorSlot, number> = {
    legs: 1,
    feet: 2,
    chest: 3,
    shoulders: 4,
    head: 5,
    hands: 5,
};

interface CharacterCanvasProps {
    student: Student | null;
    allBodies: BaseBody[]; // Pass all bodies
    equipment: {
        bodyId: string | null;
        hairstyleId: string | null;
        hairstyleColor: string | null;
        backgroundUrl: string | null;
        headId: string | null;
        shouldersId: string | null;
        chestId: string | null;
        handsId: string | null;
        legsId: string | null;
        feetId: string | null;
    };
    allHairstyles: Hairstyle[];
    allArmor: ArmorPiece[];
    selectedStaticAvatarUrl?: string | null;
    onMouseDown?: (e: React.MouseEvent<HTMLDivElement>, piece: ArmorPiece | Hairstyle, layer: 'primary' | 'secondary') => void;
    activePieceId?: string | null;
    editingLayer?: 'primary' | 'secondary';
    isPreviewMode?: boolean;
    localHairstyleTransforms?: Student['equippedHairstyleTransforms'];
    localArmorTransforms?: Student['armorTransforms'];
    localArmorTransforms2?: Student['armorTransforms2'];
}

const CharacterCanvas = React.forwardRef<HTMLDivElement, CharacterCanvasProps>(({ 
    student, 
    allBodies,
    equipment, 
    allHairstyles,
    allArmor,
    selectedStaticAvatarUrl,
    onMouseDown, 
    activePieceId, 
    editingLayer = 'primary', 
    isPreviewMode = false,
    localHairstyleTransforms,
    localArmorTransforms,
    localArmorTransforms2,
}, ref) => {
    if (!student) return <Skeleton className="w-full h-full" />;
    
    const baseBody = allBodies.find(b => b.id === equipment.bodyId) || null;

    const hairstyle = allHairstyles.find(h => h.id === equipment.hairstyleId);
    const hairstyleColor = equipment.hairstyleColor || hairstyle?.colors[0]?.imageUrl;
    
    const hairstyleTransform = localHairstyleTransforms?.[baseBody?.id || ''] || hairstyle?.transforms?.[baseBody?.id || ''] || { x: 50, y: 50, scale: 100 };
    
    const equippedArmorPieces = Object.values(equipment)
        .map(id => allArmor.find(a => a.id === id))
        .filter((p): p is ArmorPiece => !!p);

    const handleHairMouseDown = onMouseDown && hairstyle ? (e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, hairstyle, 'primary') : undefined;

    return (
        <div 
            ref={ref}
            className="relative w-full h-full shadow-inner overflow-hidden"
            id="character-canvas-container"
        >
            {/* Always render the background first */}
            {equipment.backgroundUrl && (
                <Image src={equipment.backgroundUrl} alt="Selected Background" fill className="object-cover z-0" />
            )}

            <div className="relative w-full h-full z-10">
                {/* Then, render the static avatar if selected */}
                {selectedStaticAvatarUrl ? (
                    <Image src={selectedStaticAvatarUrl} alt="Selected Static Avatar" layout="fill" className="object-contain"/>
                ) : (
                    <>
                        {/* Or, render the custom character components */}
                        {baseBody && <Image src={baseBody.imageUrl} alt="Base Body" fill className="object-contain" priority />}
            
                        {baseBody && hairstyleColor && hairstyle && (
                            <div
                                onMouseDown={handleHairMouseDown}
                                className={cn(
                                    "absolute",
                                    isPreviewMode ? "cursor-default pointer-events-none" : "cursor-move pointer-events-auto",
                                    activePieceId !== hairstyle.id && !isPreviewMode && "opacity-75"
                                )}
                                style={{
                                    top: `${hairstyleTransform.y}%`,
                                    left: `${hairstyleTransform.x}%`,
                                    width: `${hairstyleTransform.scale}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: isPreviewMode ? 10 : (activePieceId === hairstyle.id ? 20 : 10)
                                }}
                            >
                                <Image src={hairstyleColor} alt="Hairstyle" width={500} height={500} className="object-contain pointer-events-none" />
                            </div>
                        )}
                        
                        {baseBody && equippedArmorPieces.map(piece => {
                            const customTransform = localArmorTransforms?.[piece.id]?.[baseBody!.id];
                            const defaultTransform = piece.transforms?.[baseBody!.id] || { x: 50, y: 50, scale: 40 };
                            const transform = customTransform || defaultTransform;
                            
                            const customTransform2 = localArmorTransforms2?.[piece.id]?.[baseBody!.id];
                            const defaultTransform2 = piece.transforms2?.[baseBody!.id] || { x: 50, y: 50, scale: 40 };
                            const transform2 = customTransform2 || defaultTransform2;

                            const zIndex = slotZIndex[piece.slot] || 1;
                            const isActive = piece.id === activePieceId;

                            const handleMouseDownPrimary = onMouseDown ? (e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, piece, 'primary') : undefined;
                            const handleMouseDownSecondary = onMouseDown ? (e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, piece, 'secondary') : undefined;

                            return (
                                <React.Fragment key={piece.id}>
                                    <div
                                        onMouseDown={handleMouseDownPrimary}
                                        className={cn(
                                            "absolute",
                                            isPreviewMode ? "cursor-default pointer-events-none" : "cursor-move pointer-events-auto",
                                            !isActive && !isPreviewMode && "opacity-75"
                                        )}
                                        style={{
                                            top: `${transform.y}%`,
                                            left: `${transform.x}%`,
                                            width: `${transform.scale}%`,
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: isPreviewMode ? zIndex : (isActive && editingLayer === 'primary' ? 20 : zIndex),
                                        }}
                                    >
                                        <Image src={piece.modularImageUrl} alt={piece.name} width={500} height={500} className="object-contain pointer-events-none" />
                                    </div>
                                    {piece.modularImageUrl2 && (
                                        <div
                                            onMouseDown={handleMouseDownSecondary}
                                            className={cn(
                                                "absolute",
                                                isPreviewMode ? "cursor-default pointer-events-none" : "cursor-move pointer-events-auto",
                                                !isActive && !isPreviewMode && "opacity-75"
                                            )}
                                            style={{
                                                top: `${transform2.y}%`,
                                                left: `${transform2.x}%`,
                                                width: `${transform2.scale}%`,
                                                transform: 'translate(-50%, -50%)',
                                                zIndex: isPreviewMode ? zIndex : (isActive && editingLayer === 'secondary' ? 20 : zIndex),
                                            }}
                                        >
                                            <Image src={piece.modularImageUrl2} alt={`${piece.name} (secondary)`} width={500} height={500} className="object-contain pointer-events-none" />
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
});
CharacterCanvas.displayName = 'CharacterCanvas';

export default CharacterCanvas;
