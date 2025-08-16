
"use client";

import type { Student } from "@/lib/data";
import { StatsCard } from "./stats-card";
import { AvatarDisplay } from "./avatar-display";

interface DashboardClientProps {
  student: Student;
}

export function DashboardClient({ student }: DashboardClientProps) {

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <AvatarDisplay
          avatarSrc={student.avatarUrl}
          avatarHint={student.class}
        />
        <StatsCard 
            xp={student.xp} 
            gold={student.gold}
            level={student.level || 1}
            hp={student.hp || 100}
            mp={student.mp || 100}
            characterName={student.characterName} 
            studentName={student.studentName}
            characterClass={student.class}
            student={student}
        />
      </div>
    </div>
  );
}
