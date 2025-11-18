
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Student, Company } from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import CharacterCanvas from './character-canvas';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Hairstyle, ArmorPiece, BaseBody, ClassType } from '@/lib/forge';
import { StudentProfileDialog } from './student-profile-dialog';
import { cn } from '@/lib/utils';

interface CompanyDisplayProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  members: Student[];
}

const classBorderColors: Record<ClassType, string> = {
    Guardian: 'border-amber-500',
    Healer: 'border-green-500',
    Mage: 'border-blue-600',
    '': 'border-transparent',
};

export function CompanyDisplay({ isOpen, onOpenChange, members }: CompanyDisplayProps) {
    const [allHairstyles, setAllHairstyles] = useState<Hairstyle[]>([]);
    const [allArmor, setAllArmor] = useState<ArmorPiece[]>([]);
    const [allBodies, setAllBodies] = useState<BaseBody[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const studentForTeacher = members[0]; 

    useEffect(() => {
        if (!isOpen) return;

        // Only fetch if we have members and thus a teacherUid
        if (!studentForTeacher?.teacherUid) {
            setIsLoadingAssets(false);
            return;
        };

        setIsLoadingAssets(true);

        const unsubs: (()=>void)[] = [];

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

        // A small delay to ensure all assets are loaded before hiding skeleton
        setTimeout(() => setIsLoadingAssets(false), 500);

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [isOpen, studentForTeacher?.teacherUid]);
    
    const handleStudentClick = (student: Student) => {
        setSelectedStudent(student);
        setIsProfileOpen(true);
    }

    const sortedMembers = useMemo(() => {
        return [...members].sort((a, b) => (b.xp || 0) - (a.xp || 0));
    }, [members]);


    const companyName = members[0]?.companyId ? `Company Roster` : 'Your Company';

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{companyName}</DialogTitle>
                        <DialogDescription>
                            Check the status of your fellow company members.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] mt-4">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Avatar</TableHead>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Level</TableHead>
                                    <TableHead>HP</TableHead>
                                    <TableHead>MP</TableHead>
                                    <TableHead>Gold</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedMembers.map(member => {
                                    const equipment = {
                                        bodyId: member.equippedBodyId,
                                        hairstyleId: member.equippedHairstyleId,
                                        hairstyleColor: member.equippedHairstyleColor,
                                        backgroundUrl: member.backgroundUrl,
                                        headId: member.equippedHeadId,
                                        shouldersId: member.equippedShouldersId,
                                        chestId: member.equippedChestId,
                                        handsId: member.equippedHandsId,
                                        legsId: member.equippedLegsId,
                                        feetId: member.equippedFeetId,
                                        petId: member.equippedPetId,
                                    };
                                    const equippedPet = allArmor.find(p => p.id === equipment.petId);

                                    return (
                                    <TableRow key={member.uid}>
                                        <TableCell>
                                            <div className={cn("w-16 h-16 rounded-md overflow-hidden bg-secondary border-4 cursor-pointer", classBorderColors[member.class] || 'border-transparent')} onClick={() => handleStudentClick(member)}>
                                                {isLoadingAssets ? <div className="w-full h-full bg-muted animate-pulse" /> : (
                                                    <CharacterCanvas 
                                                        student={member}
                                                        allBodies={allBodies}
                                                        equipment={equipment}
                                                        allHairstyles={allHairstyles}
                                                        allArmor={allArmor}
                                                        equippedPet={equippedPet}
                                                        selectedStaticAvatarUrl={member.useCustomAvatar ? null : member.avatarUrl}
                                                        isPreviewMode={true}
                                                        localHairstyleTransforms={member.equippedHairstyleTransforms}
                                                        localArmorTransforms={member.armorTransforms}
                                                        localArmorTransforms2={member.armorTransforms2}
                                                    />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{member.studentName}</TableCell>
                                        <TableCell>{member.class}</TableCell>
                                        <TableCell>{member.level}</TableCell>
                                        <TableCell>{member.hp} / {member.maxHp}</TableCell>
                                        <TableCell>{member.mp} / {member.maxMp}</TableCell>
                                        <TableCell>{member.gold.toLocaleString()}</TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <DialogFooter>
                        <Button onClick={() => onOpenChange(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {selectedStudent && (
                 <StudentProfileDialog 
                    isOpen={isProfileOpen}
                    onOpenChange={setIsProfileOpen}
                    student={selectedStudent}
                    allArmor={allArmor}
                    allBodies={allBodies}
                    allHairstyles={allHairstyles}
                />
            )}
        </>
    );
}
