
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, KeyRound, Shield, Heart, Wand, ArrowLeft, PlusCircle, Upload, FileText, CheckCircle, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { ClassType } from '@/lib/data';
import { avatarData } from '@/lib/avatars';
import { validateClassCode } from '@/ai/flows/validate-class-code';
import { createStudentDocuments } from '@/ai/flows/create-student';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

interface StudentData {
    id: string;
    name: string;
    class: ClassType;
    loginMethod: 'email' | 'alias';
    loginId: string;
    password?: string;
}

const csvTemplate = `Student Name,Class,Login ID,Password
Example Student,Mage,example@email.com,password123
Another Student,Guardian,another_username,password456
`;

export default function BulkAddPage() {
    const router = useRouter();
    const { toast } = useToast();

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingCode, setIsCheckingCode] = useState(false);
    const [isCodeValidated, setIsCodeValidated] = useState(false);

    // Form State
    const [classCode, setClassCode] = useState('');
    const [manualStudents, setManualStudents] = useState<StudentData[]>([]);
    const [csvData, setCsvData] = useState<StudentData[]>([]);

    useEffect(() => {
        // Add one empty student row by default for manual entry
        if (manualStudents.length === 0) {
            setManualStudents([{ id: uuidv4(), name: '', class: '', loginMethod: 'alias', loginId: '' }]);
        }
    }, [manualStudents.length]);

    const handleValidateCode = async () => {
        if (!classCode.trim()) {
            toast({ variant: 'destructive', title: 'Guild Code Required', description: 'Please enter a code to validate.' });
            return;
        }
        setIsCheckingCode(true);
        try {
            const result = await validateClassCode(classCode);
            if (result.isValid) {
                setIsCodeValidated(true);
                toast({ title: 'Guild Code Valid!', description: 'You may now fill out the rest of the form.' });
            } else {
                setIsCodeValidated(false);
                toast({ variant: 'destructive', title: 'Invalid Guild Code', description: 'That code was not found. Please check with your Guild Leader and try again.' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Validation Failed', description: error.message });
        } finally {
            setIsCheckingCode(false);
        }
    };
    
    const handleAddManualStudent = () => {
        setManualStudents(prev => [...prev, { id: uuidv4(), name: '', class: '', loginMethod: 'alias', loginId: '' }]);
    };

    const handleRemoveManualStudent = (id: string) => {
        if (manualStudents.length > 1) {
            setManualStudents(prev => prev.filter(student => student.id !== id));
        }
    };

    const handleManualStudentChange = (id: string, field: keyof StudentData, value: string | ClassType) => {
        setManualStudents(prev => prev.map(student => student.id === id ? { ...student, [field]: value } : student));
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsedData = results.data.map((row: any) => ({
                    id: uuidv4(),
                    name: row['Student Name'] || '',
                    class: (row['Class'] || '') as ClassType,
                    loginMethod: (row['Login ID'] || '').includes('@') ? 'email' : 'alias',
                    loginId: row['Login ID'] || '',
                    password: row['Password'] || '',
                }));
                setCsvData(parsedData);
            },
            error: (error: any) => {
                toast({ variant: 'destructive', title: 'CSV Parse Error', description: error.message });
            }
        });
    };
    
    const handleSubmit = async (studentsToCreate: StudentData[]) => {
        if (!isCodeValidated) {
            toast({ variant: 'destructive', title: 'Guild Code Not Validated' });
            return;
        }

        const validStudents = studentsToCreate.filter(s => s.name && s.class && s.loginId && s.password);

        if (validStudents.length === 0) {
            toast({ variant: 'destructive', title: 'No Valid Students', description: 'Please fill out all fields for at least one student.' });
            return;
        }

        setIsLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const student of validStudents) {
            try {
                const finalEmail = student.loginMethod === 'email' ? student.loginId : `${student.loginId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`;
                
                const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, student.password!);
                
                const result = await createStudentDocuments({
                    classCode,
                    userUid: userCredential.user.uid,
                    email: finalEmail,
                    studentId: student.loginId,
                    studentName: student.name,
                    characterName: student.name, // Character name defaults to student name
                    selectedClass: student.class,
                    selectedAvatar: avatarData[student.class]?.[1]?.[0] || '', // First avatar of the class
                });

                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                    // Ideally, we'd delete the auth user here if Firestore creation fails, but it's complex.
                    // For this tool, we'll log the error.
                    console.error(`Failed to create Firestore doc for ${student.name}:`, result.error);
                }
            } catch (error: any) {
                errorCount++;
                console.error(`Failed to create auth user for ${student.name}:`, error.code, error.message);
            }
        }
        
        toast({
            title: 'Bulk Creation Complete',
            description: `${successCount} student(s) created successfully. ${errorCount} failed. Check console for errors.`,
            duration: 8000,
        });

        // Clear forms
        setManualStudents([{ id: uuidv4(), name: '', class: '', loginMethod: 'alias', loginId: '' }]);
        setCsvData([]);

        setIsLoading(false);
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                 <h1 className="text-xl font-semibold">Bulk Student Creation Tool</h1>
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                 <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Step 1: Validate Guild Code</CardTitle>
                    <CardDescription>Enter the Guild Code for the class you want to add students to. This must be done before you can add any students.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 max-w-sm">
                        <Input
                            placeholder="ENTER GUILD CODE"
                            value={classCode}
                            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                            disabled={isCheckingCode || isCodeValidated}
                            className="h-12 text-lg tracking-widest font-bold text-center"
                        />
                        <Button onClick={handleValidateCode} disabled={isCheckingCode || !classCode.trim() || isCodeValidated}>
                            {isCheckingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : isCodeValidated ? <CheckCircle /> : 'Validate'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="manual" className="w-full max-w-4xl mx-auto mt-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual" disabled={!isCodeValidated}>Manual Entry</TabsTrigger>
                    <TabsTrigger value="csv" disabled={!isCodeValidated}>CSV Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="manual">
                    <Card className={!isCodeValidated ? 'opacity-50 pointer-events-none' : ''}>
                        <CardHeader>
                            <CardTitle>Add Students Manually</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student Name</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Login Method</TableHead>
                                        <TableHead>Username / Email</TableHead>
                                        <TableHead>Password</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {manualStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell><Input value={student.name} onChange={(e) => handleManualStudentChange(student.id, 'name', e.target.value)} /></TableCell>
                                            <TableCell>
                                                <Select value={student.class} onValueChange={(value) => handleManualStudentChange(student.id, 'class', value)}>
                                                    <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Guardian">Guardian</SelectItem>
                                                        <SelectItem value="Healer">Healer</SelectItem>
                                                        <SelectItem value="Mage">Mage</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <RadioGroup value={student.loginMethod} onValueChange={(value) => handleManualStudentChange(student.id, 'loginMethod', value)} className="flex">
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="alias" id={`alias-${student.id}`} /><Label htmlFor={`alias-${student.id}`}>Alias</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="email" id={`email-${student.id}`} /><Label htmlFor={`email-${student.id}`}>Email</Label></div>
                                                </RadioGroup>
                                            </TableCell>
                                            <TableCell><Input value={student.loginId} onChange={(e) => handleManualStudentChange(student.id, 'loginId', e.target.value)} /></TableCell>
                                            <TableCell><Input type="password" value={student.password} onChange={(e) => handleManualStudentChange(student.id, 'password', e.target.value)} /></TableCell>
                                            <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveManualStudent(student.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Button variant="outline" onClick={handleAddManualStudent} className="mt-4">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Row
                            </Button>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => handleSubmit(manualStudents)} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Create Manually Added Students
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
                <TabsContent value="csv">
                     <Card className={!isCodeValidated ? 'opacity-50 pointer-events-none' : ''}>
                        <CardHeader>
                            <CardTitle>Upload Students via CSV</CardTitle>
                            <CardDescription>
                                Upload a CSV file with the columns: `Student Name`, `Class`, `Login ID`, `Password`.
                                The class must be one of: Guardian, Healer, Mage.
                            </CardDescription>
                            <Button variant="link" onClick={() => {
                                const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement("a");
                                const url = URL.createObjectURL(blob);
                                link.setAttribute("href", url);
                                link.setAttribute("download", "student_template.csv");
                                link.style.visibility = 'hidden';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}>
                                <FileText className="mr-2 h-4 w-4"/> Download Template
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Input type="file" accept=".csv" onChange={handleFileUpload} />
                            {csvData.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-semibold">Parsed Data ({csvData.length} students)</h4>
                                     <ScrollArea className="h-48 mt-2 border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Class</TableHead>
                                                    <TableHead>Login ID</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {csvData.map((student, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>{student.name}</TableCell>
                                                        <TableCell>{student.class}</TableCell>
                                                        <TableCell>{student.loginId}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                     </ScrollArea>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => handleSubmit(csvData)} disabled={isLoading || csvData.length === 0}>
                                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Create Students from CSV
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
             <Card className="mt-6">
                <CardFooter className="flex justify-start p-4">
                    <Button variant="link" className="text-muted-foreground" asChild>
                        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
                    </Button>
                </CardFooter>
            </Card>
            </main>
        </div>
    );
}

