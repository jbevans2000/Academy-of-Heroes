
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

interface BossImageGalleryProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onImageSelect: (url: string) => void;
}

const generatePlaceholders = (count: number, seedPrefix: string) => {
    return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${seedPrefix}${i + 1}/400/400`);
};

const primaryImages = generatePlaceholders(12, 'primary');
const secondaryImages = generatePlaceholders(12, 'secondary');

export function BossImageGallery({ isOpen, onOpenChange, onImageSelect }: BossImageGalleryProps) {
    const [view, setView] = useState<'selection' | 'primary' | 'secondary'>('selection');
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

    const handleConfirm = () => {
        if (selectedUrl) {
            onImageSelect(selectedUrl);
            onOpenChange(false);
            // Reset view for next time
            setTimeout(() => setView('selection'), 300);
        }
    };
    
    const handleCancel = () => {
        onOpenChange(false);
        setTimeout(() => setView('selection'), 300);
    }
    
    const renderImageGrid = (images: string[]) => (
        <ScrollArea className="h-96 w-full rounded-md border p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((url, index) => (
                    <div 
                        key={index} 
                        className="relative group cursor-pointer"
                        onClick={() => setSelectedUrl(url)}
                    >
                        <Image
                            src={url}
                            alt={`Boss Image ${index + 1}`}
                            width={200}
                            height={200}
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
    );

    return (
        <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Choose a Boss Image</DialogTitle>
                    <DialogDescription>
                        {view === 'selection' 
                            ? 'Select a school level to see appropriate boss images.'
                            : 'Select an image for your battle.'
                        }
                    </DialogDescription>
                </DialogHeader>
                
                {view === 'selection' && (
                    <div className="grid grid-cols-2 gap-4 py-8">
                        <Button variant="outline" className="h-24 text-xl" onClick={() => setView('primary')}>Primary School</Button>
                        <Button variant="outline" className="h-24 text-xl" onClick={() => setView('secondary')}>Secondary School</Button>
                    </div>
                )}

                {view === 'primary' && renderImageGrid(primaryImages)}
                {view === 'secondary' && renderImageGrid(secondaryImages)}
                
                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!selectedUrl}>
                        Confirm Selection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
