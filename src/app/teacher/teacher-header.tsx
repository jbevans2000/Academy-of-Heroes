
'use client';

import { School, LogOut, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export function TeacherHeader() {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
        await signOut(auth);
        toast({
            title: 'Logged Out',
            description: 'You have been successfully logged out.',
        });
        router.push('/');
    } catch (error) {
        console.error("Error signing out: ", error);
        toast({
            variant: 'destructive',
            title: 'Logout Failed',
            description: 'There was an issue signing you out. Please try again.',
        });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <Link href="/teacher/dashboard" className="flex items-center gap-2 font-semibold">
        <School className="h-6 w-6 text-primary" />
        <span className="text-xl">The Guild Leader's Dais</span>
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/teacher/help')}>
            <LifeBuoy className="mr-2 h-5 w-5" />
            Help
        </Button>
        <Button onClick={handleLogout} className="bg-amber-500 hover:bg-amber-600 text-white">
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </div>
    </header>
  );
}
