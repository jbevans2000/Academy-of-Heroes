
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Star, Coins, Trophy, Heart, Zap, Shield, Wand2, Flame, Map } from 'lucide-react';
import type { ClassType } from "@/lib/data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";


interface StatsCardProps {
  xp: number;
  gold: number;
  level: number;
  hp: number;
  mp: number;
  characterName: string;
  studentName: string;
  characterClass: ClassType;
}

const classIconMap = {
    Guardian: <Shield className="h-8 w-8 text-primary" />,
    Healer: <Heart className="h-8 w-8 text-primary" />,
    Mage: <Wand2 className="h-8 w-8 text-primary" />,
    '': null
}

export function StatsCard({ xp, gold, level, hp, mp, characterName, studentName, characterClass }: StatsCardProps) {
  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="font-headline">{studentName}</CardTitle>
        <CardDescription>{characterName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
           <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            {classIconMap[characterClass]}
            <div>
              <p className="text-sm text-muted-foreground">Class</p>
              <p className="text-xl font-bold">{characterClass}</p>
            </div>
          </div>
           <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            <Trophy className="h-8 w-8 text-orange-400" />
            <div>
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-xl font-bold">{level}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            <Heart className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">HP</p>
              <p className="text-xl font-bold">{hp}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            <Zap className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">MP</p>
              <p className="text-xl font-bold">{mp}</p>
            </div>
          </div>
           <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            <Star className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-sm text-muted-foreground">Experience</p>
              <p className="text-xl font-bold">{xp.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center space-y-2 bg-secondary p-4 rounded-lg">
            <Coins className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Gold</p>
              <p className="text-xl font-bold">{gold.toLocaleString()}</p>
            </div>
          </div>
           <div className="flex flex-col items-center justify-center space-y-4 bg-secondary p-4 rounded-lg col-span-2 sm:col-span-3">
             <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                    <Flame className="h-8 w-8 text-red-600" />
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="mt-2">View Powers</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                        <DropdownMenuLabel>Class Powers</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>No powers unlocked yet</DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex flex-col items-center">
                    <Map className="h-8 w-8 text-green-600" />
                    <Link href="/dashboard/map" passHref>
                        <Button variant="outline" className="mt-2">Continue Quest</Button>
                    </Link>
                </div>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
