
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, DatabaseZap, UserX, AlertCircle } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { findOrphanedAccounts, deleteOrphanedUser, type OrphanedAccount } from '@/ai/flows/find-orphaned-accounts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export default function OrphanedAccountsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [orphanedTeachers, setOrphanedTeachers] = useState<OrphanedAccount[]>([]);
    const [orphanedStudents, setOrphanedStudents] = useState<OrphanedAccount[]>([]);
    const [userToDelete, setUserToDelete] = useState<OrphanedAccount | null>(null);

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
        if (teacher) {
            handleScan();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teacher]);

    const handleScan = async () => {
        setIsLoading(true);
        try {
            const result = await findOrphanedAccounts();
            if (result.success) {
                setOrphanedTeachers(result.orphanedTeachers || []);
                setOrphanedStudents(result.orphanedStudents || []);
                toast({ title: 'Scan Complete', description: `Found ${result.orphanedTeachers?.length || 0} orphaned teachers and ${result.orphanedStudents?.length || 0} orphaned students.`});
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Scan Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeleting(userToDelete.uid);
        try {
            const result = await deleteOrphanedUser(userToDelete.uid);
            if (result.success) {
                toast({ title: 'User Deleted', description: `Successfully deleted account for ${userToDelete.email}.` });
                setOrphanedTeachers(prev => prev.filter(u => u.uid !== userToDelete.uid));
                setOrphanedStudents(prev => prev.filter(u => u.uid !== userToDelete.uid));
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
        } finally {
            setIsDeleting(null);
            setUserToDelete(null);
        }
    }
    
    const renderTable = (accounts: OrphanedAccount[]) => (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email / Login ID</TableHead>
                        <TableHead>User ID (UID)</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {accounts.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">No orphaned accounts found.</TableCell>
                        </TableRow>
                    ) : (
                        accounts.map(account => (
                            <TableRow key={account.uid}>
                                <TableCell className="font-medium">{account.email}</TableCell>
                                <TableCell className="font-mono text-xs">{account.uid}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="destructive" size="sm" onClick={() => setUserToDelete(account)} disabled={isDeleting === account.uid}>
                                        {isDeleting === account.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserX className="h-4 w-4"/>}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <>
            <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the authentication account for <span className="font-bold">{userToDelete?.email}</span>.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} disabled={!!isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Delete Account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <AdminHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="w-full max-w-4xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Admin Dashboard
                        </Button>
                         <Card className="shadow-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DatabaseZap className="h-8 w-8 text-primary" />
                                    Orphaned Account Explorer
                                </CardTitle>
                                <CardDescription>
                                    This tool finds user accounts in Firebase Authentication that do not have a corresponding document in Firestore. These "orphaned" accounts may result from incomplete registrations and can be safely deleted.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-center mb-6">
                                    <Button onClick={handleScan} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Scan for Orphaned Accounts
                                    </Button>
                                </div>
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-48">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <Tabs defaultValue="teachers">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="teachers">Orphaned Teachers ({orphanedTeachers.length})</TabsTrigger>
                                            <TabsTrigger value="students">Orphaned Students ({orphanedStudents.length})</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="teachers" className="mt-4">
                                            {renderTable(orphanedTeachers)}
                                        </TabsContent>
                                        <TabsContent value="students" className="mt-4">
                                            {renderTable(orphanedStudents)}
                                        </TabsContent>
                                    </Tabs>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </>
    );
}
