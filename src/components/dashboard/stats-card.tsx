
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Star, Coins, Trophy, Heart, Zap, Shield, Wand2, Flame, Briefcase, UserCheck } from 'lucide-react';
import type { ClassType, Student, Company } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PowersSheet } from './powers-sheet';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { setChampionStatus } from '@/ai/flows/manage-student';

interface StatsCardProps {
  student: Student;
  isProfileDialog?: boolean;
}

const classIconMap: { [key in ClassType]?: React.ReactNode } = {
    Guardian: <Shield className="h-8 w-8 text-primary" />,
    Healer: <Heart className="h-8 w-8 text-primary" />,
    Mage: <Wand2 className="h-8 w-8 text-primary" />,
    '': null
}

const freelancerLogoUrl = "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Sep%2027%2C%202025%2C%2009_44_04%20AM.png?alt=media&token=0920ef19-d5d9-43b1-bab7-5ab134373ed3";


export function StatsCard({ student, isProfileDialog = false }: StatsCardProps) {
  const [isPowersSheetOpen, setIsPowersSheetOpen] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [isChampion, setIsChampion] = useState(student.isChampion || false);
  const [isUpdatingChampion, setIsUpdatingChampion] = useState(false);
  const { toast } = useToast();

  const { xp, gold, level, hp, mp, maxHp, maxMp, characterName, studentName, class: characterClass } = student;

  useEffect(() => {
      let isMounted = true;
      const fetchCompany = async () => {
          if (!student.companyId || !student.teacherUid) {
              setCompany(null);
              return;
          }
          try {
              const companyRef = doc(db, 'teachers', student.teacherUid, 'companies', student.companyId);
              const docSnap = await getDoc(companyRef);
              if (isMounted && docSnap.exists()) {
                  setCompany({ id: docSnap.id, ...docSnap.data() } as Company);
              } else if (isMounted) {
                  setCompany(null);
              }
          } catch (error) {
              console.error("Error fetching company data:", error);
              if (isMounted) setCompany(null);
          }
      };

      fetchCompany();

      return () => {
          isMounted = false;
      };
  }, [student.companyId, student.teacherUid]);
  
  useEffect(() => {
    setIsChampion(student.isChampion || false);
  }, [student.isChampion]);

  const handleChampionToggle = async (checked: boolean) => {
    if (!student.teacherUid || !student.uid) return;
    setIsUpdatingChampion(true);
    setIsChampion(checked); // Optimistic update
    try {
      const result = await setChampionStatus({
        teacherUid: student.teacherUid,
        studentUid: student.uid,
        isChampion: checked,
      });
      if (!result.success) {
        setIsChampion(!checked); // Revert on failure
        throw new Error(result.error);
      }
      toast({
          title: "Champion Status Updated",
          description: `You are now ${checked ? 'a Champion' : 'no longer a Champion'}.`
      });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Update Failed", description: error.message });
        setIsChampion(!checked); // Revert on failure
    } finally {
        setIsUpdatingChampion(false);
    }
  }


  return (
    <>
    <PowersSheet
        isOpen={isPowersSheetOpen}
        onOpenChange={setIsPowersSheetOpen}
        student={student}
        battleState={null} // Not in a battle context
    />
    <Card className="shadow-lg rounded-xl overflow-hidden relative">
      <div className="relative z-10 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-headline">{studentName}</CardTitle>
          <CardDescription>{characterName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center justify-center space-y-2 bg-secondary/80 p-4 rounded-lg">
              {classIconMap[characterClass]}
              <div>
                <p className="text-sm text-muted-foreground">Class</p>
                <p className="text-xl font-bold">{characterClass}</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 bg-secondary/80 p-4 rounded-lg">
              <Trophy className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="text-xl font-bold">{level}</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 bg-secondary/80 p-4 rounded-lg">
              {company?.logoUrl ? (
                  <Image src={company.logoUrl} alt="Company Logo" width={32} height={32} className="rounded-full object-cover" />
              ) : (
                  <Image src={freelancerLogoUrl} alt="Freelancer Logo" width={32} height={32} className="rounded-full object-cover" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="text-xl font-bold">{company?.name || 'Freelancer'}</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 bg-secondary/80 p-4 rounded-lg">
              <Heart className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">HP</p>
                <p className="text-xl font-bold">{hp} / {maxHp}</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 bg-secondary/80 p-4 rounded-lg">
              <Zap className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">MP</p>
                <p className="text-xl font-bold">{mp} / {maxMp}</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 bg-secondary/80 p-4 rounded-lg">
              <Star className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-sm text-muted-foreground">Experience</p>
                <p className="text-xl font-bold">{xp.toLocaleString()}</p>
              </div>
            </div>
             <div className="flex flex-col items-center justify-center space-y-2 bg-secondary/80 p-4 rounded-lg col-span-2 sm:col-span-1">
              <Coins className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Gold</p>
                <p className="text-xl font-bold">{gold.toLocaleString()}</p>
              </div>
            </div>
             {!isProfileDialog && (
              <>
                <div className="flex flex-col items-center justify-center space-y-2 bg-secondary/80 p-4 rounded-lg col-span-2 sm:col-span-1">
                    <div className="flex items-center space-x-2">
                        <UserCheck className="h-8 w-8 text-purple-500" />
                        <Label htmlFor="champion-status" className="font-bold">Champion Status</Label>
                        <Switch
                            id="champion-status"
                            checked={isChampion}
                            onCheckedChange={handleChampionToggle}
                            disabled={isUpdatingChampion}
                        />
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center space-y-4 bg-secondary/80 p-4 rounded-lg col-span-2 sm:col-span-1">
                    <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setIsPowersSheetOpen(true)}
                        className="w-full bg-background/50 hover:bg-background/80"
                    >
                        <Flame className="mr-2 h-5 w-5" />
                        View Powers
                    </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
    </>
  );
}
