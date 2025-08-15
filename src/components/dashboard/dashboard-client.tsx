
"use client";

import type { Student } from "@/lib/data";
import { StatsCard } from "./stats-card";
import { AvatarDisplay } from "./avatar-display";

interface DashboardClientProps {
  student: Student;
}

export function DashboardClient({ student }: DashboardClientProps) {
  console.log('Attempting to load avatar from URL:', student.avatarUrl);
  console.log('Attempting to load background from URL:', student.backgroundUrl);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <AvatarDisplay
          avatarSrc={student.avatarUrl}
          avatarHint={"character avatar"}
        />
        <StatsCard xp={student.xp} gold={student.gold} name={student.characterName} />
      </div>
    </div>
  );
}
