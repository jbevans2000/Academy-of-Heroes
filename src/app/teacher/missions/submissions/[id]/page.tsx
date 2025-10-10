
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, doc, getDoc, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Mission, Company } from '@/lib/data';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, BookOpen } from 'lucide-react';
import { ClientOnlyTime } from '@/components/client-only-time';
import { Label } from '@/components/ui/label';

interface Submission {
    id: string; // student uid
    status: 'draft' | 'submitted' | 'completed';
    submittedAt?: any;
}

export default function MissionSubmissionsPage() {
    const router = useRouter();
    const params = useParams();
    const missionId = params.id as string;
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [mission, setMission] = useState<Mission | null>(null);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companyFilter, setCompanyFilter] = useState('all');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) setTeacher(user);
            else router.push('/teacher/login');
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!teacher || !missionId) return;

        const unsubs: (() => void)[] = [];

        // Fetch mission details
        const missionRef = doc(db, 'teachers', teacher.uid, 'missions', missionId);
        unsubs.push(onSnapshot(missionRef, (docSnap) => {
            if (docSnap.exists()) {
                setMission({ id: docSnap.id, ...docSnap.data() } as Mission);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Mission not found.' });
                router.push('/teacher/missions');
            }
        }));

        // Fetch all students
        const studentsQuery = query(collection(db, 'teachers', teacher.uid, 'students'));
        unsubs.push(onSnapshot(studentsQuery, (snapshot) => {
            setAllStudents(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));
        }));

        // Fetch submissions for this mission
        const submissionsRef = collection(db, 'teachers', teacher.uid, 'missions', missionId, 'submissions');
        unsubs.push(onSnapshot(submissionsRef, (snapshot) => {
            setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)));
        }));
        
        // Fetch companies for filtering
        const companiesQuery = query(collection(db, 'teachers', teacher.uid, 'companies'));
        unsubs.push(onSnapshot(companiesQuery, (snapshot) => {
            setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
        }));

        setIsLoading(false);
        return () => unsubs.forEach(unsub => unsub());

    }, [teacher, missionId, router, toast]);
    
    const filteredStudents = useMemo(() => {
        let studentsToList = allStudents.filter(s => !s.isArchived && !s.isHidden);
        if (companyFilter !== 'all') {
            if (companyFilter === 'freelancers') {
                return studentsToList.filter(s => !s.companyId);
            }
            return studentsToList.filter(s => s.companyId === companyFilter);
        }
        return studentsToList;
    }, [allStudents, companyFilter]);

    if (isLoading || !mission) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/missions')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Missions
                    </Button>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BookOpen/> Submissions for: {mission.title}</CardTitle>
                            <CardDescription>Track student submission status for this special mission.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center gap-4 mb-4">
                                <Label htmlFor="company-filter">Filter by Company:</Label>
                                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                                    <SelectTrigger id="company-filter" className="w-[200px]">
                                        <SelectValue placeholder="Filter..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Companies</SelectItem>
                                        <SelectItem value="freelancers">Freelancers</SelectItem>
                                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Submitted At</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.map(student => {
                                        const submission = submissions.find(s => s.id === student.uid);
                                        const status = submission?.status || 'Not Submitted';
                                        
                                        return (
                                            <TableRow key={student.uid}>
                                                <TableCell className="font-medium">{student.studentName}</TableCell>
                                                <TableCell className="capitalize font-semibold">
                                                    {status === 'submitted' ? 'Pending Review' : status}
                                                </TableCell>
                                                <TableCell>
                                                    {submission?.submittedAt ? (
                                                        <ClientOnlyTime date={new Date(submission.submittedAt.seconds * 1000)} />
                                                    ) : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                     <Button variant="outline" size="sm" disabled={status !== 'submitted'}>
                                                        Review Submission
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
