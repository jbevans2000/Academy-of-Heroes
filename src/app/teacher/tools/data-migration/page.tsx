
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DatabaseZap, Loader2 } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
import { migrateStudentData } from '@/ai/flows/manage-student';

export default function DataMigrationPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [teacher, setTeacher] = useState<User | null>(null);

    const [oldAccountId, setOldAccountId] = useState('');
    const [newAccountId, setNewAccountId] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

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
        const q = query(collection(db, "teachers", teacher.uid, "students"), orderBy("studentName"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
            setStudents(studentsData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [teacher]);

    const activeStudents = useMemo(() => students.filter(s => !s.isArchived), [students]);
    
    const potentialNewAccounts = useMemo(() => 
        activeStudents.filter(s => s.level === 1 && s.xp === 0 && s.uid !== oldAccountId),
        [activeStudents, oldAccountId]
    );

    const handleMigration = async () => {
        if (!teacher || !oldAccountId || !newAccountId) return;
        setIsMigrating(true);
        try {
            const result = await migrateStudentData({
                teacherUid: teacher.uid,
                oldStudentUid: oldAccountId,
                newStudentUid: newAccountId
            });

            if (result.success) {
                toast({
                    title: "Migration Complete!",
                    description: "The student's data has been transferred and the old account has been archived and disabled."
                });
                setOldAccountId('');
                setNewAccountId('');
                setIsConfirmOpen(false);
            } else {
                throw new Error(result.error);
            }

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Migration Failed', description: error.message });
        } finally {
            setIsMigrating(false);
        }
    };

    const oldAccountDetails = students.find(s => s.uid === oldAccountId);
    const newAccountDetails = students.find(s => s.uid === newAccountId);

    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="w-full max-w-2xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/teacher/tools')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to All Tools
                        </Button>
                        <Card className="shadow-2xl">
                            <CardHeader className="text-center">
                                <DatabaseZap className="h-12 w-12 text-primary mx-auto" />
                                <CardTitle className="text-3xl">Account Data Migration</CardTitle>
                                <CardDescription>
                                    Use this tool to transfer a student's progress to a new account if they've lost their password for an alias-based account.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="font-bold text-lg">Step 1: Select the Old, Inaccessible Account</Label>
                                    <Select value={oldAccountId} onValueChange={setOldAccountId} disabled={isLoading}>
                                        <SelectTrigger><SelectValue placeholder="Select a student..." /></SelectTrigger>
                                        <SelectContent>
                                            {activeStudents.map(student => (
                                                <SelectItem key={student.uid} value={student.uid}>
                                                    {student.characterName} ({student.studentName}) - Lvl {student.level}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {oldAccountId && (
                                    <div className="space-y-2 animate-in fade-in-50">
                                        <Label className="font-bold text-lg">Step 2: Select the New, Empty Account</Label>
                                        <Select value={newAccountId} onValueChange={setNewAccountId} disabled={!oldAccountId}>
                                            <SelectTrigger><SelectValue placeholder="Select the new account..." /></SelectTrigger>
                                            <SelectContent>
                                                {potentialNewAccounts.map(student => (
                                                    <SelectItem key={student.uid} value={student.uid}>
                                                        {student.characterName} ({student.studentName})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {potentialNewAccounts.length === 0 && (
                                            <p className="text-sm text-destructive">No new, empty accounts found. The student must create a new account first.</p>
                                        )}
                                    </div>
                                )}
                                <div className="flex justify-center pt-4">
                                    <Button size="lg" disabled={!oldAccountId || !newAccountId} onClick={() => setIsConfirmOpen(true)}>
                                        Migrate Data
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Data Migration</AlertDialogTitle>
                        <AlertDialogDescription>
                           <p>You are about to transfer all data from:</p>
                           <p className="font-bold my-2">{oldAccountDetails?.characterName} ({oldAccountDetails?.studentName})</p>
                           <p>to the new account:</p>
                           <p className="font-bold my-2">{newAccountDetails?.characterName} ({newAccountDetails?.studentName})</p>
                           <p>The old account will be archived and its login will be permanently disabled. This action cannot be undone.</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isMigrating}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMigration} disabled={isMigrating}>
                            {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Confirm & Migrate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
