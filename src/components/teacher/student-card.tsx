import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar as AvatarType, Background, Student } from '@/lib/data';
import { Star, Coins } from 'lucide-react';

interface StudentCardProps {
  student: Student;
  avatar: AvatarType;
  background: Background;
}

export function StudentCard({ student, avatar, background }: StudentCardProps) {
  return (
    <Card className="shadow-lg rounded-xl flex flex-col overflow-hidden transition-transform hover:scale-105 duration-300">
      <CardHeader className="p-0 relative h-32">
        <Image
          src={background.src}
          alt={`${student.name}'s background`}
          fill
          className="object-cover"
          data-ai-hint={background.hint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-4 flex items-end space-x-3">
          <div className="relative w-16 h-16 border-2 border-primary rounded-full overflow-hidden bg-secondary">
            <Image
              src={avatar.src}
              alt={`${student.name}'s avatar`}
              fill
              className="object-contain"
              data-ai-hint={avatar.hint}
            />
          </div>
          <CardTitle className="text-white text-xl font-bold drop-shadow-md pb-1">{student.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <div className="grid grid-cols-2 gap-4 text-sm">
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
      <CardFooter className="p-2">
        <Button asChild className="w-full">
          {/* Note: This currently links to the single student dashboard.
              In a real app, you'd want this to be a dynamic route like /student/${student.id}
          */}
          <Link href="/dashboard">View Dashboard</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
