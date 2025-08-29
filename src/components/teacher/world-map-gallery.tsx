
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { defaultWorldMaps } from '@/lib/maps';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

interface WorldMapGalleryProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onMapSelect: (url: string) => void;
}

export function WorldMapGallery({ isOpen, onOpenChange, onMapSelect }: WorldMapGalleryProps) {
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

    const handleConfirm = () => {
        if (selectedUrl) {
            onMapSelect(selectedUrl);
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Choose a World Map</DialogTitle>
                    <DialogDescription>Select one of the default world maps for your quest line.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 w-full rounded-md border p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {defaultWorldMaps.map((url, index) => (
                            <div 
                                key={index} 
                                className="relative group cursor-pointer"
                                onClick={() => setSelectedUrl(url)}
                            >
                                <Image
                                    src={url}
                                    alt={`World Map ${index + 1}`}
                                    width={200}
                                    height={150}
                                    className={cn(
                                        "w-full h-full object-cover rounded-md transition-all",
                                        selectedUrl === url ? "ring-4 ring-primary ring-offset-2" : "group-hover:opacity-80"
                                    )}
                                />
                                {selectedUrl === url && (
                                    <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                                        <CheckCircle className="h-5 w-5 text-primary-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!selectedUrl}>
                        Confirm Selection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
