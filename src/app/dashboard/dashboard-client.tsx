
"use client";

import type { Student } from "@/lib/data";
import { StatsCard } from "./stats-card";
import { AvatarDisplay } from "./avatar-display";
import { Button } from "../ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Map, Swords, Sparkles, BookHeart, Image as ImageIcon } from "lucide-react";
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from 'next/image';

interface DashboardClientProps {
  student: Student;
}

export function DashboardClient({ student }: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleReadyForBattle = async () => {
    if (!student.teacherUid) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot find your teacher\'s guild.' });
      return;
    }
    const studentRef = doc(db, 'teachers', student.teacherUid, 'students', student.uid);
    await updateDoc(studentRef, { inBattle: true });
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
             <Link href="/dashboard/songs-and-stories" passHref className="w-full">
                <Button size="lg" variant="secondary" className="w-full py-8 text-lg">
                    <BookHeart className="mr-4 h-8 w-8" />
                    Songs and Stories
                </Button>
            </Link>
             <Link href="/dashboard/avatars" passHref className="w-full">
                <Button size="lg" variant="secondary" className="w-full py-8 text-lg">
                    <ImageIcon className="mr-4 h-8 w-8" />
                    Change Avatar
                </Button>
            </Link>
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
        <div className="flex justify-center pt-6">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <div className="relative cursor-pointer transition-transform hover:scale-105">
                            <Image 
                                src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Button%20Images%2Fenvato-labs-ai-3b15fc38-f56c-4a0a-ad37-13b60023783c.jpg?alt=media&token=faf4cc58-1c2c-43f9-babc-23ad285da1b0" 
                                alt="The Armory - Coming Soon"
                                width={300}
                                height={100}
                                className="rounded-lg shadow-lg border-2 border-transparent hover:border-primary"
                                data-ai-hint="fantasy blacksmith"
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>The Armory has been ransacked by hobgoblins. Check back soon!</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
