
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, KeyRound, ShieldAlert, Mail, BookUser, ArrowLeft, Trash2, Shield, Heart, Wand, Upload } from 'lucide-react';
import type { ClassType } from '@/lib/data';
import { avatarData } from '@/lib/avatars';
import { createStudentDocuments } from '@/ai/flows/create-student';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { validateClassCode } from '@/ai/flows/validate-class-code';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface NewStudent {
    id: string;
    studentName: string;
    class: ClassType;
    loginMethod: 'email' | 'alias';
    loginId: string;
    password?: string;
}

export default function BulkAddPage() {
    const [guildCode, setGuildCode] = useState('');
    const [isCodeValidated, setIsCodeValidated] = useState(false);
    const [isCheckingCode, setIsCheckingCode] = useState(false);
    const [students, setStudents] = useState<NewStudent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newStudent, setNewStudent] = useState<Omit<NewStudent, 'id'>>({
        studentName: '',
        class: '',
        loginMethod: 'alias',
        loginId: '',
        password: ''
    });

    const router = useRouter();
    const { toast } = useToast();

    const handleValidateCode = async () => {
        if (!guildCode.trim()) {
            toast({ variant: 'destructive', title: 'Guild Code Required', description: 'Please enter a code to validate.' });
            return;
        }
        setIsCheckingCode(true);
        try {
            const result = await validateClassCode(guildCode);
            if (result.isValid) {
                setIsCodeValidated(true);
                toast({ title: 'Guild Code Valid!', description: 'You may now add students.' });
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

    const handleAddStudent = () => {
        if (!newStudent.studentName || !newStudent.class || !newStudent.loginId || !newStudent.password) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all fields for the new student.' });
            return;
        }
        setStudents(prev => [...prev, { id: crypto.randomUUID(), ...newStudent }]);
        setNewStudent({ studentName: '', class: '', loginMethod: 'alias', loginId: '', password: '' });
    };

    const handleRemoveStudent = (id: string) => {
        setStudents(prev => prev.filter(s => s.id !== id));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                const rows = text.split('\n').slice(1); // Skip header row
                const newStudentsFromFile: NewStudent[] = rows.map(row => {
                    const [name, studentClass, loginId, password] = row.split(',').map(s => s.trim());
                    if (!name || !studentClass || !loginId || !password) return null;
                    return {
                        id: crypto.randomUUID(),
                        studentName: name,
                        class: studentClass as ClassType,
                        loginMethod: 'alias', // Assume CSV uses aliases
                        loginId,
                        password,
                    }
                }).filter((s): s is NewStudent => s !== null);

                setStudents(prev => [...prev, ...newStudentsFromFile]);
                toast({ title: 'CSV Processed', description: `${newStudentsFromFile.length} students were added from the file.` });

            } catch (error) {
                toast({ variant: 'destructive', title: 'Error Processing CSV', description: 'Please check the file format.' });
            }
        };
        reader.readAsText(file);
    };

    const handleBulkCreate = async () => {
        if (students.length === 0) {
            toast({ variant: 'destructive', title: 'No Students', description: 'Please add at least one student to create.' });
            return;
        }
        setIsLoading(true);

        const creationPromises = students.map(async (student) => {
            try {
                const finalEmail = student.loginMethod === 'email' ? student.loginId : `${student.loginId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`;
                
                const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, student.password!);
                const user = userCredential.user;
                
                const result = await createStudentDocuments({
                    classCode: guildCode,
                    userUid: user.uid,
                    email: finalEmail,
                    studentId: student.loginId,
                    studentName: student.studentName,
                    characterName: student.studentName, // Per requirement
                    selectedClass: student.class,
                    selectedAvatar: avatarData[student.class]?.[1]?.[0] || '', // Per requirement
                });

                if (!result.success) {
                    throw new Error(result.error || `Could not save data for ${student.studentName}.`);
                }

                return { success: true, name: student.studentName };
            } catch (error: any) {
                let reason = 'An unknown error occurred.';
                if (error.code === 'auth/email-already-in-use') {
                    reason = 'This username/email is already taken.';
                } else if (error.code) {
                    reason = error.code;
                }
                return { success: false, name: student.studentName, reason };
            }
        });

        const results = await Promise.all(creationPromises);
        const successfulCreations = results.filter(r => r.success);
        const failedCreations = results.filter(r => !r.success);

        if (successfulCreations.length > 0) {
            toast({
                title: 'Bulk Creation Complete!',
                description: `${successfulCreations.length} student(s) have been created and are awaiting approval.`
            });
        }

        if (failedCreations.length > 0) {
            failedCreations.forEach(fail => {
                toast({
                    variant: 'destructive',
                    title: `Failed to create ${fail.name}`,
                    description: fail.reason
                });
            });
        }
        setStudents([]); // Clear list after processing
        setIsLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-muted">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline text-primary">Bulk Add Students</CardTitle>
                    <CardDescription>A public tool for quickly creating multiple student accounts under a single guild code.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg bg-secondary space-y-2">
                        <Label htmlFor="class-code" className="text-lg font-semibold flex items-center justify-center gap-2"><BookUser /> Guild Code</Label>
                        <p className="text-sm text-center text-muted-foreground">This code is required to ensure students are added to the correct guild. The fields below will be disabled until a valid code is entered.</p>
                        <div className="flex justify-center items-center gap-2">
                            <Input 
                                id="class-code" 
                                placeholder="ENTER GUILD CODE" 
                                value={guildCode} 
                                onChange={(e) => setGuildCode(e.target.value.toUpperCase())} 
                                disabled={isCheckingCode || isCodeValidated} 
                                className="max-w-xs mx-auto text-center h-12 text-lg tracking-widest font-bold"
                            />
                            <Button onClick={handleValidateCode} disabled={isCheckingCode || !guildCode.trim() || isCodeValidated}>
                                {isCheckingCode ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Validate Code'}
                            </Button>
                        </div>
                    </div>
                    
                    <fieldset disabled={!isCodeValidated || isLoading} className="space-y-4">
                        <Tabs defaultValue="manual">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                <TabsTrigger value="csv">CSV Upload</TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual" className="p-4 border rounded-b-md">
                                <h3 className="font-semibold mb-4">Add a Student</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Student Full Name</Label>
                                        <Input value={newStudent.studentName} onChange={e => setNewStudent(s => ({...s, studentName: e.target.value}))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Class</Label>
                                        <Select value={newStudent.class} onValueChange={v => setNewStudent(s => ({...s, class: v as ClassType}))}>
                                            <SelectTrigger><SelectValue placeholder="Select Class..."/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Guardian"><Shield className="w-4 h-4 mr-2" />Guardian</SelectItem>
                                                <SelectItem value="Healer"><Heart className="w-4 h-4 mr-2" />Healer</SelectItem>
                                                <SelectItem value="Mage"><Wand className="w-4 h-4 mr-2" />Mage</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Login Method</Label>
                                        <RadioGroup value={newStudent.loginMethod} onValueChange={v => setNewStudent(s => ({...s, loginMethod: v as 'alias' | 'email'}))} className="flex space-x-4 pt-2">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="alias" id="login-alias"/><Label htmlFor="login-alias">Username</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="email" id="login-email"/><Label htmlFor="login-email">Email</Label></div>
                                        </RadioGroup>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{newStudent.loginMethod === 'email' ? 'Email' : 'Username'}</Label>
                                        <Input value={newStudent.loginId} onChange={e => setNewStudent(s => ({...s, loginId: e.target.value}))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Password</Label>
                                        <Input type="text" value={newStudent.password} onChange={e => setNewStudent(s => ({...s, password: e.target.value}))} placeholder="e.g., student ID"/>
                                    </div>
                                    <div className="flex items-end">
                                        <Button onClick={handleAddStudent} className="w-full">Add Student to List</Button>
                                    </div>
                                </div>
                            </TabsContent>
                             <TabsContent value="csv" className="p-4 border rounded-b-md space-y-4">
                                <h3 className="font-semibold">Upload from CSV</h3>
                                <p className="text-sm text-muted-foreground">The CSV file must have headers: `Student Name`, `Class`, `Login ID`, `Password`. Class must be one of: Guardian, Healer, Mage.</p>
                                <Input type="file" accept=".csv" onChange={handleFileChange} />
                                <a href="/bulk-add-template.csv" download className="text-sm text-primary underline">Download Template</a>
                            </TabsContent>
                        </Tabs>

                        <div className="space-y-4 pt-4">
                            <h3 className="font-semibold text-lg">Students to be Created ({students.length})</h3>
                            <div className="max-h-60 overflow-y-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Class</TableHead>
                                            <TableHead>Login ID</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map(student => (
                                            <TableRow key={student.id}>
                                                <TableCell>{student.studentName}</TableCell>
                                                <TableCell>{student.class}</TableCell>
                                                <TableCell>{student.loginId}</TableCell>
                                                <TableCell>
                                                    <Button variant="destructive" size="icon" onClick={() => handleRemoveStudent(student.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {students.length === 0 && <p className="text-center text-muted-foreground p-4">No students added yet.</p>}
                            </div>
                        </div>

                    </fieldset>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                     <Button size="lg" onClick={handleBulkCreate} disabled={!isCodeValidated || students.length === 0 || isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <UserPlus className="mr-2 h-6 w-6" />}
                        Create All {students.length} Students
                    </Button>
                     <Button variant="link" className="text-muted-foreground" asChild>
                        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
