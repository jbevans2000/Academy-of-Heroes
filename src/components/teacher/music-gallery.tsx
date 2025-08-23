
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
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Stop playing audio when the dialog is closed
    useEffect(() => {
        if (!isOpen && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setPlayingUrl(null);
        }
    }, [isOpen]);

    const handlePlayPause = (url: string) => {
        // If another track is playing, stop it first
        if (audioRef.current && playingUrl && playingUrl !== url) {
            audioRef.current.pause();
        }

        // If the clicked track is the one currently playing, pause it
        if (playingUrl === url && audioRef.current) {
            audioRef.current.pause();
            setPlayingUrl(null);
        } else {
            // Otherwise, play the new track
            if (!audioRef.current || audioRef.current.src !== url) {
                audioRef.current = new Audio(url);
                audioRef.current.onended = () => setPlayingUrl(null);
            }
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
            setPlayingUrl(url);
        }
    };
    
    const handleConfirm = () => {
        if (selectedUrl) {
            onMusicSelect(selectedUrl);
            onOpenChange(false);
            if(audioRef.current) {
                audioRef.current.pause();
                setPlayingUrl(null);
            }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Choose Battle Music</DialogTitle>
                    <DialogDescription>Select one of the default tracks for your battle.</DialogDescription>
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayPause(track.url);
                                    }}
                                >
                                    {playingUrl === track.url ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                                    {playingUrl === track.url ? 'Pause' : 'Preview'}
                                </Button>
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
