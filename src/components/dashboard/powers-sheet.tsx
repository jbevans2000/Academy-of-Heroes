
'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Student } from "@/lib/data";
import { classPowers, type Power, type PowerType } from "@/lib/powers";
import { cn } from "@/lib/utils";
import { Wand2, Zap, Shield, Heart } from 'lucide-react';

interface PowersSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
}

const powerTypeStyles: { [key in PowerType]: string } = {
    damage: "border-red-500/50 bg-red-900/20 text-red-300 hover:bg-red-800/40",
    support: "border-blue-500/50 bg-blue-900/20 text-blue-300 hover:bg-blue-800/40",
    healing: "border-green-500/50 bg-green-900/20 text-green-300 hover:bg-green-800/40",
    utility: "border-yellow-500/50 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-800/40",
};

const classIconMap: { [key: string]: React.ReactNode } = {
    Guardian: <Shield className="h-8 w-8 text-primary" />,
    Healer: <Heart className="h-8 w-8 text-primary" />,
    Mage: <Wand2 className="h-8 w-8 text-primary" />,
};

export function PowersSheet({ isOpen, onOpenChange, student }: PowersSheetProps) {
  const powers = classPowers[student.class] || [];

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4">
             {classIconMap[student.class]}
             <div>
                <SheetTitle className="text-2xl">{student.class} Powers</SheetTitle>
                <SheetDescription>
                    New powers are unlocked as you gain levels.
                </SheetDescription>
             </div>
          </div>
        </SheetHeader>
        <div className="py-4 space-y-4">
            {powers.length > 0 ? powers.map((power, index) => {
                const isUnlocked = student.level >= power.level;
                return (
                    <div 
                        key={index}
                        className={cn(
                            "p-4 rounded-lg border-2 transition-all",
                            isUnlocked ? powerTypeStyles[power.type] : "border-muted/30 bg-muted/20 text-muted-foreground"
                        )}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className={cn("text-lg font-bold", isUnlocked ? "text-white" : "")}>{power.name}</h3>
                                <p className={cn("text-sm", isUnlocked ? "text-white/80" : "")}>{power.description}</p>
                            </div>
                            <Button size="sm" disabled={!isUnlocked} variant={isUnlocked ? 'secondary' : 'ghost'}>
                                Use Power
                            </Button>
                        </div>
                        <p className={cn(
                            "font-semibold mt-2 text-right",
                            isUnlocked ? "text-green-400 text-xs" : "text-black text-sm"
                        )}>
                            {isUnlocked ? "Unlocked" : `Unlocks at Level ${power.level}`}
                        </p>
                    </div>
                )
            }) : (
                <p className="text-center text-muted-foreground p-8">This class does not have any powers defined yet.</p>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
