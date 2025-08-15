
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Student } from '@/lib/data';
import { Star, Coins, User, Gamepad2, Trophy, Heart, Zap } from 'lucide-react';

interface StudentCardProps {
  student: Student;
}

export function StudentCard({ student }: StudentCardProps) {
  return (
    <Card className="shadow-lg rounded-xl flex flex-col overflow-hidden transition-transform hover:scale-105 duration-300">
      <CardHeader className="p-0 relative h-32">
        <Image
          src={student.backgroundUrl}
          alt={`${student.characterName}'s background`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          data-ai-hint="scene"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-4 flex items-end space-x-3">
          <div className="relative w-16 h-16 border-2 border-primary rounded-full overflow-hidden bg-secondary">
            <Image
              src={student.avatarUrl}
              alt={`${student.characterName}'s avatar`}
              fill
               sizes="(max-width: 768px) 25vw, 10vw"
              className="object-contain"
              data-ai-hint="character"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow space-y-3">
        <CardTitle className="text-xl font-bold truncate">{student.characterName}</CardTitle>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{student.studentName}</span>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" />
            <span>{student.class}</span>
        </div>
         <div className="grid grid-cols-3 gap-2 text-sm pt-2">
            <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-orange-400" />
                <div className="flex flex-col">
                <span className="font-semibold">{student.level || 1}</span>
                <span className="text-xs text-muted-foreground">Level</span>
                </div>
            </div>
             <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500" />
                <div className="flex flex-col">
                <span className="font-semibold">{student.hp || 100}</span>
                <span className="text-xs text-muted-foreground">HP</span>
                </div>
            </div>
             <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <div className="flex flex-col">
                <span className="font-semibold">{student.mp || 100}</span>
                <span className="text-xs text-muted-foreground">MP</span>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <div className="flex flex-col">
                <span className="font-semibold">{student.xp.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">XP</span>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <Coins className="h-5 w-5 text-amber-500" />
                <div className="flex flex-col">
                    <span className="font-semibold">{student.gold.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">Gold</span>
                </div>
            </div>
        </div>
      </CardContent>
      <CardFooter className="p-2 bg-secondary/30">
        <Button asChild className="w-full" variant="secondary">
          {/* This will eventually need to link to a dynamic route like /teacher/student/${student.uid} */}
          <Link href="#">View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
