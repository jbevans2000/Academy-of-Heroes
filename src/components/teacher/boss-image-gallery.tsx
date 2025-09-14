
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
const secondaryImages = [
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(1).jpg?alt=media&token=b819947a-78b2-4b59-8541-8f4bd1a9d425",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(10).jpg?alt=media&token=d0e64fb9-20d0-428f-a1c0-ed8fc1c518d2",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(11).jpg?alt=media&token=391ea8fd-8c69-411a-9193-34a39d6509c6",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(2).jpg?alt=media&token=62067db5-9174-499f-9a19-15f025e95e22",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(3).jpg?alt=media&token=af6e03e4-755a-4f96-9afb-85648fe79829",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(4).jpg?alt=media&token=f15c6528-042d-4ee8-a379-d328761a343b",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(5).jpg?alt=media&token=b01da3e9-26cb-49b4-a2c9-59da511567f3",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(6).jpg?alt=media&token=cdc9ee4e-7bf0-4215-a954-448d6be35f1f",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(7).jpg?alt=media&token=b883edf1-01e4-4b5a-8a54-e28de83f0cde",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(8).jpg?alt=media&token=26b3d1bf-ddc5-4ebc-bc81-71dc87b67b57",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FHS%20Bosses%20(9).jpg?alt=media&token=7d205d35-213b-4cf0-b80d-9b2ffd5d36a5",
    "https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Boss%20Images%2FLibrary%20Boss%20Images%2FES%20Bosses%20(7).jpg?alt=media&token=273fe6fc-1499-4164-b482-0afd41b21609"
];


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
