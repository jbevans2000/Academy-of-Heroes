"use client";

import { useState } from "react";
import type { Avatar, Background } from "@/lib/data";
import { StatsCard } from "./stats-card";
import { AvatarDisplay } from "./avatar-display";
import { CustomizationPanel } from "./customization-panel";

interface DashboardClientProps {
  student: {
    name: string;
    xp: number;
    gold: number;
    currentAvatarId: number;
    currentBackgroundId: number;
  };
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

  const handleAddNewAvatar = (newAvatarSrc: string) => {
    const newAvatar: Avatar = {
      id: avatars.length + 1,
      name: `AI Avatar ${avatars.filter(a => a.name.startsWith("AI Avatar")).length + 1}`,
      src: newAvatarSrc,
      hint: 'ai generated'
    };
    const newAvatars = [...avatars, newAvatar];
    setAvatars(newAvatars);
    setSelectedAvatar(newAvatar);
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 lg:gap-8 p-4 md:p-6 lg:p-8">
      <div className="md:col-span-2 space-y-6">
        <AvatarDisplay
          avatarSrc={selectedAvatar.src}
          backgroundSrc={selectedBackground.src}
          avatarHint={selectedAvatar.hint}
          backgroundHint={selectedBackground.hint}
        />
        <StatsCard xp={student.xp} gold={student.gold} />
      </div>
      <div className="md:col-span-1">
        <CustomizationPanel
          avatars={avatars}
          backgrounds={backgrounds}
          selectedAvatarId={selectedAvatar.id}
          selectedBackgroundId={selectedBackground.id}
          onAvatarSelect={setSelectedAvatar}
          onBackgroundSelect={setSelectedBackground}
          onNewAvatarGenerated={handleAddNewAvatar}
        />
      </div>
    </div>
  );
}
