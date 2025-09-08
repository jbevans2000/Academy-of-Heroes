
'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';
import { CharacterController } from './character-controller';

interface ModelProps {
    url: string;
    pieceId: string;
    scale: number;
    position?: [number, number, number];
    onClick?: (pieceId: string) => void;
    onLoad?: (scene: THREE.Group) => void;
}

function Model({ url, pieceId, scale, position = [0, 0, 0], onClick, onLoad }: ModelProps) {
    const proxyUrl = `/api/fetch-glb?url=${encodeURIComponent(url)}`;
    const { scene } = useLoader(GLTFLoader, proxyUrl);

    const clonedScene = useMemo(() => {
        const clone = scene.clone(true);
        clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.pieceId = pieceId; // Tag mesh with piece ID for clicking
                if (child.material instanceof THREE.MeshStandardMaterial) {
                    child.material.metalness = 0.5;
                    child.material.roughness = 0.6;
                    // Apply polygon offset to prevent z-fighting
                    child.material.polygonOffset = true;
                    child.material.polygonOffsetFactor = -1.0;
                    child.material.polygonOffsetUnits = -1.0;
                }
            }
        });
        // Also tag the top-level object
        clone.userData.pieceId = pieceId;
        return clone;
    }, [scene, pieceId]);

    useEffect(() => {
        if (clonedScene && onLoad) {
            onLoad(clonedScene);
        }
    }, [clonedScene, onLoad]);

    return (
        <primitive 
            object={clonedScene}
            scale={scale}
            position={position}
            onClick={(e) => {
                e.stopPropagation();
                if(onClick) onClick(pieceId);
            }}
        />
    );
}

useGLTF.preload(GLTFLoader as any);

interface CharacterViewer3DProps {
    bodyUrl: string | null;
    armorPieces?: { id: string; url: string; }[];
    hairUrl?: string | null;
    hairId?: string | null; // Pass the actual ID of the hair
    onPieceClick?: (pieceId: string | null) => void;
    armorTransforms?: { [armorId: string]: { scale: number; position: [number, number, number] } };
    hairTransform?: { scale: number; position: [number, number, number] };
    onTransformUpdate: (pieceId: string, position: [number, number, number]) => void;
    activePieceId: string | null;
    isOrbitControlsEnabled?: boolean;
}

export function CharacterViewer3D({ 
    bodyUrl, 
    armorPieces = [], 
    hairUrl,
    hairId, 
    onPieceClick, 
    armorTransforms = {}, 
    hairTransform, 
    onTransformUpdate, 
    activePieceId,
    isOrbitControlsEnabled = true 
}: CharacterViewer3DProps) {
    const skeletonRef = useRef<THREE.Skeleton | null>(null);
    const controlsRef = useRef<any>(null);

    const handleBodyLoad = (bodyScene: THREE.Group) => {
        let skeleton: THREE.Skeleton | null = null;
        bodyScene.traverse(obj => {
            if (obj instanceof THREE.SkinnedMesh && !skeleton) {
                skeleton = obj.skeleton;
            }
        });
        skeletonRef.current = skeleton;
    };
    
     const handleEquipmentLoad = (equipmentScene: THREE.Group) => {
        if (skeletonRef.current) {
            equipmentScene.traverse(child => {
                if (child instanceof THREE.SkinnedMesh) {
                    child.bind(skeletonRef.current!);
                }
            });
        }
    };

    const handleCanvasClick = (event: any) => {
        // If the click is on the background (not on any model object), deselect the active piece
        if (!event.object && onPieceClick) {
            onPieceClick(null);
        }
    };

    return (
        <Canvas shadows camera={{ position: [0, 1, 2.5], fov: 50 }} onClick={handleCanvasClick}>
            <ambientLight intensity={1.5} />
            <directionalLight
                position={[5, 5, 5]}
                intensity={1}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <spotLight position={[-5, 5, -5]} angle={0.3} penumbra={0.3} intensity={2} castShadow />
            <Suspense fallback={null}>
                <CharacterController onTransformUpdate={onTransformUpdate} activePieceId={activePieceId} controlsRef={controlsRef}>
                    {bodyUrl && <Model url={bodyUrl} pieceId="body" scale={1} onClick={onPieceClick} onLoad={handleBodyLoad} />}
                    {armorPieces.map(piece => (
                        <Model 
                            key={piece.id} 
                            url={piece.url} 
                            pieceId={piece.id}
                            scale={armorTransforms[piece.id]?.scale ?? 1}
                            position={armorTransforms[piece.id]?.position ?? [0,0,0]}
                            onClick={onPieceClick} 
                            onLoad={handleEquipmentLoad} 
                        />
                    ))}
                    {hairUrl && hairId && (
                        <Model 
                            url={hairUrl}
                            pieceId={hairId} 
                            scale={hairTransform?.scale ?? 1} 
                            position={hairTransform?.position ?? [0,0,0]}
                            onClick={onPieceClick} 
                            onLoad={handleEquipmentLoad} 
                        />
                    )}
                </CharacterController>
            </Suspense>
            <OrbitControls ref={controlsRef} enabled={isOrbitControlsEnabled} target={[0, 1, 0]} />
        </Canvas>
    );
}

// Fallback component for when the 3D viewer is loading or fails
export function CharacterViewerFallback() {
    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <Loader2 className="h-12 w-12 text-gray-500 animate-spin" />
        </div>
    );
}
