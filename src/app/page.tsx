import { Button } from '@/components/ui/button';
import { LogIn, Shield, UserPlus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function SplashPage() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 text-center text-white">
      {/* Background Image */}
      <Image
        src="https://placehold.co/1920x1080.png"
        alt="A vibrant fantasy landscape with floating islands and a castle."
        fill
        className="object-cover -z-10"
        data-ai-hint="fantasy landscape castle"
        priority
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 -z-10" />

      {/* Content */}
      <main className="z-10 flex flex-grow flex-col items-center justify-center space-y-8 animate-in fade-in-50 duration-1000">
        <header className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold font-headline text-shadow-lg">
            Turn Any Lesson Into an Epic Quest.
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto text-white/90 text-shadow-lg">
            Capture student imagination by transforming your curriculum into a thrilling fantasy adventure. Boost engagement, reward progress, and make learning unforgettable with the power of swords, sorcery, and storytelling.
          </p>
        </header>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/login" passHref>
            <Button size="lg" className="w-full sm:w-auto text-lg py-7 px-8">
              <LogIn className="mr-2" />
              Student & Teacher Login
            </Button>
          </Link>
           <Link href="/register" passHref>
             <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg py-7 px-8">
                <UserPlus className="mr-2" />
                Create a Student Avatar
             </Button>
           </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 w-full max-w-5xl py-4 text-white/70">
          <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center text-sm">
            <p>&copy; {new Date().getFullYear()} Academy of Heroes. All rights reserved.</p>
            <div className="flex gap-4 mt-2 sm:mt-0">
                <Link href="/support" className="hover:text-white transition-colors">Support</Link>
                <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
      </footer>
    </div>
  );
}
