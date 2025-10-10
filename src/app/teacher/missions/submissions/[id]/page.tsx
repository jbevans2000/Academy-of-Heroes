'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Mission, Company } from '@/lib/data';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, BookOpen, Filter } from 'lucide-react';
import { ClientOnlyTime } from '@/components/client-only-time';
import { ReviewSubmissionDialog } from '@/components/teacher/review-submission-dialog';
import { cn } from '@/lib/utils';

interface Submission {
    id: string; // student uid
    status: 'draft' | 'submitted' | 'completed';
    submittedAt?: any;
    submissionContent?: string;
    fileUrl?: string;
    grade?: string;
    feedback?: string;
    xpAwarded?: number;
    goldAwarded?: number;
}

type StatusFilter = 'all' | 'submitted' | 'completed' | 'not_started';


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
    const [companyFilters, setCompanyFilters] = useState<string[]>(['all']);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');


    // State for review dialog
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<{ student: Student, submission: Submission } | null>(null);


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
    
    const handleCompanyFilterChange = (filterId: string) => {
        if (filterId === 'all') {
            setCompanyFilters(['all']);
            return;
        }

        setCompanyFilters(prev => {
            const newFilters = prev.filter(f => f !== 'all');
            if (newFilters.includes(filterId)) {
                const nextFilters = newFilters.filter(f => f !== filterId);
                return nextFilters.length === 0 ? ['all'] : nextFilters;
            } else {
                return [...newFilters, filterId];
            }
        });
    };

    const sortedFilteredStudents = useMemo(() => {
        let studentsToList = allStudents.filter(s => !s.isArchived && !s.isHidden);
        
        // Filter by company
        if (!companyFilters.includes('all')) {
            studentsToList = studentsToList.filter(s => {
                const isFreelancer = !s.companyId;
                if (companyFilters.includes('freelancers') && isFreelancer) {
                    return true;
                }
                if (s.companyId && companyFilters.includes(s.companyId)) {
                    return true;
                }
                return false;
            });
        }
        
        // Filter by status
        if (statusFilter !== 'all') {
            studentsToList = studentsToList.filter(s => {
                const submission = submissions.find(sub => sub.id === s.uid);
                const status = submission?.status || 'not_started';
                return statusFilter === status;
            })
        }
        
        // Sort by submission status then by name
        studentsToList.sort((a, b) => {
            const submissionA = submissions.find(s => s.id === a.uid);
            const submissionB = submissions.find(s => s.id === b.uid);
            
            const getStatusOrder = (status?: 'draft' | 'submitted' | 'completed') => {
                switch(status) {
                    case 'submitted': return 0;
                    case 'draft': return 1;
                    case 'completed': return 2;
                    default: return 3; // Not started
                }
            }

            const statusA = getStatusOrder(submissionA?.status);
            const statusB = getStatusOrder(submissionB?.status);

            if (statusA !== statusB) {
                return statusA - statusB;
            }
            
            return a.studentName.localeCompare(b.studentName);
        });

        return studentsToList;
    }, [allStudents, companyFilters, submissions, statusFilter]);
    
    const handleReviewClick = (student: Student, submission: Submission) => {
        setSelectedSubmission({ student, submission });
        setIsReviewDialogOpen(true);
    };

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
        <>
            {selectedSubmission && teacher && mission && (
                <ReviewSubmissionDialog
                    isOpen={isReviewDialogOpen}
                    onOpenChange={setIsReviewDialogOpen}
                    student={selectedSubmission.student}
                    submission={selectedSubmission.submission}
                    mission={mission}
                    teacherUid={teacher.uid}
                />
            )}
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
                                <div className="flex flex-wrap items-center gap-4 mb-4">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline">
                                                <Filter className="mr-2 h-4 w-4" />
                                                Filter by Company
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuCheckboxItem
                                                checked={companyFilters.includes('all')}
                                                onSelect={(e) => { e.preventDefault(); handleCompanyFilterChange('all'); }}
                                            >
                                                All Companies
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuCheckboxItem
                                                checked={companyFilters.includes('freelancers')}
                                                onSelect={(e) => { e.preventDefault(); handleCompanyFilterChange('freelancers'); }}
                                            >
                                                Freelancers
                                            </DropdownMenuCheckboxItem>
                                            {companies.map(company => (
                                                <DropdownMenuCheckboxItem
                                                    key={company.id}
                                                    checked={companyFilters.includes(company.id)}
                                                    onSelect={(e) => { e.preventDefault(); handleCompanyFilterChange(company.id); }}
                                                >
                                                    {company.name}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                     <div className="flex items-center gap-2 rounded-lg bg-muted p-1">
                                        <Button variant={statusFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('all')}>All</Button>
                                        <Button variant={statusFilter === 'submitted' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('submitted')}>Submitted</Button>
                                        <Button variant={statusFilter === 'completed' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('completed')}>Graded</Button>
                                        <Button variant={statusFilter === 'not_started' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('not_started')}>Not Started</Button>
                                     </div>
                                </div>
                                <div className="border rounded-md">
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
                                            {sortedFilteredStudents.map(student => {
                                                const submission = submissions.find(s => s.id === student.uid);
                                                const status = submission?.status || 'not_started';
                                                
                                                let statusText = 'Not Started';
                                                if (status === 'submitted') statusText = 'Pending Review';
                                                else if (status === 'completed') statusText = 'Graded';
                                                else if (status === 'draft') statusText = 'In Progress';
                                                
                                                return (
                                                    <TableRow key={student.uid}>
                                                        <TableCell className="font-medium">{student.studentName}</TableCell>
                                                        <TableCell className="capitalize font-semibold">{statusText}</TableCell>
                                                        <TableCell>
                                                            {submission?.submittedAt ? (
                                                                <ClientOnlyTime date={new Date(submission.submittedAt.seconds * 1000)} />
                                                            ) : 'N/A'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                disabled={status !== 'submitted' && status !== 'completed'}
                                                                onClick={() => submission && handleReviewClick(student, submission)}
                                                            >
                                                                {status === 'completed' ? 'View Graded' : 'Review Submission'}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </>
    );
}
