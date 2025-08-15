
'use client';

import { School, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


export function TeacherHeader() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
        await signOut(auth);
    } catch(e) {
        console.error("Error signing out", e);
    }
    router.push('/');
  };

  return (
    <TooltipProvider>
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <Link href="/teacher/dashboard" className="flex items-center gap-2 font-semibold">
        <School className="h-6 w-6 text-primary" />
        <span className="text-xl">Teacher Dashboard</span>
      </Link>
      <div className="ml-auto">
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Logout</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Return to Login</p>
            </TooltipContent>
        </Tooltip>
      </div>
    </header>
    </TooltipProvider>
  );
}
