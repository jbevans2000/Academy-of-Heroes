
"use client";

import type { Student } from "@/lib/data";
import { StatsCard } from "./stats-card";
import { AvatarDisplay } from "./avatar-display";
import { Button } from "../ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Map, Swords, Sparkles } from "lucide-react";

interface DashboardClientProps {
  student: Student;
}

export function DashboardClient({ student }: DashboardClientProps) {
  const router = useRouter();

  const handleReadyForBattle = () => {
    router.push('/battle/live');
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <AvatarDisplay
            avatarSrc={student.avatarUrl}
            avatarHint={student.class}
          />
          <div className="space-y-4 flex flex-col items-center">
             <Link href="/dashboard/map" passHref className="w-full">
                <Button size="lg" className="w-full py-8 text-lg">
                    <Map className="mr-4 h-8 w-8" />
                    Embark on Your Quest
                </Button>
            </Link>
             <Button size="lg" className="w-full py-8 text-lg" onClick={handleReadyForBattle}>
                <Swords className="mr-4 h-8 w-8" />
                Ready for Battle
            </Button>
          </div>
        </div>
        <StatsCard 
            xp={student.xp} 
            gold={student.gold}
            level={student.level || 1}
            hp={student.hp}
            mp={student.mp}
            maxHp={student.maxHp}
            maxMp={student.maxMp}
            characterName={student.characterName} 
            studentName={student.studentName}
            characterClass={student.class}
            student={student}
        />
      </div>
    </div>
  );
}
