
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ClassType } from '@/lib/data';

interface AvatarDisplayProps {
  avatarSrc: string;
  avatarHint: ClassType | string;
  useCustomAvatar?: boolean;
}

export function AvatarDisplay({ avatarSrc, avatarHint, useCustomAvatar }: AvatarDisplayProps) {

  const avatarBorderColor = {
    Mage: 'border-blue-600',
    Healer: 'border-green-500',
    Guardian: 'border-amber-500',
    '': 'border-transparent',
  }[avatarHint as ClassType] || 'border-transparent';

  // Cache-busting: Append a unique query string to the image URL to force re-fetch.
  const cacheBustedSrc = `${avatarSrc}?t=${new Date().getTime()}`;

  return (
    <div className="flex justify-center items-center py-4">
        {useCustomAvatar ? (
             <div className={cn("relative w-96 h-96", avatarBorderColor)}>
                 <Image
                    src={cacheBustedSrc}
                    alt="Custom student avatar"
                    fill
                    className="object-cover"
                    data-ai-hint="character"
                    priority
                />
             </div>
        ) : (
             <div className={cn("relative w-96 h-96 border-8 bg-black/20 p-2 shadow-inner", avatarBorderColor)}>
                <Image
                    src={avatarSrc}
                    alt="Selected avatar"
                    fill
                    className="object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all duration-500"
                    data-ai-hint={avatarHint}
                    priority
                />
            </div>
        )}
    </div>
  );
}
