
'use client';

import { useState, useEffect } from 'react';
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
import { Wand2, Zap, Shield, Heart, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TargetingDialog } from '@/components/battle/targeting-dialog';

interface PowersSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
  isBattleView?: boolean;
  teacherUid?: string;
  battleId?: string;
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

interface LiveBattleState {
    empoweredMageUids?: string[];
}

export function PowersSheet({ isOpen, onOpenChange, student, isBattleView = false, teacherUid, battleId }: PowersSheetProps) {
  const powers = classPowers[student.class] || [];
  const { toast } = useToast();
  const [isCasting, setIsCasting] = useState<string | null>(null);

  // State for targeting dialog
  const [isTargeting, setIsTargeting] = useState(false);
  const [selectedPower, setSelectedPower] = useState<Power | null>(null);
  const [partyMembers, setPartyMembers] = useState<Student[]>([]);
  const [battleState, setBattleState] = useState<LiveBattleState>({});


  useEffect(() => {
    if (!isBattleView || !teacherUid || !battleId) return;

    const liveBattleRef = doc(db, 'teachers', teacherUid, 'liveBattles', 'active-battle');
    const unsubscribe = onSnapshot(liveBattleRef, (docSnap) => {
        if (docSnap.exists()) {
            setBattleState(docSnap.data() as LiveBattleState);
        }
    });

    const fetchPartyMembers = async () => {
        try {
          const studentsRef = collection(db, 'teachers', teacherUid, 'students');
          const snapshot = await getDocs(studentsRef);
          const allStudents = snapshot.docs.map(doc => doc.data() as Student);
          setPartyMembers(allStudents);
        } catch (error) {
          console.error("Failed to fetch party members:", error);
        }
      };
      fetchPartyMembers();

    return () => unsubscribe();
  }, [isBattleView, teacherUid, battleId]);


  const handleUsePower = async (power: Power, targets?: string[]) => {
    if (!isBattleView || !teacherUid || !battleId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Powers can only be used inside a live battle.' });
        return;
    }
    
    // Client-side pre-check for Solar Empowerment
    if (power.name === 'Solar Empowerment') {
        const eligibleMages = partyMembers.filter(p => 
            p.class === 'Mage' && 
            p.hp > 0 && 
            !(battleState.empoweredMageUids || []).includes(p.uid)
        );

        if (eligibleMages.length < 3) {
            toast({
                title: "Allies are already empowered!",
                description: "All available mages are already shining with the light of the sun.",
                duration: 5000,
            });
            return;
        }
    }

    if (power.target && !targets) {
        setSelectedPower(power);
        setIsTargeting(true);
        return;
    }
    
    setIsCasting(power.name);
    try {
        const powerActivationsRef = collection(db, 'teachers', teacherUid, `liveBattles/${battleId}/powerActivations`);
        await addDoc(powerActivationsRef, {
            studentUid: student.uid,
            studentName: student.characterName,
            powerName: power.name,
            powerMpCost: power.mpCost,
            targets: targets || [],
            timestamp: serverTimestamp(),
        });
        
        onOpenChange(false);

    } catch (error) {
        console.error("Failed to use power:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred while using the power.' });
    } finally {
        setIsCasting(null);
        setIsTargeting(false);
        setSelectedPower(null);
    }
  }

  return (
    <>
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
                  const hasEnoughMp = student.mp >= power.mpCost;
                  const canUsePower = isUnlocked && hasEnoughMp && isBattleView && !isCasting;
                  
                  return (
                      <div 
                          key={index}
                          className={cn(
                              "p-4 rounded-lg border-2 transition-all",
                              isUnlocked ? powerTypeStyles[power.type] : "border-muted/30 bg-muted/20 text-muted-foreground"
                          )}
                      >
                          <div className="flex justify-between items-start gap-4">
                              <div className="flex-grow">
                                  <h3 className={cn("text-lg font-bold", isUnlocked ? "text-white" : "")}>{power.name}</h3>
                                  <p className={cn("text-sm", isUnlocked ? "text-white/80" : "")}>{power.description}</p>
                              </div>
                              {isBattleView && (
                                  <Button size="sm" disabled={!canUsePower} variant={isUnlocked ? 'secondary' : 'ghost'} onClick={() => handleUsePower(power)}>
                                      {isCasting === power.name ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Use Power'}
                                  </Button>
                              )}
                          </div>
                          <div className="flex justify-between items-end mt-2">
                              <p className={cn(
                                  "font-semibold text-sm",
                                  isUnlocked && hasEnoughMp ? "text-blue-400" : "text-gray-400"
                              )}>
                                  MP Cost: {power.mpCost}
                              </p>
                              <p className={cn(
                                  "font-semibold text-sm",
                                  isUnlocked ? "text-green-400" : "text-black"
                              )}>
                                  {!isUnlocked 
                                      ? `Unlocks at Level ${power.level}`
                                      : !hasEnoughMp
                                      ? `Not enough MP`
                                      : "Unlocked"
                                  }
                              </p>
                          </div>
                      </div>
                  )
              }) : (
                  <p className="text-center text-muted-foreground p-8">This class does not have any powers defined yet.</p>
              )}
          </div>
        </SheetContent>
      </Sheet>
      {selectedPower && (
          <TargetingDialog
              isOpen={isTargeting}
              onOpenChange={setIsTargeting}
              power={selectedPower}
              students={partyMembers}
              caster={student}
              onConfirm={(targets) => handleUsePower(selectedPower, targets)}
              battleState={battleState}
          />
      )}
    </>
  );
}
