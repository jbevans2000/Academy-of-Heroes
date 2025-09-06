

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Student } from '@/lib/data';
import { CharacterCanvas } from './character-canvas';
import { collection, onSnapshot, query, where, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import type { Hairstyle, ArmorPiece } from '@/lib/forge';


interface AvatarDisplayProps {
  student: Student;
}

export function AvatarDisplay({ student }: AvatarDisplayProps) {
  const [allHairstyles, setAllHairstyles] = useState<Hairstyle[]>([]);
  const [allArmor, setAllArmor] = useState<ArmorPiece[]>([]);

  const avatarBorderColor = {
    Mage: 'border-blue-600',
    Healer: 'border-green-500',
    Guardian: 'border-amber-500',
    '': 'border-transparent',
  }[student.class] || 'border-transparent';
  
  useEffect(() => {
    const fetchAssets = async () => {
        const hairQuery = query(collection(db, 'hairstyles'));
        const unsubHair = onSnapshot(hairQuery, (snapshot) => {
            setAllHairstyles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairstyle)));
        });

        const armorQuery = query(collection(db, 'armorPieces'));
        const unsubArmor = onSnapshot(armorQuery, (snapshot) => {
            setAllArmor(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArmorPiece)));
        });

        return () => {
            unsubHair();
            unsubArmor();
        };
    };
    fetchAssets();
  }, []);

  const showCustomCharacter = student.equippedBodyId && !student.avatarUrl;

  return (
    <div className="flex justify-center items-center py-4">
        {showCustomCharacter ? (
             <div className={cn("relative w-96 h-96", avatarBorderColor)}>
                <CharacterCanvas
                    student={student}
                    equipment={{
                        bodyId: student.equippedBodyId || null,
                        hairstyleId: student.equippedHairstyleId || null,
                        hairstyleColor: student.equippedHairstyleColor || null,
                        backgroundUrl: student.backgroundUrl || null,
                        headId: student.equippedHeadId || null,
                        shouldersId: student.equippedShouldersId || null,
                        chestId: student.equippedChestId || null,
                        handsId: student.equippedHandsId || null,
                        legsId: student.equippedLegsId || null,
                        feetId: student.equippedFeetId || null,
                    }}
                    allHairstyles={allHairstyles}
                    allArmor={allArmor}
                    isPreviewMode={true}
                    localHairstyleTransforms={student.equippedHairstyleTransforms}
                    localArmorTransforms={student.armorTransforms}
                    localArmorTransforms2={student.armorTransforms2}
                 />
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
