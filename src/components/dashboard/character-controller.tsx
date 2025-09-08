

'use client';

import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CharacterControllerProps {
    children: React.ReactNode;
    activePieceId: string | null;
    onTransformUpdate: (pieceId: string, position: [number, number, number]) => void;
}

export function CharacterController({ children, activePieceId, onTransformUpdate }: CharacterControllerProps) {
    const { camera, scene, gl } = useThree();
    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
    const isDragging = useRef(false);
    const selectedObject = useRef<THREE.Object3D | null>(null);

    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (!activePieceId || activePieceId === 'body') return;

            mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
            raycaster.current.setFromCamera(mouse.current, camera);

            scene.traverse((obj) => {
                if(obj.userData.pieceId === activePieceId) {
                    selectedObject.current = obj;
                }
            });

            if (selectedObject.current) {
                isDragging.current = true;
                plane.current.setFromNormalAndCoplanarPoint(
                    camera.getWorldDirection(plane.current.normal),
                    selectedObject.current.position
                );
            }
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            selectedObject.current = null;
        };

        const handleMouseMove = (event: MouseEvent) => {
            if (!isDragging.current || !selectedObject.current) return;
            
            mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
            raycaster.current.setFromCamera(mouse.current, camera);
            
            const intersectionPoint = new THREE.Vector3();
            raycaster.current.ray.intersectPlane(plane.current, intersectionPoint);

            const newPosition: [number, number, number] = [intersectionPoint.x, intersectionPoint.y, intersectionPoint.z];
            
            onTransformUpdate(selectedObject.current.userData.pieceId, newPosition);
        };

        const domElement = gl.domElement;
        domElement.addEventListener('mousedown', handleMouseDown);
        domElement.addEventListener('mouseup', handleMouseUp);
        domElement.addEventListener('mousemove', handleMouseMove);
        
        return () => {
            domElement.removeEventListener('mousedown', handleMouseDown);
            domElement.removeEventListener('mouseup', handleMouseUp);
            domElement.removeEventListener('mousemove', handleMouseMove);
        };
    }, [activePieceId, camera, scene, gl.domElement, onTransformUpdate]);

    return <>{children}</>;
}
