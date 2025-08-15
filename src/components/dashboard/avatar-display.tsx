
import Image from 'next/image';
import { Card } from '@/components/ui/card';

interface AvatarDisplayProps {
  avatarSrc: string;
  backgroundSrc: string;
  avatarHint: string;
  backgroundHint: string;
}

export function AvatarDisplay({ avatarSrc, backgroundSrc, avatarHint, backgroundHint }: AvatarDisplayProps) {
  return (
    <Card className="overflow-hidden aspect-video relative shadow-lg rounded-xl">
      <Image
        src={backgroundSrc}
        alt="Selected background"
        width={1280}
        height={720}
        sizes="100vw"
        className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
        data-ai-hint={backgroundHint}
        priority
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="flex items-center justify-center">
           <Image
            src={avatarSrc}
            alt="Selected avatar"
            width={256}
            height={256}
            className="object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all duration-500"
            data-ai-hint={avatarHint}
            priority
           />
        </div>
      </div>
    </Card>
  );
}
