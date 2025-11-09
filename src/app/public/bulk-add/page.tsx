
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Heart, Wand, User, KeyRound, Star, BookUser, ArrowLeft, Trash2 } from 'lucide-react';
import type { ClassType } from '@/lib/data';
import { avatarData } from '@/lib/avatars';
import { createStudentDocuments } from '@/ai/flows/create-student';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { validateClassCode } from '@/ai/flows/validate-class-code';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

type ManualStudent = {
    id: string;
    studentName: string;
    class: ClassType;
    signupMethod: 'email' | 'username';
    loginId: string;
    password: string;
}

interface ManualEntryProps {
    students: ManualStudent[];
    onAdd: () => void;
    onRemove: (id: string) => void;
    onChange: (id: string, field: keyof ManualStudent, value: string) => void;
    disabled: boolean;
}

const ManualEntry = ({ students, onAdd, onRemove, onChange, disabled }: ManualEntryProps) => {

    const handleManualStudentChange = (id: string, field: keyof ManualStudent, value: string) => {
        onChange(id, field, value);
    };

    const handleRemoveManualStudent = (id: string) => {
        onRemove(id);
    };
    
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Add students one by one. Use the "Add Another Student" button to create more rows.</p>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Signup Method</TableHead>
                        <TableHead>Email / Username</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {students.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell><Input value={student.studentName} onChange={(e) => handleManualStudentChange(student.id, 'studentName', e.target.value)} /></TableCell>
                            <TableCell>
                                <Select value={student.class} onValueChange={(value) => handleManualStudentChange(student.id, 'class', value)}>
                                    <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Guardian">Guardian</SelectItem>
                                        <SelectItem value="Healer">Healer</SelectItem>
                                        <SelectItem value="Mage">Mage</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell>
                                <Select value={student.signupMethod} onValueChange={(value) => handleManualStudentChange(student.id, 'signupMethod', value)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="username">Username</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell><Input value={student.loginId} onChange={(e) => handleManualStudentChange(student.id, 'loginId', e.target.value)} /></TableCell>
                            <TableCell><Input type="text" value={student.password} onChange={(e) => handleManualStudentChange(student.id, 'password', e.target.value)} /></TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveManualStudent(student.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Button onClick={onAdd} variant="outline" disabled={disabled}>Add Another Student</Button>
        </div>
    );
};


const CSVUpload = ({ onStudentsParsed }: { onStudentsParsed: (students: Omit<ManualStudent, 'id'>[]) => void }) => {
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const requiredHeaders = ['Student Name', 'Class', 'Login ID', 'Password'];
                const headers = results.meta.fields || [];

                if (!requiredHeaders.every(h => headers.includes(h))) {
                    toast({
                        variant: 'destructive',
                        title: 'Invalid CSV Header',
                        description: `CSV must contain the headers: ${requiredHeaders.join(', ')}`,
                    });
                    return;
                }

                const parsedStudents = results.data.map((row: any) => {
                    const studentClass = row['Class']?.trim();
                    const validClasses: ClassType[] = ['Guardian', 'Healer', 'Mage'];

                    if (!validClasses.includes(studentClass)) {
                        toast({
                            variant: 'warning',
                            title: 'Skipped Row',
                            description: `Invalid class "${studentClass}" for student ${row['Student Name']}. Skipping.`,
                        });
                        return null;
                    }
                    
                    const loginId = row['Login ID']?.trim();
                    const signupMethod = loginId.includes('@') ? 'email' : 'username';

                    return {
                        studentName: row['Student Name']?.trim(),
                        class: studentClass as ClassType,
                        signupMethod: signupMethod,
                        loginId: loginId,
                        password: row['Password']?.trim(),
                    };
                }).filter((s): s is Omit<ManualStudent, 'id'> => s !== null && s.studentName && s.class && s.loginId && s.password);

                onStudentsParsed(parsedStudents);
            },
            error: (error: any) => {
                toast({
                    variant: 'destructive',
                    title: 'CSV Parsing Error',
                    description: error.message,
                });
            },
        });
    };
    
    const downloadTemplate = () => {
        const csvContent = "Student Name,Class,Login ID,Password\nJohn Doe,Guardian,johndoe,password123\nJane Smith,Mage,jane.smith@example.com,password456";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "student_bulk_add_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
             <p className="text-sm text-muted-foreground">Upload a CSV file with columns: <code className="bg-muted px-1 rounded">Student Name</code>, <code className="bg-muted px-1 rounded">Class</code>, <code className="bg-muted px-1 rounded">Login ID</code>, <code className="bg-muted px-1 rounded">Password</code>. Class must be Guardian, Healer, or Mage. Login ID can be an email or a username.</p>
             <div className="flex gap-4">
                 <Input type="file" accept=".csv" onChange={handleFileChange} />
                 <Button variant="secondary" onClick={downloadTemplate}>Download Template</Button>
             </div>
        </div>
    );
};


