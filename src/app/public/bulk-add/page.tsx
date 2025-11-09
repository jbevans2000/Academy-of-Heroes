
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { validateClassCode } from '@/ai/flows/validate-class-code';
import { createStudentDocuments } from '@/ai/flows/create-student';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { ClassType } from '@/lib/data';
import { avatarData } from '@/lib/avatars';
import { Loader2, BookUser, CheckCircle, Upload, Download, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';


interface NewStudentData {
  id: string;
  name: string;
  classType: ClassType;
  loginMethod: 'email' | 'alias';
  loginId: string;
  password?: string;
}

const csvTemplate = "Student Name,Class,Login ID,Password\nJohn Doe,Guardian,johnd,password123\nJane Smith,Mage,jane.smith@example.com,password456";

export default function BulkAddPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    // Page State
    const [guildCode, setGuildCode] = useState('');
    const [isCodeValidated, setIsCodeValidated] = useState(false);
    const [isCheckingCode, setIsCheckingCode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Manual Entry State
    const [manualStudents, setManualStudents] = useState<NewStudentData[]>([]);

    // CSV Entry State
    const [csvData, setCsvData] = useState<NewStudentData[]>([]);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvError, setCsvError] = useState<string | null>(null);

    const handleValidateCode = async () => {
        if (!guildCode.trim()) {
            toast({ variant: 'destructive', title: 'Guild Code Required' });
            return;
        }
        setIsCheckingCode(true);
        try {
            const result = await validateClassCode(guildCode);
            if (result.isValid) {
                setIsCodeValidated(true);
                toast({ title: 'Guild Code Validated!', description: 'You may now add students.' });
            } else {
                toast({ variant: 'destructive', title: 'Invalid Guild Code' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Validation Error', description: error.message });
        } finally {
            setIsCheckingCode(false);
        }
    };
    
    const handleAddManualStudent = () => {
        setManualStudents(prev => [...prev, { id: Date.now().toString(), name: '', classType: '', loginMethod: 'alias', loginId: '', password: ''}]);
    }

    const handleManualStudentChange = (id: string, field: keyof NewStudentData, value: string) => {
        setManualStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleRemoveManualStudent = (id: string) => {
        setManualStudents(prev => prev.filter(s => s.id !== id));
    };
    
    const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCsvFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const rows = text.split('\n').filter(row => row.trim() !== '');
                const header = rows.shift()?.split(',').map(h => h.trim());
                if (!header || header.join(',') !== 'Student Name,Class,Login ID,Password') {
                    throw new Error('Invalid CSV headers. Must be: Student Name,Class,Login ID,Password');
                }
                const students = rows.map((row, i) => {
                    const [name, classType, loginId, password] = row.split(',').map(v => v.trim());
                    if (!name || !classType || !loginId || !password) {
                        throw new Error(`Row ${i + 2} is missing data.`);
                    }
                    if (!['Guardian', 'Healer', 'Mage'].includes(classType)) {
                        throw new Error(`Invalid class '${classType}' on row ${i + 2}. Must be Guardian, Healer, or Mage.`);
                    }
                    const isEmail = loginId.includes('@');
                    return {
                        id: `csv-${i}`,
                        name,
                        classType: classType as ClassType,
                        loginMethod: isEmail ? 'email' : 'alias',
                        loginId,
                        password
                    };
                });
                setCsvData(students);
                setCsvError(null);
            } catch (error: any) {
                setCsvError(error.message);
                setCsvData([]);
            }
        };
        reader.readAsText(file);
    };

    const processStudents = async (studentsToProcess: NewStudentData[]) => {
        if (!isCodeValidated) {
            toast({ variant: 'destructive', title: 'Error', description: 'Guild code is not validated.' });
            return;
        }

        const validStudents = studentsToProcess.filter(s => s.name && s.classType && s.loginId && s.password);
        if (validStudents.length === 0) {
            toast({ variant: 'destructive', title: 'No Valid Students', description: 'Please add student information before submitting.' });
            return;
        }
        
        setIsProcessing(true);
        let successCount = 0;
        let errorCount = 0;

        for (const student of validStudents) {
            try {
                const finalEmail = student.loginMethod === 'email' ? student.loginId : `${student.loginId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`;
                const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, student.password!);
                const user = userCredential.user;

                const result = await createStudentDocuments({
                    classCode: guildCode,
                    userUid: user.uid,
                    email: finalEmail,
                    studentId: student.loginId,
                    studentName: student.name,
                    characterName: student.name, // As requested
                    selectedClass: student.classType,
                    selectedAvatar: avatarData[student.classType]?.[1]?.[0] || '', // First avatar of level 1
                });
                
                if (!result.success) {
                    throw new Error(result.error || `Could not create database entry for ${student.name}.`);
                }
                successCount++;
            } catch (error: any) {
                errorCount++;
                let desc = error.message;
                if (error.code === 'auth/email-already-in-use') {
                    desc = `${student.name}'s login ID is already taken.`;
                }
                toast({ variant: 'destructive', title: `Error with ${student.name}`, description: desc, duration: 8000 });
            }
        }
        
        toast({
            title: 'Processing Complete',
            description: `${successCount} student(s) successfully registered and sent for approval. ${errorCount} failed.`
        });

        if (errorCount === 0) {
            setManualStudents([]);
            setCsvData([]);
            setCsvFile(null);
        }
        setIsProcessing(false);
    };


    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-muted/40">
            <Card className="w-full max-w-4xl shadow-2xl">
                 <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline text-primary">Bulk Student Registration</CardTitle>
                    <CardDescription>Add multiple students to your guild at once. This page is for administrative use.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-secondary/50 border">
                        <Label htmlFor="guild-code" className="text-lg font-semibold">Guild Code</Label>
                        <div className="flex items-center gap-2 mt-2">
                             <Input 
                                id="guild-code"
                                value={guildCode}
                                onChange={(e) => setGuildCode(e.target.value.toUpperCase())}
                                placeholder="Enter a valid Guild Code..."
                                disabled={isCodeValidated || isCheckingCode}
                             />
                              <Button onClick={handleValidateCode} disabled={isCheckingCode || !guildCode.trim()}>
                                {isCheckingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isCodeValidated ? <CheckCircle className="mr-2 h-4 w-4"/> : null}
                                {isCodeValidated ? 'Validated' : 'Validate'}
                            </Button>
                        </div>
                    </div>
                    
                    <div className={!isCodeValidated ? 'opacity-50 pointer-events-none' : ''}>
                        <Tabs defaultValue="manual">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                <TabsTrigger value="csv">CSV Upload</TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual" className="mt-4">
                                <ScrollArea className="h-72 w-full">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student Name</TableHead>
                                                <TableHead>Class</TableHead>
                                                <TableHead>Login Method</TableHead>
                                                <TableHead>Login ID</TableHead>
                                                <TableHead>Password</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {manualStudents.map(student => (
                                                <TableRow key={student.id}>
                                                    <TableCell><Input value={student.name} onChange={(e) => handleManualStudentChange(student.id, 'name', e.target.value)} /></TableCell>
                                                    <TableCell>
                                                        <Select value={student.classType} onValueChange={(v) => handleManualStudentChange(student.id, 'classType', v)}>
                                                            <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Guardian">Guardian</SelectItem>
                                                                <SelectItem value="Healer">Healer</SelectItem>
                                                                <SelectItem value="Mage">Mage</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <RadioGroup value={student.loginMethod} onValueChange={(v) => handleManualStudentChange(student.id, 'loginMethod', v)} className="flex">
                                                            <div className="flex items-center space-x-1"><RadioGroupItem value="alias" id={`alias-${student.id}`} /><Label htmlFor={`alias-${student.id}`}>Username</Label></div>
                                                            <div className="flex items-center space-x-1"><RadioGroupItem value="email" id={`email-${student.id}`} /><Label htmlFor={`email-${student.id}`}>Email</Label></div>
                                                        </RadioGroup>
                                                    </TableCell>
                                                    <TableCell><Input value={student.loginId} onChange={(e) => handleManualStudentChange(student.id, 'loginId', e.target.value)} /></TableCell>
                                                    <TableCell><Input type="password" value={student.password} onChange={(e) => handleManualStudentChange(student.id, 'password', e.target.value)} /></TableCell>
                                                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveManualStudent(student.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                                <div className="flex justify-between items-center mt-4">
                                     <Button variant="outline" onClick={handleAddManualStudent}>Add Student Row</Button>
                                      <Button onClick={() => processStudents(manualStudents)} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        Add {manualStudents.length} Student(s)
                                    </Button>
                                </div>
                            </TabsContent>
                            <TabsContent value="csv" className="mt-4 space-y-4">
                                <div>
                                    <Label htmlFor="csv-file">Upload CSV File</Label>
                                    <Input id="csv-file" type="file" accept=".csv" onChange={handleCsvUpload} />
                                </div>
                                {csvError && <p className="text-sm text-destructive">{csvError}</p>}
                                {csvData.length > 0 && (
                                    <ScrollArea className="h-72 w-full">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Student Name</TableHead><TableHead>Class</TableHead><TableHead>Login ID</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {csvData.map(s => <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.classType}</TableCell><TableCell>{s.loginId}</TableCell></TableRow>)}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                )}
                                 <div className="flex justify-between items-center mt-4">
                                    <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`} download="student_template.csv" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Template
                                    </a>
                                     <Button onClick={() => processStudents(csvData)} disabled={isProcessing || csvData.length === 0}>
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        Add {csvData.length} Student(s) from CSV
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button variant="link" className="text-muted-foreground" asChild>
                        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
