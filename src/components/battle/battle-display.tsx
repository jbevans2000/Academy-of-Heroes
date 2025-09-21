
'use client';

import type { Student } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Heart, Shield, Wand2, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea } from '../ui/scroll-area';

interface BattleDisplayProps {
    students: Student[];
}

const classStyles = {
    Guardian: 'border-amber-500 bg-amber-500/10',
    Healer: 'border-green-500 bg-green-500/10',
    Mage: 'border-blue-500 bg-blue-500/10',
    '': 'border-gray-500 bg-gray-500/10',
};

const classIcons = {
    Guardian: <Shield className="h-5 w-5 text-amber-500" />,
    Healer: <Heart className="h-5 w-5 text-green-500" />,
    Mage: <Wand2 className="h-5 w-5 text-blue-500" />,
    '': null
}

export function BattleDisplay({ students }: BattleDisplayProps) {
    
    const sortedStudents = [...students].sort((a, b) => a.characterName.localeCompare(b.characterName));
    
    return (
        <Card className="bg-card/60 backdrop-blur-sm flex flex-col max-h-[40vh]">
            <CardHeader>
                <CardTitle>Battle Display</CardTitle>
                <CardDescription>Your party's status.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <TooltipProvider>
                        <div className="space-y-3">
                            {sortedStudents.map(student => {
                                const isFallen = student.hp <= 0;
                                const hpPercentage = isFallen ? 0 : (student.hp / student.maxHp) * 100;
                                const mpPercentage = isFallen ? 0 : (student.mp / student.maxMp) * 100;
                                const isShielded = student.shielded && student.shielded.roundsRemaining > 0;

                                return (
                                    <Tooltip key={student.uid} delayDuration={100}>
                                        <TooltipTrigger asChild>
                                            <div className={cn(
                                                "p-2 border-l-4 rounded-md", 
                                                classStyles[student.class] || classStyles[''],
                                                isFallen && "opacity-50"
                                            )}>
                                                <div className="flex justify-between items-center text-sm font-bold">
                                                    <div className="flex items-center gap-1.5">
                                                        {isFallen ? <Skull className="h-5 w-5 text-gray-500" /> : classIcons[student.class]}
                                                        <span>{student.characterName}</span>
                                                        {isShielded && <Shield className="h-4 w-4 text-sky-400" />}
                                                    </div>
                                                    {isFallen && <span className="text-xs font-bold text-destructive">FALLEN</span>}
                                                </div>
                                                <div className="mt-1 space-y-1">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="w-6 font-semibold text-red-500">HP:</span>
                                                        <Progress value={hpPercentage} className="h-2 flex-grow" />
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="w-6 font-semibold text-blue-500">MP:</span>
                                                        <Progress value={mpPercentage} className="h-2 flex-grow" />
                                                    </div>
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                            <p>HP: {student.hp} / {student.maxHp}</p>
                                            <p>MP: {student.mp} / {student.maxMp}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    </TooltipProvider>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
