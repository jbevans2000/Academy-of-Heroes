
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShieldAlert, CheckCircle, Upload, Trash2 } from 'lucide-react';
import { getGlobalSettings } from '@/ai/flows/manage-settings';
import { createStudentDocuments } from '@/ai/flows/create-student';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { validateClassCode } from '@/ai/flows/validate-class-code';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { ClassType } from '@/lib/data';
import { avatarData } from '@/lib/avatars';

interface ManualStudent {
  id: string;
  name: string;
  studentClass: ClassType | '';
  loginMethod: 'username' | 'email';
  loginId: string;
  password: string;
}

export default function BulkAddPage() {
  const [classCode, setClassCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  
  const [manualStudents, setManualStudents] = useState<ManualStudent[]>(() =>
    Array.from({ length: 10 }, () => ({
      id: uuidv4(),
      name: '',
      studentClass: '' as ClassType | '',
      loginMethod: 'username' as 'username' | 'email',
      loginId: '',
      password: ''
    }))
  );
  
  const [csvData, setCsvData] = useState<any[]>([]);

  // New state for code validation
  const [isCodeValidated, setIsCodeValidated] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    const checkRegistrationStatus = async () => {
        setIsCheckingStatus(true);
        try {
            const settings = await getGlobalSettings();
            setIsRegistrationOpen(settings.isStudentRegistrationOpen);
        } catch (error) {
            console.error("Failed to check registration status:", error);
            setIsRegistrationOpen(true);
        } finally {
            setIsCheckingStatus(false);
        }
    };
    checkRegistrationStatus();
  }, []);

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
  }
  
  const handleManualStudentChange = (id: string, field: keyof Omit<ManualStudent, 'id'>, value: string) => {
    setManualStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  const handleAddManualStudentRow = () => {
    setManualStudents(prev => [...prev, { id: uuidv4(), name: '', studentClass: '', loginMethod: 'username', loginId: '', password: '' }]);
  }

  const handleRemoveManualStudent = (id: string) => {
    setManualStudents(prev => prev.filter(s => s.id !== id));
  }
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const requiredHeaders = ['Student Name', 'Class', 'Login ID', 'Password'];
          const fileHeaders = result.meta.fields;
          if (!fileHeaders || !requiredHeaders.every(h => fileHeaders.includes(h))) {
            toast({
              variant: 'destructive',
              title: 'Invalid CSV Headers',
              description: `CSV must contain the headers: ${requiredHeaders.join(', ')}`,
            });
            return;
          }
          setCsvData(result.data);
          toast({ title: 'CSV Loaded', description: `${result.data.length} student records found.` });
        },
        error: (error) => {
          toast({ variant: 'destructive', title: 'CSV Parsing Error', description: error.message });
        }
      });
    }
  };

  const createStudentListFromData = (data: any[], type: 'manual' | 'csv'): Omit<ManualStudent, 'id'>[] => {
      if (type === 'manual') {
          return (data as ManualStudent[]).filter(s => s.name && s.studentClass && s.loginId && s.password);
      } else { // csv
          return data.map(row => ({
              name: row['Student Name'],
              studentClass: row['Class'],
              loginMethod: 'username', // Default to username for CSV for simplicity
              loginId: row['Login ID'],
              password: row['Password']
          }));
      }
  }

  const handleSubmit = async (type: 'manual' | 'csv') => {
    if (!isCodeValidated) {
      toast({ variant: 'destructive', title: 'Guild Code Not Validated', description: 'Please validate your Guild Code before proceeding.' });
      return;
    }
    
    const studentsToCreate = createStudentListFromData(type === 'manual' ? manualStudents : csvData, type);

    if (studentsToCreate.length === 0) {
      toast({ variant: 'destructive', title: 'No Students to Add', description: 'Please add student information or upload a valid CSV.' });
      return;
    }

    setIsLoading(true);

    let successfulCreations = 0;
    const errors: string[] = [];

    for (const student of studentsToCreate) {
      const { name, studentClass, loginMethod, loginId, password } = student;
       if (!name || !studentClass || !loginId || !password) {
        errors.push(`Skipped a row due to missing data for ${name || 'an unnamed student'}.`);
        continue;
      }
      
      const avatarUrl = avatarData[studentClass as ClassType]?.[1]?.[0] || '';
      if (!avatarUrl) {
          errors.push(`Skipped ${name}: Invalid class type "${studentClass}".`);
          continue;
      }
      
      try {
        const finalEmail = loginMethod === 'email' ? loginId : `${loginId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`;
        
        const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
        const user = userCredential.user;

        const result = await createStudentDocuments({
          classCode,
          userUid: user.uid,
          email: finalEmail,
          studentId: loginId,
          studentName: name,
          characterName: name, // Character name defaults to student name
          selectedClass: studentClass as ClassType,
          selectedAvatar: avatarUrl,
        });

        if (!result.success) {
          errors.push(`Failed to create database record for ${name}: ${result.error}`);
        } else {
          successfulCreations++;
        }
      } catch (error: any) {
        errors.push(`Failed to create account for ${name} (${loginId}): ${error.code || error.message}`);
      }
    }

    setIsLoading(false);

    if (successfulCreations > 0) {
      toast({
        title: 'Bulk Add Complete!',
        description: `${successfulCreations} student(s) have been successfully added and are awaiting your approval.`,
      });
    }

    if (errors.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Some Students Could Not Be Added',
        description: (
          <ScrollArea className="h-40">
            <ul className="list-disc list-inside">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </ScrollArea>
        ),
        duration: 15000,
      });
    }

    // Reset forms after submission
    if(type === 'manual') setManualStudents(Array.from({ length: 10 }, () => ({ id: uuidv4(), name: '', studentClass: '', loginMethod: 'username', loginId: '', password: '' })));
    else setCsvData([]);
  };
  
  if (isCheckingStatus) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4 sm:p-6">
        {!isRegistrationOpen ? (
             <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="text-center">
                    <ShieldAlert className="h-16 w-16 mx-auto text-amber-500" />
                    <CardTitle className="text-3xl font-headline text-primary">Registration Temporarily Closed</CardTitle>
                    <CardDescription>New account creation has been paused by the Grandmaster.</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p>Please check back later or contact an administrator.</p>
                </CardContent>
                 <CardFooter>
                    <Button className="w-full" asChild>
                        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        ) : (
            <Card className="w-full max-w-5xl shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline text-primary">Bulk Add Students</CardTitle>
                    <CardDescription>Quickly add multiple students to your guild. All created students will appear in your "Pending Approvals" list.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2 text-center bg-primary/10 p-4 rounded-lg border-2 border-dashed border-primary">
                        <Label htmlFor="class-code" className="text-lg font-semibold">Guild Code</Label>
                        <p className="text-sm">Enter a valid Guild Code to unlock this tool.</p>
                        <div className="flex justify-center items-center gap-2">
                            <Input 
                                id="class-code" 
                                placeholder="ENTER GUILD CODE" 
                                value={classCode} 
                                onChange={(e) => setClassCode(e.target.value.toUpperCase())} 
                                disabled={isLoading || isCheckingCode || isCodeValidated} 
                                className="max-w-xs mx-auto text-center h-12 text-lg tracking-widest font-bold"
                            />
                            <Button onClick={handleValidateCode} disabled={isCheckingCode || !classCode.trim() || isCodeValidated}>
                                {isCheckingCode ? <Loader2 className="h-4 w-4 animate-spin"/> : isCodeValidated ? <CheckCircle className="h-4 w-4" /> : 'Validate Code'}
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
                                <div className="space-y-4">
                                    <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student Name</TableHead>
                                                <TableHead>Class</TableHead>
                                                <TableHead>Login Method</TableHead>
                                                <TableHead>Username/Email</TableHead>
                                                <TableHead>Password</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {manualStudents.map(student => (
                                                <TableRow key={student.id}>
                                                    <TableCell><Input value={student.name} onChange={(e) => handleManualStudentChange(student.id, 'name', e.target.value)} placeholder="Full Name" /></TableCell>
                                                    <TableCell>
                                                        <Select value={student.studentClass} onValueChange={(value) => handleManualStudentChange(student.id, 'studentClass', value)}>
                                                            <SelectTrigger><SelectValue placeholder="Class"/></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Guardian">Guardian</SelectItem>
                                                                <SelectItem value="Healer">Healer</SelectItem>
                                                                <SelectItem value="Mage">Mage</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                         <RadioGroup value={student.loginMethod} onValueChange={(value) => handleManualStudentChange(student.id, 'loginMethod', value)} className="flex">
                                                            <div className="flex items-center space-x-2"><RadioGroupItem value="username" id={`user-${student.id}`}/><Label htmlFor={`user-${student.id}`}>Username</Label></div>
                                                            <div className="flex items-center space-x-2"><RadioGroupItem value="email" id={`email-${student.id}`}/><Label htmlFor={`email-${student.id}`}>Email</Label></div>
                                                        </RadioGroup>
                                                    </TableCell>
                                                    <TableCell><Input value={student.loginId} onChange={(e) => handleManualStudentChange(student.id, 'loginId', e.target.value)} /></TableCell>
                                                    <TableCell><Input type="text" value={student.password} onChange={(e) => handleManualStudentChange(student.id, 'password', e.target.value)} /></TableCell>
                                                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveManualStudent(student.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Button variant="outline" onClick={handleAddManualStudentRow}>Add Row</Button>
                                        <Button onClick={() => handleSubmit('manual')} disabled={isLoading}>
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add Manually Entered Students
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="csv" className="mt-4">
                                <div className="space-y-4 text-center">
                                    <p>Upload a CSV file with the headers: <code className="font-mono bg-muted p-1 rounded-sm">Student Name,Class,Login ID,Password</code></p>
                                    <Input type="file" accept=".csv" onChange={handleFileChange} className="max-w-sm mx-auto" />
                                     <Button asChild variant="outline">
                                        <a href="/csv-template.csv" download="student_upload_template.csv">Download Template</a>
                                    </Button>
                                    {csvData.length > 0 && (
                                        <div className="text-left">
                                            <h3 className="font-semibold">Previewing {csvData.length} records:</h3>
                                            <ScrollArea className="h-48 mt-2 border rounded-md p-2">
                                                <ul className="list-disc list-inside">
                                                    {csvData.map((row, index) => (
                                                        <li key={index}>{row['Student Name']} ({row['Class']})</li>
                                                    ))}
                                                </ul>
                                            </ScrollArea>
                                            <Button onClick={() => handleSubmit('csv')} disabled={isLoading} className="mt-4">
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add Students from CSV
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button variant="link" className="text-muted-foreground" asChild>
                        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        )}
    </div>
  );
}
