import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Background } from '@/lib/data';

interface BackgroundSelectorProps {
  backgrounds: Background[];
  selectedBackgroundId: number;
  onSelect: (background: Background) => void;
}

export function BackgroundSelector({ backgrounds, selectedBackgroundId, onSelect }: BackgroundSelectorProps) {
  return (
    <ScrollArea className="h-96">
      <div className="grid grid-cols-2 gap-4 pr-4">
        {backgrounds.map((background) => (
          <div
            key={background.id}
            onClick={() => onSelect(background)}
            className={cn(
              'cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200',
              selectedBackgroundId === background.id ? 'border-primary ring-2 ring-primary shadow-lg' : 'border-transparent hover:border-primary/50'
            )}
          >
            <Image
              src={background.src}
              alt={background.name}
              width={150}
              height={100}
              className="w-full aspect-video object-cover"
              data-ai-hint={background.hint}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
