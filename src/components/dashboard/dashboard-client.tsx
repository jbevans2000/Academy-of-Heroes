"use client";

import { useState } from "react";
import type { Avatar, Background, Student } from "@/lib/data";
import { StatsCard } from "./stats-card";
import { AvatarDisplay } from "./avatar-display";
import { CustomizationPanel } from "./customization-panel";

interface DashboardClientProps {
  student: Student;
  avatars: Avatar[];
  backgrounds: Background[];
}

export function DashboardClient({ student, avatars: initialAvatars, backgrounds }: DashboardClientProps) {
  const [avatars, setAvatars] = useState(initialAvatars);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>(
    avatars.find((a) => a.id === student.currentAvatarId) || avatars[0]
  );
  const [selectedBackground, setSelectedBackground] = useState<Background>(
    backgrounds.find((b) => b.id === student.currentBackgroundId) || backgrounds[0]
  );

  return (
    <div className="grid md:grid-cols-3 gap-6 lg:gap-8 p-4 md:p-6 lg:p-8">
      <div className="md:col-span-2 space-y-6">
        <AvatarDisplay
          avatarSrc={selectedAvatar.src}
          backgroundSrc={selectedBackground.src}
          avatarHint={selectedAvatar.hint}
          backgroundHint={selectedBackground.hint}
        />
        <StatsCard xp={student.xp} gold={student.gold} name={student.name} />
      </div>
      <div className="md:col-span-1">
        <CustomizationPanel
          avatars={avatars}
          backgrounds={backgrounds}
          selectedAvatarId={selectedAvatar.id}
          selectedBackgroundId={selectedBackground.id}
          onAvatarSelect={setSelectedAvatar}
          onBackgroundSelect={setSelectedBackground}
        />
      </div>
    </div>
  );
}
