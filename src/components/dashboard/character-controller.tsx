
'use client';

import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

interface CharacterControllerProps {
    children: React.ReactNode;
    activePieceId: string | null;
    onTransformUpdate: (pieceId: string, position: [number, number, number]) => void;
    controlsRef: React.RefObject<any>; // Using any to avoid complex OrbitControls type issues
}

export function CharacterController({ children, activePieceId, onTransformUpdate, controlsRef }: CharacterControllerProps) {
    const { camera, scene, gl } = useThree();
    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
    const isDragging = useRef(false);
    const selectedObject = useRef<THREE.Object3D | null>(null);
    const offset = useRef(new THREE.Vector3()); // To store the offset from the object's center to the click point

    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (!activePieceId || activePieceId === 'body') return;

            mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
            raycaster.current.setFromCamera(mouse.current, camera);
            
            let found = false;
            scene.traverse((obj) => {
                if (found) return;
                if (obj.userData.pieceId === activePieceId) {
                    selectedObject.current = obj;
                    found = true;
                }
            });

            if (selectedObject.current) {
                const intersects = raycaster.current.intersectObject(selectedObject.current, true);
                if (intersects.length > 0) {
                    isDragging.current = true;
                    if(controlsRef.current) controlsRef.current.enabled = false;
                    
                    // Set the plane to intersect at the object's current position, facing the camera
                    plane.current.setFromNormalAndCoplanarPoint(
                        camera.getWorldDirection(plane.current.normal),
                        selectedObject.current.position
                    );

                    // Calculate the offset
                    offset.current.copy(intersects[0].point).sub(selectedObject.current.position);
                }
            }
        };

        const handleMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                if(controlsRef.current) controlsRef.current.enabled = true;
                selectedObject.current = null;
            }
        };

        const handleMouseMove = (event: MouseEvent) => {
            if (!isDragging.current || !selectedObject.current) return;
            
            mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
            raycaster.current.setFromCamera(mouse.current, camera);
            
            const intersectionPoint = new THREE.Vector3();
            raycaster.current.ray.intersectPlane(plane.current, intersectionPoint);

            // Apply the offset to get the new position for the object's center
            const newPositionVec = intersectionPoint.sub(offset.current);
            const newPosition: [number, number, number] = [newPositionVec.x, newPositionVec.y, newPositionVec.z];
            
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
    }, [activePieceId, camera, scene, gl.domElement, onTransformUpdate, controlsRef]);

    return <>{children}</>;
}
