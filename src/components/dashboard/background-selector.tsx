import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface BackgroundSelectorProps {
  backgrounds: string[];
  selectedBackgroundUrl: string;
  onSelect: (url: string) => void;
}

export function BackgroundSelector({ backgrounds, selectedBackgroundUrl, onSelect }: BackgroundSelectorProps) {
  return (
    <TooltipProvider>
    <ScrollArea className="h-96">
      <div className="grid grid-cols-2 gap-4 pr-4">
        {backgrounds.map((background, index) => (
           <Tooltip key={index} delayDuration={100}>
             <TooltipTrigger asChild>
                <div
                    onClick={() => onSelect(background)}
                    className={cn(
                    'cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200',
                    selectedBackgroundUrl === background ? 'border-primary ring-2 ring-primary shadow-lg' : 'border-transparent hover:border-primary/50'
                    )}
                >
                    <Image
                    src={background}
                    alt={`Background option ${index+1}`}
                    width={150}
                    height={100}
                    className="w-full aspect-video object-contain"
                    data-ai-hint="scene background"
                    />
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <Image src={background} alt={`Background option ${index + 1}`} width={300} height={200} className="w-72 h-48 object-contain" />
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </ScrollArea>
    </TooltipProvider>
  );
}
