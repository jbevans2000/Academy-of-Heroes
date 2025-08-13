import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { avatars, backgrounds, studentData } from "@/lib/data";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <DashboardHeader />
      <main className="flex-1">
        <DashboardClient
          student={studentData}
          avatars={avatars}
          backgrounds={backgrounds}
        />
      </main>
    </div>
  );
}
