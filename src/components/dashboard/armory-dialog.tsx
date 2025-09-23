
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Student } from '@/lib/data';
import type { ArmorPiece } from '@/lib/forge';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Coins, Star, ShieldCheck, ShoppingCart } from 'lucide-react';
import { purchaseArmor } from '@/ai/flows/manage-armor';

interface ArmorCardProps {
    armor: ArmorPiece;
    student: Student;
    onPurchaseClick: (armor: ArmorPiece) => void;
}

const ArmorCard = ({ armor, student, onPurchaseClick }: ArmorCardProps) => {
    const isOwned = student.ownedArmorIds?.includes(armor.id);
    const meetsLevel = student.level >= armor.levelRequirement;
    const meetsClass = armor.classRequirement === 'Any' || armor.classRequirement === student.class;
    const canAfford = student.gold >= armor.goldCost;

    let buttonText = 'Purchase';
    let buttonDisabled = isOwned || !meetsLevel || !meetsClass || !canAfford;
    if(isOwned) buttonText = 'Owned';
    else if (!meetsLevel) buttonText = `Requires Level ${armor.levelRequirement}`;
    else if (!meetsClass) buttonText = `Requires ${armor.classRequirement} Class`;
    else if (!canAfford) buttonText = 'Not Enough Gold';

    return (
        <Card className="flex flex-col text-center">
            <CardHeader className="p-2">
                <div className="aspect-square relative w-full bg-secondary rounded-md overflow-hidden">
                    <Image src={armor.imageUrl} alt={armor.name} fill className="object-contain" />
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-1 p-2">
                <h4 className="font-bold">{armor.name}</h4>
                 <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {armor.classRequirement}</span>
                    <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Lvl {armor.levelRequirement}</span>
                 </div>
            </CardContent>
            <CardFooter className="flex-col gap-2 p-2">
                <div className="flex items-center gap-2 text-lg font-bold text-amber-600">
                    <Coins className="h-5 w-5" />
                    <span>{armor.goldCost.toLocaleString()}</span>
                </div>
                <Button className="w-full" onClick={() => onPurchaseClick(armor)} disabled={buttonDisabled}>
                    <ShoppingCart className="mr-2 h-4 w-4"/>
                    {buttonText}
                </Button>
            </CardFooter>
        </Card>
    )
}

export function ArmoryDialog({ isOpen, onOpenChange, student, allArmor, itemType = 'armor' }: ArmoryDialogProps) {
    const { toast } = useToast();
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [confirmingPurchase, setConfirmingPurchase] = useState<ArmorPiece | null>(null);

    const handlePurchaseClick = (armor: ArmorPiece) => {
        if (itemType === 'pet') {
            setConfirmingPurchase(armor);
        } else {
            handlePurchaseArmor(armor.id);
        }
    };

    const handlePurchaseArmor = async (armorId: string) => {
        if (!student.teacherUid || !student.uid) return;
        
        setIsPurchasing(true);
        if(confirmingPurchase) setConfirmingPurchase(null);

        try {
            const result = await purchaseArmor({
                teacherUid: student.teacherUid,
                studentUid: student.uid,
                armorId
            });

            if (result.success) {
                toast({ title: "Purchase Successful!", description: result.message });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Purchase Failed', description: error.message });
        } finally {
            setIsPurchasing(false);
        }
    }
    
    const sortedArmor = [...allArmor].sort((a, b) => a.levelRequirement - b.levelRequirement);

    return (
        <>
            <AlertDialog open={!!confirmingPurchase} onOpenChange={() => setConfirmingPurchase(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Purchase {confirmingPurchase?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div className="w-48 h-48 relative">
                                    <Image src={confirmingPurchase?.imageUrl || ''} alt={confirmingPurchase?.name || ''} fill className="object-contain" />
                                </div>
                                <p className="text-foreground">{confirmingPurchase?.description}</p>
                                <p>This will cost <span className="font-bold text-amber-600">{confirmingPurchase?.goldCost} Gold</span>. Would you like to purchase {confirmingPurchase?.name} from the Stable?</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPurchasing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handlePurchaseArmor(confirmingPurchase!.id)} disabled={isPurchasing}>
                            {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirm Purchase"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>The {itemType === 'pet' ? 'Stable' : 'Armory'}</DialogTitle>
                        <DialogDescription>
                            Browse and purchase new {itemType === 'pet' ? 'pets' : 'armor pieces'}. Owned items will be available in The Forge.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-full w-full rounded-md border p-4">
                        {sortedArmor.length === 0 ? (
                            <p className="text-center text-muted-foreground py-10">The {itemType === 'pet' ? 'Stable' : 'Armory'} is currently empty.</p>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {sortedArmor.map(armor => (
                                    <ArmorCard key={armor.id} armor={armor} student={student} onPurchaseClick={handlePurchaseClick} />
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
