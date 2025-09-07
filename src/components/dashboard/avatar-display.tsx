

'use client';

import React, { Suspense, lazy } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Student } from '@/lib/data';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import type { Hairstyle, ArmorPiece, BaseBody } from '@/lib/forge';
import { CharacterViewerFallback } from './character-viewer-3d';

const CharacterViewer3D = lazy(() =>
  import('./character-viewer-3d').then(module => ({ default: module.CharacterViewer3D }))
);

interface AvatarDisplayProps {
  student: Student;
}

export function AvatarDisplay({ student }: AvatarDisplayProps) {
  const [allHairstyles, setAllHairstyles] = useState<Hairstyle[]>([]);
  const [allArmor, setAllArmor] = useState<ArmorPiece[]>([]);
  const [allBodies, setAllBodies] = useState<BaseBody[]>([]);
  
  const avatarBorderColor = {
    Mage: 'border-blue-600',
    Healer: 'border-green-500',
    Guardian: 'border-amber-500',
    '': 'border-transparent',
  }[student.class] || 'border-transparent';
  
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    const fetchAssets = async () => {
        const hairQuery = collection(db, 'hairstyles');
        unsubs.push(onSnapshot(hairQuery, (snapshot) => {
            setAllHairstyles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle)));
        }));

        const armorQuery = collection(db, 'armorPieces');
        unsubs.push(onSnapshot(armorQuery, (snapshot) => {
            setAllArmor(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece)));
        }));
        
        const bodiesQuery = collection(db, 'baseBodies');
        unsubs.push(onSnapshot(bodiesQuery, (snapshot) => {
            setAllBodies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseBody)));
        }));
    };
    fetchAssets();

    return () => {
        unsubs.forEach(unsub => unsub());
    };
  }, []);

  const showCustomCharacter = student.useCustomAvatar;

  // Find the URLs for the 3D models
  const bodyModelUrl = showCustomCharacter ? allBodies.find(b => b.id === student.equippedBodyId)?.modelUrl : null;
  const hairModelUrl = showCustomCharacter ? allHairstyles.find(h => h.id === student.equippedHairstyleId)?.modelUrl : null;
  
  const armorModelUrls = showCustomCharacter ? [
    allArmor.find(a => a.id === student.equippedHeadId)?.modelUrl,
    allArmor.find(a => a.id === student.equippedShouldersId)?.modelUrl,
    allArmor.find(a => a.id === student.equippedChestId)?.modelUrl,
    allArmor.find(a => a.id === student.equippedHandsId)?.modelUrl,
    allArmor.find(a => a.id === student.equippedLegsId)?.modelUrl,
    allArmor.find(a => a.id === student.equippedFeetId)?.modelUrl,
  ].filter(Boolean) : [];

  return (
    <div className="flex justify-center items-center py-4">
        {showCustomCharacter && bodyModelUrl ? (
             <div className={cn("relative w-96 h-96", avatarBorderColor)}>
                <Suspense fallback={<CharacterViewerFallback />}>
                    <CharacterViewer3D 
                        bodyUrl={bodyModelUrl}
                        armorUrls={armorModelUrls}
                        hairUrl={hairModelUrl}
                    />
                </Suspense>
             </div>
        ) : (
             <div className={cn("relative w-96 h-96 border-8 bg-black/20 p-2 shadow-inner", avatarBorderColor)}>
                {student.backgroundUrl && <Image src={student.backgroundUrl} alt="background" fill className="object-cover" />}
                <Image
                    src={student.avatarUrl || 'https://placehold.co/400x400.png'}
                    alt="Selected avatar"
                    fill
                    className="object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all duration-500 z-10"
                    data-ai-hint={student.class}
                    priority
                />
            </div>
        )}
    </div>
  );
}
