
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { royaltyFreeTracks } from '@/lib/music';
import { cn } from '@/lib/utils';
import { CheckCircle, Play, Pause } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MusicGalleryProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onMusicSelect: (url: string) => void;
}

export function MusicGallery({ isOpen, onOpenChange, onMusicSelect }: MusicGalleryProps) {
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
    
    const handleConfirm = () => {
        if (selectedUrl) {
            onMusicSelect(selectedUrl);
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Choose Battle Music</DialogTitle>
                    <DialogDescription>Select one of the default tracks for your battle. Note: Previews are currently unavailable.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 w-full rounded-md border p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {royaltyFreeTracks.map((track, index) => (
                            <Card 
                                key={index} 
                                className={cn("flex flex-col justify-between p-4 cursor-pointer", selectedUrl === track.url && "ring-2 ring-primary")}
                                onClick={() => setSelectedUrl(track.url)}
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">{track.name}</h4>
                                    {selectedUrl === track.url && <CheckCircle className="h-5 w-5 text-primary" />}
                                </div>
                            </Card>
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
