import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AvatarSelectorProps {
  avatars: string[];
  selectedAvatarUrl: string;
  onSelect: (url: string) => void;
}

export function AvatarSelector({ avatars, selectedAvatarUrl, onSelect }: AvatarSelectorProps) {
  return (
    <TooltipProvider>
      <ScrollArea className="h-96">
        <div className="grid grid-cols-3 gap-4 pr-4">
          {avatars.map((avatar, index) => (
            <Tooltip key={index} delayDuration={100}>
                <TooltipTrigger asChild>
                    <div
                        onClick={() => onSelect(avatar)}
                        className={cn(
                        'cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200',
                        selectedAvatarUrl === avatar ? 'border-primary ring-2 ring-primary shadow-lg' : 'border-transparent hover:border-primary/50'
                        )}
                    >
                        <Image
                        src={avatar}
                        alt={`Avatar option ${index + 1}`}
                        width={100}
                        height={100}
                        className="w-full aspect-square object-contain"
                        data-ai-hint="character avatar"
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <Image src={avatar} alt={`Avatar option ${index + 1}`} width={256} height={256} className="w-64 h-64 object-contain" />
                </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
