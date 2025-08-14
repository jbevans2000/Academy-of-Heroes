"use client";

import { useState, useEffect } from "react";
import type { Student } from "@/lib/data";
import { StatsCard } from "./stats-card";
import { AvatarDisplay } from "./avatar-display";
import { CustomizationPanel } from "./customization-panel";

interface DashboardClientProps {
  student: Student;
  avatars: string[];
  backgrounds: string[];
  onAvatarChange: (url: string) => void;
  onBackgroundChange: (url: string) => void;
}

export function DashboardClient({ 
    student, 
    avatars, 
    backgrounds, 
    onAvatarChange, 
    onBackgroundChange 
}: DashboardClientProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(student.avatarUrl);
  const [selectedBackground, setSelectedBackground] = useState(student.backgroundUrl);

  useEffect(() => {
    setSelectedAvatar(student.avatarUrl);
    setSelectedBackground(student.backgroundUrl);
  }, [student]);

  const handleAvatarSelect = (url: string) => {
    setSelectedAvatar(url);
    onAvatarChange(url);
  };

  const handleBackgroundSelect = (url: string) => {
    setSelectedBackground(url);
    onBackgroundChange(url);
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 lg:gap-8 p-4 md:p-6 lg:p-8">
      <div className="md:col-span-2 space-y-6">
        <AvatarDisplay
          avatarSrc={selectedAvatar}
          backgroundSrc={selectedBackground}
          avatarHint={"character avatar"}
          backgroundHint={"scene background"}
        />
        <StatsCard xp={student.xp} gold={student.gold} name={student.characterName} />
      </div>
      <div className="md:col-span-1">
        <CustomizationPanel
          avatars={avatars}
          backgrounds={backgrounds}
          selectedAvatarUrl={selectedAvatar}
          selectedBackgroundUrl={selectedBackground}
          onAvatarSelect={handleAvatarSelect}
          onBackgroundSelect={handleBackgroundSelect}
        />
      </div>
    </div>
  );
}
