
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Boon, PendingBoonRequest, BoonTransaction } from '@/lib/boons';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, PlusCircle, Edit, Trash2, Loader2, Star, Coins, EyeOff, Eye, Bell, Check, X, History } from 'lucide-react';
import Image from 'next/image';
import { deleteBoon, updateBoonVisibility, populateDefaultBoons, approveBoonRequest, denyBoonRequest } from '@/ai/flows/manage-boons';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';


export default function BoonsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [boons, setBoons] = useState<Boon[]>([]);
    const [pendingRequests, setPendingRequests] = useState<PendingBoonRequest[]>([]);
    const [transactions, setTransactions] = useState<BoonTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isToggling, setIsToggling] = useState<string | null>(null);
    const [isPopulating, setIsPopulating] = useState(false);
    const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                setTeacher(user);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!teacher) return;
        
        const boonsQuery = query(collection(db, 'teachers', teacher.uid, 'boons'), orderBy('createdAt', 'desc'));
        const pendingQuery = query(collection(db, 'teachers', teacher.uid, 'pendingBoonRequests'), orderBy('requestedAt', 'desc'));
        const transactionsQuery = query(collection(db, 'teachers', teacher.uid, 'boonTransactions'), orderBy('timestamp', 'desc'), limit(15));
        
        const unsubBoons = onSnapshot(boonsQuery, (snapshot) => {
            setBoons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boon)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching boons: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch boons data.' });
            setIsLoading(false);
        });

        const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
            setPendingRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingBoonRequest)));
        });

        const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoonTransaction)));
        });

        return () => {
            unsubBoons();
            unsubPending();
            unsubTransactions();
        };
    }, [teacher, toast]);
    
    const sortedBoons = useMemo(() => {
        return [...boons].sort((a, b) => {
            const aVisible = a.isVisibleToStudents ?? false;
            const bVisible = b.isVisibleToStudents ?? false;
            if (aVisible === bVisible) {
                // If visibility is the same, sort by creation date (already done by query)
                return 0; 
            }
            return aVisible ? -1 : 1; // Visible items first
        });
    }, [boons]);

    const handlePopulateBoons = async () => {
        if (!teacher) return;
        setIsPopulating(true);
        try {
            const result = await populateDefaultBoons(teacher.uid);
            if (!result.success) {
                throw new Error(result.error || 'An unknown error occurred.');
            }
            toast({ title: "Workshop Stocked!", description: "A set of suggested classroom Rewards has been added to your workshop." });
        } catch (error: any) {
            console.error("Error populating boons:", error);
            toast({ variant: "destructive", title: "Failed to Stock", description: error.message });
        } finally {
            setIsPopulating(false);
        }
    }

    const handleDelete = async (boonId: string) => {
        if (!teacher) return;
        setIsDeleting(boonId);
        try {
            const result = await deleteBoon(teacher.uid, boonId);
            if (result.success) {
                toast({ title: "Reward Deleted", description: "The Reward has been removed from your store." });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Error deleting boon: ", error);
            toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
        } finally {
            setIsDeleting(null);
        }
    };
    
    const handleVisibilityToggle = async (boon: Boon) => {
        if (!teacher) return;
        const newVisibility = !(boon.isVisibleToStudents ?? false);
        setIsToggling(boon.id);
        try {
            const result = await updateBoonVisibility(teacher.uid, boon.id, newVisibility);
            if (!result.success) {
                throw new Error(result.error);
            }
        } catch(error: any) {
             console.error("Error toggling boon visibility: ", error);
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setIsToggling(null);
        }
    }

    const handleApproval = async (requestId: string, approve: boolean) => {
        if (!teacher) return;
        setIsProcessingRequest(requestId);
        try {
            const result = approve 
                ? await approveBoonRequest({ teacherUid: teacher.uid, requestId })
                : await denyBoonRequest(teacher.uid, requestId);
            
            if (result.success) {
                toast({ title: 'Success!', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'Action Failed', description: result.error });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        } finally {
            setIsProcessingRequest(null);
        }
    };


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                     <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold flex items-center gap-2"><Star className="text-yellow-400"/> Guild Rewards</h1>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                            </Button>
                            <Button onClick={() => router.push('/teacher/boons/new')}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create New Reward
                            </Button>
                        </div>
                    </div>
                    <div>
                        {isLoading ? (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-64" />)}
                            </div>
                        ) : boons.length === 0 ? (
                            <Card className="text-center py-20">
                                <CardHeader>
                                    <CardTitle>The Workshop is Empty</CardTitle>
                                    <CardDescription>Would you like to populate the workshop with a set of suggested classroom Rewards?</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center gap-4">
                                    <Button onClick={handlePopulateBoons} disabled={isPopulating}>
                                        {isPopulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                                        Yes, Add Default Rewards
                                    </Button>
                                    <Button variant="secondary" onClick={() => router.push('/teacher/boons/new')}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> No, I'll Create My Own
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                {sortedBoons.map(boon => (
                                    <Card key={boon.id} className={cn("flex flex-col transition-all", !boon.isVisibleToStudents && 'bg-muted/50 border-dashed')}>
                                        <CardHeader>
                                            <div className="aspect-square relative w-full bg-secondary rounded-md overflow-hidden">
                                                <Image src={boon.imageUrl || 'https://placehold.co/400x400.png'} alt={boon.name} fill className="object-cover" data-ai-hint="fantasy item" />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-grow space-y-2">
                                            <CardTitle>{boon.name}</CardTitle>
                                            <div className="flex items-center gap-2 text-lg font-bold text-amber-600">
                                                <Coins className="h-5 w-5" />
                                                <span>{boon.cost}</span>
                                            </div>
                                            <CardDescription>{boon.description}</CardDescription>
                                        </CardContent>
                                        <CardFooter className="flex-col gap-4">
                                            <div className="flex items-center space-x-2 w-full border p-2 rounded-md justify-center">
                                                {isToggling === boon.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Switch
                                                    id={`visibility-${boon.id}`}
                                                    checked={boon.isVisibleToStudents ?? false}
                                                    onCheckedChange={() => handleVisibilityToggle(boon)}
                                                />}
                                                <Label htmlFor={`visibility-${boon.id}`} className="flex items-center gap-1 cursor-pointer">
                                                    {boon.isVisibleToStudents ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                                                    {boon.isVisibleToStudents ? 'Visible' : 'Hidden'}
                                                </Label>
                                            </div>
                                            <div className="flex w-full gap-2">
                                                <Button variant="outline" className="w-full" onClick={() => router.push(`/teacher/boons/edit/${boon.id}`)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" className="w-full" disabled={isDeleting === boon.id}>
                                                            {isDeleting === boon.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete "{boon.name}"?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will permanently remove the Reward from your workshop. This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(boon.id)}>
                                                                Yes, Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className={cn("h-6 w-6", pendingRequests.length > 0 && "text-primary animate-pulse")} />
                                Pending Approvals
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             {pendingRequests.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No pending requests.</p>
                            ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                {pendingRequests.map(req => (
                                    <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <p className="font-bold">{req.characterName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Wants to buy <span className="font-semibold">{req.boonName}</span> for <span className="font-semibold text-amber-600">{req.cost}g</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground"> {formatDistanceToNow(new Date(req.requestedAt.seconds * 1000), { addSuffix: true })}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="destructive" onClick={() => handleApproval(req.id, false)} disabled={!!isProcessingRequest}>
                                                {isProcessingRequest === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                            </Button>
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproval(req.id, true)} disabled={!!isProcessingRequest}>
                                                {isProcessingRequest === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-6 w-6" />
                                Transaction Log
                            </CardTitle>
                            <CardDescription>The most recent Reward purchases and uses.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                            {transactions.length === 0 && <p className="text-muted-foreground text-sm text-center">No transactions yet.</p>}
                            {transactions.map(tx => (
                                <div key={tx.id} className="text-sm border-b pb-2">
                                    <p><span className="font-bold">{tx.characterName}</span> {tx.transactionType === 'purchase' ? 'purchased' : 'used'} <span className="font-semibold text-primary">{tx.boonName}</span>
                                    {tx.transactionType === 'purchase' && ` for ${tx.cost} gold`}.
                                    </p>
                                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(tx.timestamp.seconds * 1000), { addSuffix: true })}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
