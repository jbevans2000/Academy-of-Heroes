
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { LibraryHub } from '@/lib/quests';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';

interface CreatorProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  creator: { id: string; name: string; avatarUrl?: string; bio?: string } | null;
  allHubs: LibraryHub[];
}

export function CreatorProfileDialog({ isOpen, onOpenChange, creator, allHubs }: CreatorProfileDialogProps) {
  if (!creator) return null;

  const creatorHubs = allHubs.filter(hub => hub.originalTeacherId === creator.id);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="items-center text-center">
          <Avatar className="w-24 h-24 mb-4">
            <AvatarImage src={creator.avatarUrl} alt={creator.name} />
            <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <DialogTitle className="text-2xl font-bold">{creator.name}</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground px-6">{creator.bio}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h4 className="font-semibold mb-2 text-center">Shared Quests by {creator.name} ({creatorHubs.length})</h4>
           <ScrollArea className="h-64 rounded-md border p-4">
            <div className="space-y-4">
              {creatorHubs.length > 0 ? (
                creatorHubs.map(hub => (
                    <Card key={hub.id}>
                        <CardHeader>
                            <CardTitle>{hub.name}</CardTitle>
                            <CardDescription>
                                <Badge>{hub.gradeLevel}</Badge>
                                <Badge variant="secondary" className="ml-2">{hub.subject}</Badge>
                            </CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button size="sm" variant="outline">Preview</Button>
                        </CardFooter>
                    </Card>
                ))
              ) : (
                <p className="text-muted-foreground text-center">This creator has not shared any hubs yet.</p>
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
