
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UserPlus, CheckCircle, Upload, Trash2, KeyRound } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ClassType } from '@/lib/data';
import { avatarData } from '@/lib/avatars';
import { createStudentDocuments } from '@/ai/flows/create-student';
import { validateClassCode } from '@/ai/flows/validate-class-code';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { downloadCsv } from '@/lib/utils';

interface NewStudentEntry {
    id: number;
    studentName: string;
    class: ClassType;
    loginMethod: 'email' | 'alias';
    loginId: string;
    password?: string;
}

export default function BulkAddPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Guild Code State
    const [classCode, setClassCode] = useState('');
    const [isCodeValidated, setIsCodeValidated] = useState(false);
    const [isCheckingCode, setIsCheckingCode] = useState(false);

    // Form & Data State
    const [students, setStudents] = useState<NewStudentEntry[]>([]);
    const [nextId, setNextId] = useState(1);

    // Process State
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<{ [id: number]: { success: boolean; message: string } }>({});

    const addStudentRow = () => {
        setStudents([...students, { id: nextId, studentName: '', class: '', loginMethod: 'alias', loginId: '', password: '' }]);
        setNextId(nextId + 1);
    };

    const handleStudentChange = (id: number, field: keyof NewStudentEntry, value: string) => {
        setStudents(students.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const removeStudentRow = (id: number) => {
        setStudents(students.filter(s => s.id !== id));
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
    
    const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const rows = text.split('\n').filter(row => row.trim() !== '');
            const header = rows.shift()?.toLowerCase().split(',').map(h => h.trim()) || [];
            
            const expectedHeaders = ['student name', 'class', 'login id', 'password'];
            if(JSON.stringify(header) !== JSON.stringify(expectedHeaders)) {
                toast({ variant: 'destructive', title: 'Invalid CSV Header', description: 'Header must be: Student Name,Class,Login ID,Password' });
                return;
            }

            const newStudentList: NewStudentEntry[] = rows.map((row, index) => {
                const [name, className, loginId, password] = row.split(',');
                const classType = className.trim() as ClassType;
                return {
                    id: nextId + index,
                    studentName: name?.trim() || '',
                    class: ['Guardian', 'Healer', 'Mage'].includes(classType) ? classType : '',
                    loginMethod: 'alias', // Assume alias for CSV
                    loginId: loginId?.trim() || '',
                    password: password?.trim() || '',
                };
            });
            
            setStudents(prev => [...prev, ...newStudentList]);
            setNextId(prev => prev + newStudentList.length);
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const headers = ['Student Name', 'Class', 'Login ID', 'Password'];
        const data = [
            ['John Doe', 'Guardian', 'johndoe123', 'password123'],
            ['Jane Smith', 'Mage', 'janesmith456', 'password456'],
        ];
        downloadCsv(data, headers, 'student_template.csv');
    };

    const handleSubmit = async () => {
        const validStudents = students.filter(s => s.studentName && s.class && s.loginId && s.password);

        if (validStudents.length === 0) {
            toast({ variant: 'destructive', title: 'No Valid Students', description: 'Please fill out all fields for at least one student.' });
            return;
        }

        setIsLoading(true);
        setResults({});

        for (const student of validStudents) {
            try {
                const finalEmail = student.loginMethod === 'email' ? student.loginId : `${student.loginId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`;
                const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, student.password!);
                const user = userCredential.user;

                const result = await createStudentDocuments({
                    classCode,
                    userUid: user.uid,
                    email: finalEmail,
                    studentId: student.loginId,
                    studentName: student.studentName,
                    characterName: student.studentName, // Character name defaults to student name
                    selectedClass: student.class,
                    selectedAvatar: avatarData[student.class]?.[1]?.[0] || '', // First avatar of level 1
                });
                
                 if (!result.success) throw new Error(result.error);

                setResults(prev => ({ ...prev, [student.id]: { success: true, message: 'Success!' } }));
                
                 // Sign out the newly created user immediately to keep the admin session
                await auth.signOut();

            } catch (error: any) {
                let errorMessage = error.message;
                 if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'Email/Username already exists.';
                }
                setResults(prev => ({ ...prev, [student.id]: { success: false, message: errorMessage } }));
            }
        }

        setIsLoading(false);
        toast({ title: 'Bulk Creation Complete', description: 'Check the results below. You can now close this page.' });
    };

    useEffect(addStudentRow, []); // Add one empty row on initial load

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-6xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Button>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-3xl">Bulk Add Students</CardTitle>
                            <CardDescription>
                                Create multiple student accounts at once. All created accounts will be sent to the appropriate teacher's dashboard for approval. This tool is for administrator use only.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-center bg-primary/10 p-4 rounded-lg">
                                <Label htmlFor="class-code" className="text-lg font-semibold">Step 1: Validate Guild Code</Label>
                                <div className="flex justify-center items-center gap-2">
                                    <Input 
                                        id="class-code" 
                                        placeholder="ENTER GUILD CODE" 
                                        value={classCode} 
                                        onChange={(e) => setClassCode(e.target.value.toUpperCase())} 
                                        disabled={isCheckingCode || isCodeValidated} 
                                        className="max-w-xs mx-auto text-center h-12 text-lg tracking-widest font-bold"
                                    />
                                    <Button onClick={handleValidateCode} disabled={isCheckingCode || !classCode.trim() || isCodeValidated}>
                                        {isCheckingCode ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Validate Code'}
                                    </Button>
                                    {isCodeValidated && <CheckCircle className="h-8 w-8 text-green-500" />}
                                </div>
                            </div>

                            <Tabs defaultValue="manual" className={!isCodeValidated ? 'opacity-50 pointer-events-none' : ''}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                    <TabsTrigger value="csv">CSV Upload</TabsTrigger>
                                </TabsList>
                                <TabsContent value="manual" className="space-y-4">
                                     <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student Name</TableHead>
                                                <TableHead>Class</TableHead>
                                                <TableHead>Login Method</TableHead>
                                                <TableHead>Username / Email</TableHead>
                                                <TableHead>Password</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.map(student => (
                                                <TableRow key={student.id}>
                                                    <TableCell><Input value={student.studentName} onChange={e => handleStudentChange(student.id, 'studentName', e.target.value)} /></TableCell>
                                                    <TableCell>
                                                        <Select value={student.class} onValueChange={v => handleStudentChange(student.id, 'class', v)}>
                                                            <SelectTrigger><SelectValue placeholder="Class"/></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Guardian">Guardian</SelectItem>
                                                                <SelectItem value="Healer">Healer</SelectItem>
                                                                <SelectItem value="Mage">Mage</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <RadioGroup value={student.loginMethod} onValueChange={v => handleStudentChange(student.id, 'loginMethod', v)} className="flex gap-2">
                                                            <div className="flex items-center space-x-1"><RadioGroupItem value="alias" id={`alias-${student.id}`} /><Label htmlFor={`alias-${student.id}`}>Alias</Label></div>
                                                            <div className="flex items-center space-x-1"><RadioGroupItem value="email" id={`email-${student.id}`} /><Label htmlFor={`email-${student.id}`}>Email</Label></div>
                                                        </RadioGroup>
                                                    </TableCell>
                                                     <TableCell><Input value={student.loginId} onChange={e => handleStudentChange(student.id, 'loginId', e.target.value)} placeholder={student.loginMethod === 'email' ? 'student@email.com' : 'username123'} /></TableCell>
                                                     <TableCell>
                                                        <div className="relative">
                                                            <Input type="text" value={student.password || ''} onChange={e => handleStudentChange(student.id, 'password', e.target.value)} placeholder="Suggest: ID#" />
                                                        </div>
                                                     </TableCell>
                                                     <TableCell>
                                                        {results[student.id] && (
                                                            <span className={results[student.id].success ? 'text-green-600' : 'text-destructive'}>
                                                                {results[student.id].message}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeStudentRow(student.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                     </Table>
                                     <Button onClick={addStudentRow} variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
                                </TabsContent>
                                <TabsContent value="csv" className="space-y-4 text-center">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Upload a CSV File</CardTitle>
                                            <CardDescription>
                                                The file must have the headers: `Student Name`, `Class`, `Login ID`, `Password`. `Class` must be Guardian, Healer, or Mage. `Login ID` will be treated as a username.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Input type="file" accept=".csv" onChange={handleCsvUpload} />
                                        </CardContent>
                                        <CardFooter>
                                            <Button onClick={handleDownloadTemplate} variant="secondary">Download Template</Button>
                                        </CardFooter>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                            <div className="flex justify-end pt-4">
                                <Button size="lg" onClick={handleSubmit} disabled={!isCodeValidated || isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4" />}
                                    Create All Student Accounts
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
