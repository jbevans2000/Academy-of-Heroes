
'use client';

import { Suspense } from 'react';
import { TeacherHeader } from "@/components/teacher/teacher-header";
import { Skeleton } from '@/components/ui/skeleton';
import Dashboard from './dashboard';


function DashboardLoading() {
    return (
       <div className="flex min-h-screen w-full flex-col">
        <TeacherHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-4">All Students</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-8 w-3/4" />
                         <Skeleton className="h-6 w-1/2" />
                    </div>
                ))}
            </div>
        </main>
      </div>
    )
}


export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
        <Dashboard />
    </Suspense>
  );
}
