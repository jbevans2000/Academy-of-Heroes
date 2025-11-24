
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Loader2, Sparkles, User, ArrowRight } from 'lucide-react';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Company } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { transferStudentData } from '@/ai/flows/data-migration';
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


export default function DataMigrationPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTransferring, setIsTransferring] = useState(false);
    const [teacher, setTeacher] = useState<FirebaseUser | null>(null);
    const [teacherUid, setTeacherUid] = useState<string | null>(null);
    
    // State for transfer
    const [oldStudentUid, setOldStudentUid] = useState('');
    const [newStudentUid, setNewStudentUid] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

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
        
        let isMounted = true;
        const determineTeacherUid = async () => {
            const teacherDocRef = doc(db, 'teachers', teacher.uid);
            const teacherDocSnap = await getDoc(teacherDocRef);
            if (teacherDocSnap.exists() && teacherDocSnap.data().accountType === 'co-teacher') {
                if (isMounted) setTeacherUid(teacherDocSnap.data().mainTeacherUid);
            } else {
                if (isMounted) setTeacherUid(teacher.uid);
            }
        };

        determineTeacherUid();
        
        return () => { isMounted = false };
    }, [teacher]);


    useEffect(() => {
        if (!teacherUid) return;
        const studentsQuery = query(collection(db, "teachers", teacherUid, "students"));
        const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
            setAllStudents(studentsData);
            setIsLoading(false);
        });

        return () => unsubStudents();
    }, [teacherUid]);

    const handleTransfer = async () => {
        if (!oldStudentUid || !newStudentUid || !teacherUid) {
            toast({
                variant: 'destructive',
                title: 'Selection Required',
                description: 'Please select both the old and new student accounts.',
            });
            return;
        }

        setIsTransferring(true);
        try {
            const result = await transferStudentData({
                teacherUid,
                oldStudentUid,
                newStudentUid,
            });

            if (result.success) {
                toast({
                    title: 'Transfer Successful!',
                    description: 'The student\'s game data has been moved to the new account.',
                });
                setOldStudentUid('');
                setNewStudentUid('');
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Transfer Failed',
                description: error.message,
            });
        } finally {
            setIsTransferring(false);
            setIsConfirming(false);
        }
    };
    
    const oldStudent = allStudents.find(s => s.uid === oldStudentUid);
    const newStudent = allStudents.find(s => s.uid === newStudentUid);

    return (
        <>
            <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Data Transfer</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to transfer all game data from <span className="font-bold">{oldStudent?.characterName}</span> to <span className="font-bold">{newStudent?.characterName}</span>?
                            <br/><br/>
                            The old account (<span className="font-bold">{oldStudent?.studentName}</span>) will be permanently deleted. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTransfer}>Confirm Transfer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="relative flex min-h-screen w-full flex-col">
                 <div 
                    className="absolute inset-0 -z-10"
                    style={{
                        backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.googleapis.com/o/Web%20Backgrounds%2Fenvato-labs-ai-01eb6e6f-c49f-49a6-8296-3b97d092a4c2.jpg?alt=media&token=6fe54bce-fef4-4ad1-92a2-fdef04425008')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <div className="absolute inset-0 bg-black/30 -z-10" />
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
                    <div className="w-full max-w-2xl space-y-6">
                         <Button variant="outline" onClick={() => router.push('/teacher/tools')} className="bg-background/80">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to All Tools
                        </Button>
                        <Card className="shadow-2xl text-center bg-card/80 backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex justify-center mb-2">
                                    <Sparkles className="h-12 w-12 text-primary" />
                                </div>
                                <CardTitle className="text-3xl">Data Migration</CardTitle>
                                <CardDescription>Transfer a student's progress to a new account.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <p className="text-muted-foreground">Use this tool if a student has lost access to their original account and has had to create a new one. This will transfer all game data (XP, Gold, Level, Quest Progress, etc.) to the new account and delete the old one.</p>
                                
                                {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : (
                                    <div className="flex items-center justify-center gap-4">
                                        <div className="w-1/2 space-y-2 text-left">
                                            <Label htmlFor="old-student">Old Account (to be deleted)</Label>
                                            <Select value={oldStudentUid} onValueChange={setOldStudentUid}>
                                                <SelectTrigger id="old-student"><SelectValue placeholder="Select student..."/></SelectTrigger>
                                                <SelectContent>
                                                    {allStudents.map(s => <SelectItem key={s.uid} value={s.uid}>{s.characterName} ({s.studentName})</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <ArrowRight className="h-8 w-8 mt-6"/>
                                        <div className="w-1/2 space-y-2 text-left">
                                            <Label htmlFor="new-student">New Account (receives data)</Label>
                                            <Select value={newStudentUid} onValueChange={setNewStudentUid}>
                                                <SelectTrigger id="new-student"><SelectValue placeholder="Select student..."/></SelectTrigger>
                                                <SelectContent>
                                                     {allStudents.filter(s => s.uid !== oldStudentUid).map(s => <SelectItem key={s.uid} value={s.uid}>{s.characterName} ({s.studentName})</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                                <Button size="lg" onClick={() => setIsConfirming(true)} disabled={isLoading || isTransferring || !oldStudentUid || !newStudentUid}>
                                    {isTransferring ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Initiate Transfer
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </>
    );
}
