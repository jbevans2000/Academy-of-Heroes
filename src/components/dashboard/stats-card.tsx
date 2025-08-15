import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Star, Coins } from 'lucide-react';

interface StatsCardProps {
  xp: number;
  gold: number;
  name: string;
}

export function StatsCard({ xp, gold, name }: StatsCardProps) {
  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>Experience and Gold earned.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