export default function BulkAddPage() {
    const [classCode, setClassCode] = useState('');
    const [isCheckingCode, setIsCheckingCode] = useState(false);
    const [isCodeValidated, setIsCodeValidated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [manualStudents, setManualStudents] = useState<ManualStudent[]>([{id: uuidv4(), studentName: '', class: '', signupMethod: 'username', loginId: '', password: ''}]);
    const { toast } = useToast();
    
    const handleAddManualStudent = () => {
        setManualStudents([...manualStudents, {id: uuidv4(), studentName: '', class: '', signupMethod: 'username', loginId: '', password: ''}]);
    };

    const handleRemoveManualStudent = (id: string) => {
        if (manualStudents.length > 1) {
            setManualStudents(manualStudents.filter(student => student.id !== id));
        }
    };

    const handleManualStudentChange = (id: string, field: keyof ManualStudent, value: string) => {
        setManualStudents(manualStudents.map(student =>
            student.id === id ? { ...student, [field]: value } : student
        ));
    };

     const handleStudentsParsedFromCSV = (students: Omit<ManualStudent, 'id'>[]) => {
        const studentsWithIds = students.map(s => ({ ...s, id: uuidv4() }));
        setManualStudents(studentsWithIds);
        toast({ title: 'CSV Imported', description: `${students.length} students have been loaded into the manual entry table for review.` });
    };

    const handleValidateCode = async () => {
        if (!classCode.trim()) {
            toast({ variant: 'destructive', title: 'Guild Code Required' });
            return;
        }
        setIsCheckingCode(true);
        try {
            const result = await validateClassCode(classCode);
            if (result.isValid) {
                setIsCodeValidated(true);
                toast({ title: 'Guild Code Valid!', description: 'You may now add students.' });
            } else {
                setIsCodeValidated(false);
                toast({ variant: 'destructive', title: 'Invalid Guild Code' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Validation Failed', description: error.message });
        } finally {
            setIsCheckingCode(false);
        }
    };

    const processStudent = async (student: Omit<ManualStudent, 'id'>) => {
        const { studentName, class: selectedClass, signupMethod, loginId, password } = student;
        const finalEmail = signupMethod === 'email' ? loginId : `${loginId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`;
        const finalStudentId = loginId;
        const selectedAvatar = avatarData[selectedClass]?.[1]?.[0];

        if (!selectedAvatar) {
            throw new Error(`Could not find a default avatar for class: ${selectedClass}`);
        }

        const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
        const user = userCredential.user;

        const result = await createStudentDocuments({
            classCode,
            userUid: user.uid,
            email: finalEmail,
            studentId: finalStudentId,
            studentName,
            characterName: studentName,
            selectedClass,
            selectedAvatar,
        });

        if (!result.success) {
            // Attempt to clean up the created auth user if Firestore doc creation fails
            await user.delete();
            throw new Error(result.error || `Failed to create database record for ${studentName}.`);
        }
    };


    const handleBulkSubmit = async () => {
        const studentsToProcess = manualStudents.filter(s => s.studentName && s.class && s.loginId && s.password);
        if (studentsToProcess.length === 0) {
            toast({ variant: 'destructive', title: 'No Students to Add', description: 'Please fill out at least one student\'s details completely.' });
            return;
        }
        
        setIsLoading(true);
        const results = { success: 0, failed: 0 };
        const failedNames: string[] = [];

        for (const student of studentsToProcess) {
            try {
                await processStudent(student);
                results.success++;
            } catch (error: any) {
                results.failed++;
                failedNames.push(`${student.studentName} (${error.message})`);
                console.error(`Failed to process ${student.studentName}:`, error);
            }
        }
        
        toast({
            title: `Bulk Add Complete`,
            description: `${results.success} students added successfully. ${results.failed} failed.`,
            duration: 8000,
        });
        
        if (failedNames.length > 0) {
            toast({
                variant: 'destructive',
                title: 'Failed Students',
                description: `Could not add: ${failedNames.join(', ')}`,
                duration: 10000,
            });
        }
        
        // Reset form
        setManualStudents([{id: uuidv4(), studentName: '', class: '', signupMethod: 'username', loginId: '', password: ''}]);
        setIsLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-muted/40">
            <Card className="w-full max-w-6xl shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline">Bulk Add Students</CardTitle>
                    <CardDescription>Quickly create multiple student accounts for your guild.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2 text-center bg-primary/10 p-4 rounded-lg">
                        <Label htmlFor="class-code" className="text-lg font-semibold"><BookUser className="w-5 h-5 mr-2 inline" />Guild Code</Label>
                        <p className="text-sm text-muted-foreground">Enter the Guild Code for the class you want to add students to.</p>
                        <div className="flex justify-center items-center gap-2">
                            <Input
                                id="class-code"
                                placeholder="GUILD-CODE"
                                value={classCode}
                                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                                disabled={isCheckingCode || isCodeValidated}
                                className="max-w-xs mx-auto text-center h-12 text-lg tracking-widest font-bold"
                            />
                            <Button onClick={handleValidateCode} disabled={isCheckingCode || !classCode.trim() || isCodeValidated}>
                                {isCheckingCode ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Validate'}
                            </Button>
                        </div>
                    </div>

                    <div className={!isCodeValidated ? 'opacity-50 pointer-events-none' : ''}>
                        <Tabs defaultValue="manual">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                <TabsTrigger value="csv">CSV Upload</TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual" className="p-4 border rounded-b-md">
                                <ManualEntry 
                                    students={manualStudents} 
                                    onAdd={handleAddManualStudent} 
                                    onRemove={handleRemoveManualStudent}
                                    onChange={handleManualStudentChange}
                                    disabled={!isCodeValidated}
                                />
                            </TabsContent>
                            <TabsContent value="csv" className="p-4 border rounded-b-md">
                                <CSVUpload onStudentsParsed={handleStudentsParsedFromCSV} />
                            </TabsContent>
                        </Tabs>

                        <div className="mt-6 flex justify-end">
                            <Button size="lg" onClick={handleBulkSubmit} disabled={!isCodeValidated || isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin"/> : null}
                                Add {manualStudents.filter(s => s.studentName).length} Students to Guild
                            </Button>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex-col gap-4 pt-4 border-t">
                     <p className="text-xs text-muted-foreground text-center">
                        All created students will appear in the "Pending Approvals" dialog on the teacher's dashboard.
                     </p>
                    <Button variant="link" className="text-muted-foreground" asChild>
                        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

