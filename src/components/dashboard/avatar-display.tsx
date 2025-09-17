
'use client';

import React, { Suspense, lazy } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Student } from '@/lib/data';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState, useMemo } from 'react';
import type { Hairstyle, ArmorPiece, BaseBody } from '@/lib/forge';
import { CharacterViewerFallback } from './character-viewer-3d';

const CharacterCanvas = lazy(() => import('@/components/dashboard/character-canvas'));

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
        
        const bodiesQuery = query(collection(db, 'baseBodies'), orderBy('order'));
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

  const equipment = {
      bodyId: student.equippedBodyId,
      hairstyleId: student.equippedHairstyleId,
      hairstyleColor: student.equippedHairstyleColor,
      backgroundUrl: student.backgroundUrl,
      headId: student.equippedHeadId,
      shouldersId: student.equippedShouldersId,
      chestId: student.equippedChestId,
      handsId: student.equippedHandsId,
      legsId: student.equippedLegsId,
      feetId: student.equippedFeetId,
  };
  
  const isFallen = student.hp <= 0;

  return (
    <div className="flex justify-center items-center py-4">
        <div className={cn("relative w-96 h-96 border-8 bg-black/20 p-2 shadow-inner", avatarBorderColor)}>
             {isFallen && (
                <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center">
                    <p className="text-5xl font-bold text-red-600 font-headline animate-pulse">FALLEN</p>
                </div>
            )}
            {showCustomCharacter && equipment.bodyId && allBodies.length > 0 ? (
                <Suspense fallback={<CharacterViewerFallback />}>
                    <CharacterCanvas 
                        student={student}
                        allBodies={allBodies}
                        equipment={equipment}
                        allHairstyles={allHairstyles}
                        allArmor={allArmor}
                        isPreviewMode={true} // This is a read-only view
                        localHairstyleTransforms={student.equippedHairstyleTransforms}
                        localArmorTransforms={student.armorTransforms}
                        localArmorTransforms2={student.armorTransforms2}
                    />
                </Suspense>
            ) : (
                <>
                    {student.backgroundUrl && <Image src={student.backgroundUrl} alt="background" fill className="object-cover" />}
                    <Image
                        src={student.avatarUrl || 'https://placehold.co/400x400.png'}
                        alt="Selected avatar"
                        fill
                        className="object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all duration-500 z-10"
                        data-ai-hint={student.class}
                        priority
                    />
                </>
            )}
        </div>
    </div>
  );
}
