
import Image from 'next/image';

interface AvatarDisplayProps {
  avatarSrc: string;
  avatarHint: string;
}

export function AvatarDisplay({ avatarSrc, avatarHint }: AvatarDisplayProps) {
  return (
    <div className="flex justify-center items-center py-4">
        <div className="relative w-96 h-96">
           <Image
            src={avatarSrc}
            alt="Selected avatar"
            width={384}
            height={384}
            className="object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all duration-500"
            data-ai-hint={avatarHint}
            priority
           />
        </div>
    </div>
  );
}
