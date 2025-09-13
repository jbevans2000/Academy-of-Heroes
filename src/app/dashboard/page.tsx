
'use client';

import { Suspense } from 'react';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Skeleton } from '@/components/ui/skeleton';
import Dashboard from './dashboard';
import { DashboardHeader } from '@/components/dashboard/header';


function DashboardLoading() {
    return (
       <div className="flex min-h-screen w-full flex-col">
        <DashboardHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
             <div className="mx-auto max-w-4xl space-y-6">
                <Skeleton className="h-[450px] w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        </main>
      </div>
    )
}


export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
        <Dashboard />
    </Suspense>
  );
}
