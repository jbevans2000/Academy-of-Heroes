
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
import { AvatarDisplay } from './avatar-display';

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
                            {members.map(member => (
                                <TableRow key={member.uid}>
                                    <TableCell>
                                        <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary border">
                                            <AvatarDisplay student={member} />
                                        </div>
                                    </TableCell>
                                    <TableCell>{member.studentName}</TableCell>
                                    <TableCell>{member.class}</TableCell>
                                    <TableCell>{member.level}</TableCell>
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
