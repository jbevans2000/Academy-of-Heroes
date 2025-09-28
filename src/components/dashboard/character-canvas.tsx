

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
    Pet: 12, // Pets should be on top
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
        petId: string | null; // Added petId
    };
    allHairstyles: Hairstyle[];
    allArmor: ArmorPiece[];
    equippedPet?: ArmorPiece | null; // Make pet optional
    selectedStaticAvatarUrl?: string | null;
    onMouseDown?: (e: React.MouseEvent<HTMLDivElement>, piece: ArmorPiece | Hairstyle, layer: 'primary' | 'secondary') => void;
    activePieceId?: string | null;
    editingLayer?: 'primary' | 'secondary';
    isPreviewMode?: boolean;
    localHairstyleTransforms?: Student['equippedHairstyleTransforms'];
    localArmorTransforms?: Student['armorTransforms'];
    localArmorTransforms2?: Student['armorTransforms2'];
    localPetTransforms?: Student['petTransforms'];
}

const CharacterCanvas = React.forwardRef<HTMLDivElement, CharacterCanvasProps>(({ 
    student, 
    allBodies,
    equipment, 
    allHairstyles,
    allArmor,
    equippedPet,
    selectedStaticAvatarUrl,
    onMouseDown, 
    activePieceId, 
    editingLayer = 'primary', 
    isPreviewMode = false,
    localHairstyleTransforms,
    localArmorTransforms,
    localArmorTransforms2,
    localPetTransforms,
}, ref) => {
    if (!student) return <Skeleton className="w-full h-full" />;
    
    const baseBody = allBodies.find(b => b.id === equipment.bodyId) || null;
    const defaultBodyId = allBodies[0]?.id; // Fallback to the first body

    const hairstyle = allHairstyles.find(h => h.id === equipment.hairstyleId);
    const hairstyleColor = equipment.hairstyleColor || hairstyle?.colors[0]?.imageUrl;
    
    // Corrected Logic: Prioritize student override, then admin default, then fallback.
    const hairstyleTransform = localHairstyleTransforms?.[baseBody?.id || ''] 
        || hairstyle?.transforms?.[baseBody?.id || ''] 
        || (defaultBodyId && hairstyle?.transforms?.[defaultBodyId])
        || { x: 50, y: 50, scale: 100, rotation: 0 };
    
    const equippedArmorPieces = Object.values(equipment)
        .map(id => allArmor.find(a => a.id === id))
        .filter((p): p is ArmorPiece => !!p && p.slot !== 'Pet'); // Exclude pets from this list

    const handleHairMouseDown = onMouseDown && hairstyle ? (e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, hairstyle, 'primary') : undefined;

    return (
        <div 
            ref={ref}
            className="relative w-full h-full shadow-inner overflow-hidden"
            id="character-canvas-container"
        >
            {/* Background */}
            {equipment.backgroundUrl && (
                <Image src={equipment.backgroundUrl} alt="Selected Background" fill className="object-cover z-0" />
            )}

            <div className="relative w-full h-full z-10">
                {/* Static Avatar OR Custom Character */}
                {selectedStaticAvatarUrl && !equipment.bodyId ? (
                    <Image src={selectedStaticAvatarUrl} alt="Selected Static Avatar" layout="fill" className="object-contain"/>
                ) : (
                    <>
                        {/* Custom Character Components */}
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
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    transform: `translateX(${hairstyleTransform.x}%) translateY(${hairstyleTransform.y}%) translate(-50%, -50%) scale(${hairstyleTransform.scale / 100}) rotate(${hairstyleTransform.rotation || 0}deg)`,
                                    zIndex: isPreviewMode ? 10 : (activePieceId === hairstyle.id ? 20 : 10)
                                }}
                            >
                                <Image src={hairstyleColor} alt="Hairstyle" width={500} height={500} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none" />
                            </div>
                        )}
                        
                        {baseBody && equippedArmorPieces.map(piece => {
                            // Corrected Logic for Primary Transform
                            const customTransform = localArmorTransforms?.[piece.id]?.[baseBody!.id];
                            const defaultTransform = piece.transforms?.[baseBody!.id] 
                                || (defaultBodyId && piece.transforms?.[defaultBodyId])
                                || { x: 50, y: 50, scale: 40, rotation: 0 };
                            const transform = customTransform || defaultTransform;
                            
                            // Corrected Logic for Secondary Transform
                            const customTransform2 = localArmorTransforms2?.[piece.id]?.[baseBody!.id];
                            const defaultTransform2 = piece.transforms2?.[baseBody!.id] 
                                || (defaultBodyId && piece.transforms2?.[defaultBodyId]) 
                                || { x: 50, y: 50, scale: 40, rotation: 0 };
                            const transform2 = customTransform2 || defaultTransform2;

                            const zIndex = slotZIndex[piece.slot] || 1;
                            const isActive = piece.id === activePieceId;

                            const handleMouseDownPrimary = onMouseDown ? (e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, piece, 'primary') : undefined;
                            const handleMouseDownSecondary = onMouseDown ? (e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, piece, 'secondary') : undefined;
                            
                            let primaryImageUrl = piece.modularImageUrl;
                            if (piece.slot === 'chest' || piece.slot === 'legs') {
                                primaryImageUrl = baseBody?.gender === 'female' ? piece.modularImageUrlFemale || piece.modularImageUrlMale || '' : piece.modularImageUrlMale || piece.modularImageUrlFemale || '';
                            }

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
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            transform: `translateX(${transform.x}%) translateY(${transform.y}%) translate(-50%, -50%) scale(${transform.scale / 100}) rotate(${transform.rotation || 0}deg)`,
                                            zIndex: isPreviewMode ? zIndex : (isActive && editingLayer === 'primary' ? 20 : zIndex),
                                        }}
                                    >
                                        <Image src={primaryImageUrl} alt={piece.name} width={500} height={500} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none" />
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
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                transform: `translateX(${transform2.x}%) translateY(${transform2.y}%) translate(-50%, -50%) scale(${transform2.scale / 100}) rotate(${transform2.rotation || 0}deg)`,
                                                zIndex: isPreviewMode ? zIndex : (isActive && editingLayer === 'secondary' ? 20 : zIndex),
                                            }}
                                        >
                                            <Image src={piece.modularImageUrl2} alt={`${piece.name} (secondary)`} width={500} height={500} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none" />
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </>
                )}

                {/* Pet Overlay - Rendered on top of static OR custom avatar */}
                {equippedPet && baseBody && (
                    <div 
                        onMouseDown={onMouseDown ? (e) => onMouseDown(e, equippedPet, 'primary') : undefined}
                        className={cn(
                            "absolute",
                            isPreviewMode ? "cursor-default pointer-events-none" : "cursor-move pointer-events-auto",
                            activePieceId !== equippedPet.id && !isPreviewMode && "opacity-75"
                        )}
                        style={{
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: `translateX(${(localPetTransforms?.[baseBody.id] || equippedPet.transforms?.[baseBody.id] || {x:50}).x}%) translateY(${(localPetTransforms?.[baseBody.id] || equippedPet.transforms?.[baseBody.id] || {y:50}).y}%) translate(-50%, -50%) scale(${(localPetTransforms?.[baseBody.id] || equippedPet.transforms?.[baseBody.id] || {scale:40}).scale / 100}) rotate(${(localPetTransforms?.[baseBody.id] || equippedPet.transforms?.[baseBody.id] || {rotation:0}).rotation || 0}deg)`,
                            zIndex: slotZIndex.Pet,
                        }}
                    >
                         <Image src={equippedPet.modularImageUrl} alt={equippedPet.name} layout="fill" className="object-contain"/>
                    </div>
                )}
            </div>
        </div>
    );
});
CharacterCanvas.displayName = 'CharacterCanvas';

export default CharacterCanvas;
