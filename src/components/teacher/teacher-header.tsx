
'use client';

import { School, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function TeacherHeader() {
  const router = useRouter();

  const handleLogout = () => {
    // Simply redirect to the main login page
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <Link href="/teacher/dashboard" className="flex items-center gap-2 font-semibold">
        <School className="h-6 w-6 text-primary" />
        <span className="text-xl">Teacher Dashboard</span>
      </Link>
      <div className="ml-auto">
        <Button onClick={handleLogout} className="bg-amber-500 hover:bg-amber-600 text-white">
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </div>
    </header>
  );
}
