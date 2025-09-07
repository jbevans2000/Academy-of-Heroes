
'use client';

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';

interface ModelProps {
    url: string;
    onLoad?: (scene: THREE.Group) => void;
}

function Model({ url, onLoad }: ModelProps) {
    const { scene } = useLoader(GLTFLoader, url);
    const sceneRef = useRef<THREE.Group>();

    // We need a memoized version to prevent re-cloning on every render
    const clonedScene = useMemo(() => {
        const clone = scene.clone(true);
        // This traverse is necessary to enable shadows and correct material properties
        clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // You might need more material adjustments here depending on your models
                if (child.material instanceof THREE.MeshStandardMaterial) {
                    child.material.metalness = 0.5;
                    child.material.roughness = 0.6;
                }
            }
        });
        return clone;
    }, [scene]);

    useEffect(() => {
        if (clonedScene && onLoad) {
            onLoad(clonedScene);
        }
    }, [clonedScene, onLoad]);

    return <primitive ref={sceneRef} object={clonedScene} />;
}

// Preload the GLTFLoader so it's cached
useGLTF.preload(GLTFLoader as any);

interface CharacterViewer3DProps {
    bodyUrl: string | null;
    armorUrls?: (string | null | undefined)[];
    hairUrl?: string | null;
}

export function CharacterViewer3D({ bodyUrl, armorUrls = [], hairUrl }: CharacterViewer3DProps) {
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
                {bodyUrl && <Model url={bodyUrl} onLoad={handleBodyLoad} />}
                {armorUrls.filter(Boolean).map(url => (
                    url && <Model key={url} url={url} onLoad={handleEquipmentLoad} />
                ))}
                {hairUrl && <Model url={hairUrl} onLoad={handleEquipmentLoad} />}
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
