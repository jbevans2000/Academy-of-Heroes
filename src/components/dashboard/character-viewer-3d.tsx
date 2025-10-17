
'use client';

import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// A fallback component to display while the 3D model would have been loading.
export function CharacterViewerFallback() {
    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <Skeleton className="w-full h-full" />
        </div>
    );
}

// The main component is now simplified to just show the fallback.
export function CharacterViewer3D(props: any) {
    return (
        <Suspense fallback={<CharacterViewerFallback />}>
            <CharacterViewerFallback />
        </Suspense>
    );
};
