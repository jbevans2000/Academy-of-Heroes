
'use client';

import type { Student } from '@/lib/data';
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

interface CompanyDisplayProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  members: Student[];
}

export function CompanyDisplay({ isOpen, onOpenChange, members }: CompanyDisplayProps) {

    const companyName = members[0]?.companyId ? `Company Roster` : 'Your Company'; // You might want to fetch company name

    return (
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
                                <TableHead>Class</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Character Name</TableHead>
                                <TableHead>HP</TableHead>
                                <TableHead>MP</TableHead>
                                <TableHead>Gold</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map(member => (
                                <TableRow key={member.uid}>
                                    <TableCell>{member.class}</TableCell>
                                    <TableCell>{member.level}</TableCell>
                                    <TableCell>{member.studentName}</TableCell>
                                    <TableCell>{member.characterName}</TableCell>
                                    <TableCell>{member.hp} / {member.maxHp}</TableCell>
                                    <TableCell>{member.mp} / {member.maxMp}</TableCell>
                                    <TableCell>{member.gold.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
