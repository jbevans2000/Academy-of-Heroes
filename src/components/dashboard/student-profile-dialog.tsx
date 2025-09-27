
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
import { Card, CardContent } from '@/components/ui/card';
import type { Student } from '@/lib/data';
import type { Hairstyle, ArmorPiece, BaseBody } from '@/lib/forge';
import CharacterCanvas from './character-canvas';
import { StatsCard } from './stats-card';

interface StudentProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
  allHairstyles: Hairstyle[];
  allArmor: ArmorPiece[];
  allBodies: BaseBody[];
}

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
          <DialogTitle>{student.characterName}'s Profile</DialogTitle>
          <DialogDescription>
            A closer look at your fellow guild member.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="w-full h-96 relative">
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
            <div className="space-y-4">
                <StatsCard student={student} />
            </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
