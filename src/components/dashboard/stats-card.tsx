
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Star, Coins, Trophy, Heart, Zap, Shield, Wand2, Flame, Briefcase } from 'lucide-react';
import type { ClassType, Student, Company } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PowersSheet } from './powers-sheet';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface StatsCardProps {
  xp: number;
  gold: number;
  level: number;
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  characterName: string;
  studentName: string;
  characterClass: ClassType;
  student: Student;
}

const classIconMap = {
    Guardian: <Shield className="h-8 w-8 text-primary" />,
    Healer: <Heart className="h-8 w-8 text-primary" />,
    Mage: <Wand2 className="h-8 w-8 text-primary" />,
    '': null
}

export function StatsCard({ xp, gold, level, hp, mp, maxHp, maxMp, characterName, studentName, characterClass, student }: StatsCardProps) {
  const [isPowersSheetOpen, setIsPowersSheetOpen] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

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

  return (
    <>
    <PowersSheet
        isOpen={isPowersSheetOpen}
        onOpenChange={setIsPowersSheetOpen}
        student={student}
        battleState={null} // Not in a battle context
    />
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="font-headline">{studentName}</CardTitle>
        <CardDescription>{characterName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
           <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            {classIconMap[characterClass]}
            <div>
              <p className="text-sm text-muted-foreground">Class</p>
              <p className="text-xl font-bold">{characterClass}</p>
            </div>
          </div>
           <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            <Trophy className="h-8 w-8 text-orange-400" />
            <div>
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-xl font-bold">{level}</p>
            </div>
          </div>
           <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            <Briefcase className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="text-xl font-bold">{company?.name || 'Freelancer'}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            <Heart className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">HP</p>
              <p className="text-xl font-bold">{hp} / {maxHp}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            <Zap className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">MP</p>
              <p className="text-xl font-bold">{mp} / {maxMp}</p>
            </div>
          </div>
           <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            <Star className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-sm text-muted-foreground">Experience</p>
              <p className="text-xl font-bold">{xp.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg col-span-2 sm:col-span-1">
            <Coins className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Gold</p>
              <p className="text-xl font-bold">{gold.toLocaleString()}</p>
            </div>
          </div>
           <div className="flex flex-col items-center justify-center space-y-4 bg-secondary p-4 rounded-lg col-span-2 sm:col-span-2">
              <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setIsPowersSheetOpen(true)}
                  className="w-full"
              >
                  <Flame className="mr-2 h-5 w-5" />
                  View Powers
              </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}

