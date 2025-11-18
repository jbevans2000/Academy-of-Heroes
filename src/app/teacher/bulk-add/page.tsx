
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import Papa from 'papaparse';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Upload, Users, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { bulkCreateStudents, type StudentData } from '@/ai/flows/bulk-create-students';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { classData, type ClassType } from '@/lib/data';

export default function BulkAddPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [students, setStudents] = useState<StudentData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);

    // Manual Entry State
    const [manualStudentName, setManualStudentName] = useState('');
    const [manualCharacterName, setManualCharacterName] = useState('');
    const [manualStudentId, setManualStudentId] = useState('');
    const [manualPassword, setManualPassword] = useState('');
    const [manualClass, setManualClass] = useState<ClassType>('');

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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setStudents([]);

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const requiredHeaders = ['studentName', 'characterName', 'studentId', 'password', 'class'];
                const fileHeaders = results.meta.fields || [];

                if (!requiredHeaders.every(h => fileHeaders.includes(h))) {
                    toast({
                        variant: 'destructive',
                        title: 'Invalid CSV Headers',
                        description: `CSV must contain the following headers: ${requiredHeaders.join(', ')}`,
                    });
                    setIsParsing(false);
                    return;
                }

                const parsedStudents = results.data.map((row: any) => ({
                    studentName: row.studentName?.trim() || '',
                    characterName: row.characterName?.trim() || '',
                    studentId: row.studentId?.trim() || '',
                    password: row.password?.trim() || '',
                    class: row.class?.trim() as ClassType,
                })).filter(s => s.studentName && s.studentId && s.password && s.class);
                
                setStudents(parsedStudents);
                setIsParsing(false);
            },
            error: (error: any) => {
                toast({ variant: 'destructive', title: 'CSV Parsing Error', description: error.message });
                setIsParsing(false);
            }
        });
    };

    const handleAddManualStudent = () => {
        if (!manualStudentName || !manualCharacterName || !manualStudentId || !manualPassword || !manualClass) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all fields for the student.' });
            return;
        }
        const newStudent: StudentData = {
            studentName: manualStudentName,
            characterName: manualCharacterName,
            studentId: manualStudentId,
            password: manualPassword,
            class: manualClass,
        };
        setStudents(prev => [...prev, newStudent]);
        // Reset form
        setManualStudentName('');
        setManualCharacterName('');
        setManualStudentId('');
        setManualPassword('');
        setManualClass('');
    };

    const handleRemoveStudent = (index: number) => {
        setStudents(prev => prev.filter((_, i) => i !== index));
    };

    const handleBulkCreate = async () => {
        if (!teacher || students.length === 0) return;

        setIsLoading(true);
        try {
            const result = await bulkCreateStudents({
                teacherUid: teacher.uid,
                students: students,
            });

            if (result.success) {
                toast({
                    title: 'Bulk Creation In Progress',
                    description: `${result.createdCount} students are being created. ${result.failedCount > 0 ? `${result.failedCount} failed.` : ''} You can now return to the dashboard.`,
                });
                if (result.failedDetails && result.failedDetails.length > 0) {
                    console.error('Failed to create:', result.failedDetails);
                     toast({
                        variant: 'destructive',
                        title: 'Some Students Failed',
                        description: `Check the console for details on ${result.failedCount} failed creations. Common issues are duplicate usernames or weak passwords.`,
                        duration: 8000,
                    });
                }
                router.push('/teacher/dashboard');
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Bulk Creation Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Podium
                    </Button>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users /> Bulk Add Students</CardTitle>
                            <CardDescription>
                                Quickly create multiple student accounts by entering them manually or uploading a CSV file.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="manual">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                    <TabsTrigger value="csv">Upload CSV</TabsTrigger>
                                </TabsList>
                                <TabsContent value="manual" className="mt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                                        <div className="space-y-2">
                                            <Label htmlFor="manual-student-name">Student Name</Label>
                                            <Input id="manual-student-name" value={manualStudentName} onChange={e => setManualStudentName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="manual-character-name">Character Name</Label>
                                            <Input id="manual-character-name" value={manualCharacterName} onChange={e => setManualCharacterName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="manual-student-id">Username</Label>
                                            <Input id="manual-student-id" value={manualStudentId} onChange={e => setManualStudentId(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="manual-password">Password (min. 6 characters)</Label>
                                            <Input id="manual-password" type="password" value={manualPassword} onChange={e => setManualPassword(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="manual-class">Class</Label>
                                            <Select onValueChange={(v) => setManualClass(v as ClassType)} value={manualClass}>
                                                <SelectTrigger id="manual-class"><SelectValue placeholder="Select class..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Guardian">Guardian</SelectItem>
                                                    <SelectItem value="Healer">Healer</SelectItem>
                                                    <SelectItem value="Mage">Mage</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-end">
                                            <Button onClick={handleAddManualStudent} className="w-full">
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add to List
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="csv" className="mt-4">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="csv-upload" className="font-semibold">Upload CSV File</Label>
                                             <Link href="/bulk-add-template.csv" className="text-sm text-primary underline" download>
                                                (Download Template)
                                            </Link>
                                        </div>
                                        <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} disabled={isLoading} />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                    
                    {isParsing && <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}

                    {students.length > 0 && (
                        <Card>
                             <CardHeader>
                                <CardTitle>Students to Be Created ({students.length})</CardTitle>
                                <CardDescription>Review the students below before creating their accounts.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-md max-h-96 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student Name</TableHead>
                                                <TableHead>Character Name</TableHead>
                                                <TableHead>Username</TableHead>
                                                <TableHead>Class</TableHead>
                                                <TableHead>Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.map((s, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{s.studentName}</TableCell>
                                                    <TableCell>{s.characterName}</TableCell>
                                                    <TableCell>{s.studentId}</TableCell>
                                                    <TableCell>{s.class}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(i)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleBulkCreate} disabled={isLoading || isParsing || students.length === 0}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Create {students.length} Students
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
