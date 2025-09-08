

'use client';

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';

interface ModelProps {
    url: string;
    pieceId: string;
    scale: number;
    onClick?: (pieceId: string) => void;
    onLoad?: (scene: THREE.Group) => void;
}

function Model({ url, pieceId, scale, onClick, onLoad }: ModelProps) {
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
                }
            }
        });
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
    onPieceClick?: (pieceId: string) => void;
    armorTransforms?: { [armorId: string]: { scale: number; } };
    hairTransform?: { scale: number; };
}

export function CharacterViewer3D({ bodyUrl, armorPieces = [], hairUrl, onPieceClick, armorTransforms = {}, hairTransform }: CharacterViewer3DProps) {
    const skeletonRef = useRef<THREE.Skeleton | null>(null);

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

    return (
        <Canvas shadows camera={{ position: [0, 1, 2.5], fov: 50 }}>
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
                {bodyUrl && <Model url={bodyUrl} pieceId="body" scale={1} onClick={onPieceClick} onLoad={handleBodyLoad} />}
                {armorPieces.map(piece => (
                    <Model 
                        key={piece.id} 
                        url={piece.url} 
                        pieceId={piece.id}
                        scale={armorTransforms[piece.id]?.scale ?? 1}
                        onClick={onPieceClick} 
                        onLoad={handleEquipmentLoad} 
                    />
                ))}
                {hairUrl && <Model url={hairUrl} pieceId="hair" scale={hairTransform?.scale ?? 1} onClick={onPieceClick} onLoad={handleEquipmentLoad} />}
            </Suspense>
            <OrbitControls target={[0, 1, 0]} />
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
