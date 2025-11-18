
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Student } from '@/lib/data';
import type { Hairstyle, ArmorPiece, BaseBody, ClassType } from '@/lib/forge';
import CharacterCanvas from './character-canvas';
import { Star, Coins, Trophy, Heart, Zap, Shield, Wand2 } from 'lucide-react';
import React from 'react';


interface StudentProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
  allHairstyles: Hairstyle[];
  allArmor: ArmorPiece[];
  allBodies: BaseBody[];
}

const classIconMap: { [key in ClassType]?: React.ReactNode } = {
    Guardian: <Shield className="h-6 w-6 text-amber-500" />,
    Healer: <Heart className="h-6 w-6 text-green-500" />,
    Mage: <Wand2 className="h-6 w-6 text-blue-500" />,
    '': null
}

const StatItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center space-y-1 bg-secondary/80 p-3 rounded-lg text-center">
        <div className="flex items-center gap-2">
            {icon}
            <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <p className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
);


export function StudentProfileDialog({
  isOpen,
  onOpenChange,
  student,
  allHairstyles,
  allArmor,
  allBodies,
}: StudentProfileDialogProps) {

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
      petId: student.equippedPetId,
  };
  const equippedPet = allArmor.find(p => p.id === equipment.petId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-headline">{student.characterName}'s Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
            <div className="w-full h-[60vh] relative rounded-lg overflow-hidden border bg-black/20">
                 <CharacterCanvas 
                    student={student}
                    allBodies={allBodies}
                    equipment={equipment}
                    allHairstyles={allHairstyles}
                    allArmor={allArmor}
                    equippedPet={equippedPet}
                    selectedStaticAvatarUrl={student.useCustomAvatar ? null : student.avatarUrl}
                    isPreviewMode={true}
                    localHairstyleTransforms={student.equippedHairstyleTransforms}
                    localArmorTransforms={student.armorTransforms}
                    localArmorTransforms2={student.armorTransforms2}
                />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <StatItem icon={classIconMap[student.class]} label="Class" value={student.class} />
                <StatItem icon={<Trophy className="h-6 w-6 text-orange-400" />} label="Level" value={student.level} />
                <StatItem icon={<Star className="h-6 w-6 text-yellow-400" />} label="Experience" value={student.xp} />
                <StatItem icon={<Heart className="h-6 w-6 text-red-500" />} label="HP" value={`${'${student.hp}'} / ${'${student.maxHp}'}`} />
                <StatItem icon={<Zap className="h-6 w-6 text-blue-400" />} label="MP" value={`${'${student.mp}'} / ${'${student.maxMp}'}`} />
                <StatItem icon={<Coins className="h-6 w-6 text-amber-500" />} label="Gold" value={student.gold} />
            </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
