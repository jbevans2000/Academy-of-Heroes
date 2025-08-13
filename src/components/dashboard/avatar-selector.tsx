import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Avatar } from '@/lib/data';

interface AvatarSelectorProps {
  avatars: Avatar[];
  selectedAvatarId: number;
  onSelect: (avatar: Avatar) => void;
}

export function AvatarSelector({ avatars, selectedAvatarId, onSelect }: AvatarSelectorProps) {
  return (
    <ScrollArea className="h-96">
      <div className="grid grid-cols-3 gap-4 pr-4">
        {avatars.map((avatar) => (
          <div
            key={avatar.id}
            onClick={() => onSelect(avatar)}
            className={cn(
              'cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200',
              selectedAvatarId === avatar.id ? 'border-primary ring-2 ring-primary shadow-lg' : 'border-transparent hover:border-primary/50'
            )}
          >
            <Image
              src={avatar.src}
              alt={avatar.name}
              width={100}
              height={100}
              className="w-full aspect-square object-cover"
              data-ai-hint={avatar.hint}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
