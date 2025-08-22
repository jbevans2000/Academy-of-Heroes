
"use client";

import type { Student } from "@/lib/data";
import { StatsCard } from "./stats-card";
import { AvatarDisplay } from "./avatar-display";
import { Button } from "../ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Map, Swords, Sparkles, BookHeart, ImageIcon, Gem, Package } from "lucide-react";
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
  isTeacherPreview?: boolean;
}

export function DashboardClient({ student, isTeacherPreview = false }: DashboardClientProps) {
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
            student={student}
        />
        {!isTeacherPreview && (
            <div className="flex justify-center pt-6 gap-4">
                 <Link href="/armory" passHref>
                    <Button variant="outline" className="h-auto py-4 px-8 border-2 border-amber-600 bg-amber-500/10 hover:bg-amber-500/20">
                         <div className="relative cursor-pointer transition-transform hover:scale-105 flex items-center gap-4">
                                <Gem className="h-12 w-12 text-amber-500" />
                                <div>
                                    <h3 className="text-xl font-bold">The Armory</h3>
                                    <p className="text-muted-foreground">Spend your gold!</p>
                                </div>
                            </div>
                    </Button>
                </Link>
                 <Link href="/dashboard/inventory" passHref>
                    <Button variant="outline" className="h-auto py-4 px-8 border-2 border-purple-600 bg-purple-500/10 hover:bg-purple-500/20">
                         <div className="relative cursor-pointer transition-transform hover:scale-105 flex items-center gap-4">
                                <Package className="h-12 w-12 text-purple-500" />
                                <div>
                                    <h3 className="text-xl font-bold">My Inventory</h3>
                                    <p className="text-muted-foreground">View your items!</p>
                                </div>
                            </div>
                    </Button>
                </Link>
            </div>
        )}
      </div>
    </div>
  );
}
