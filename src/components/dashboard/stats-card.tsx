
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Star, Coins, Trophy } from 'lucide-react';

interface StatsCardProps {
  xp: number;
  gold: number;
  level: number;
  characterName: string;
  studentName: string;
}

export function StatsCard({ xp, gold, level, characterName, studentName }: StatsCardProps) {
  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle>{studentName}</CardTitle>
        <CardDescription>{characterName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <div className="flex items-center space-x-3 bg-secondary p-4 rounded-lg">
            <Trophy className="h-8 w-8 text-orange-400" />
            <div>
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-2xl font-bold">{level}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-secondary p-4 rounded-lg">
            <Star className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-sm text-muted-foreground">Experience</p>
              <p className="text-2xl font-bold">{xp.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-secondary p-4 rounded-lg">
            <Coins className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Gold</p>
              <p className="text-2xl font-bold">{gold.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
