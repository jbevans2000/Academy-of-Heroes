
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
import { Loader2, User, KeyRound, Star, BookUser, ShieldAlert, Mail, CheckCircle, Upload, FileText, ArrowLeft, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { ClassType } from '@/lib/data';
import { avatarData } from '@/lib/avatars';
import { getGlobalSettings } from '@/ai/flows/manage-settings';
import { createStudentDocuments } from '@/ai/flows/create-student';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { validateClassCode } from '@/ai/flows/validate-class-code';

interface ManualStudent {
  id: string;
  name: string;
  class: ClassType;
  loginIdMethod: 'email' | 'username';
  loginId: string;
  password: string;
}

export default function BulkAddStudentPage() {
  const [classCode, setClassCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isCodeValidated, setIsCodeValidated] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  // Manual Entry State
  const [manualStudents, setManualStudents] = useState<ManualStudent[]>([]);

  // CSV State
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

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
            toast({ variant: 'destructive', title: 'Invalid Guild Code', description: 'That code was not found.' });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Validation Failed', description: error.message });
    } finally {
        setIsCheckingCode(false);
    }
  }
  
  const handleManualStudentChange = (id: string, field: keyof Omit<ManualStudent, 'id'>, value: string) => {
    setManualStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  
  const handleManualAdd = () => {
    setManualStudents(prev => [...prev, { id: uuidv4(), name: '', class: '', loginIdMethod: 'username', loginId: '', password: '' }]);
  };

  const handleRemoveManualStudent = (id: string) => {
    setManualStudents(prev => prev.filter(s => s.id !== id));
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFileName(file.name);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          setCsvData(result.data);
          toast({ title: 'CSV Processed', description: `${result.data.length} records found.` });
        },
        error: (error: any) => {
          toast({ variant: 'destructive', title: 'CSV Error', description: error.message });
        }
      });
    }
  };
  
  const processStudents = async (studentsToProcess: any[], source: 'manual' | 'csv') => {
    if (!isCodeValidated) {
        toast({ variant: 'destructive', title: 'Guild Code Not Validated', description: 'Please validate the guild code first.'});
        return;
    }

    setIsLoading(true);
    let successCount = 0;
    const errors: string[] = [];
    
    for (const [index, studentData] of studentsToProcess.entries()) {
        const name = source === 'manual' ? studentData.name : studentData['Student Name'];
        const studentClass = source === 'manual' ? studentData.class : studentData['Class'];
        const loginIdMethod = source === 'manual' ? studentData.loginIdMethod : (studentData['Login ID']?.includes('@') ? 'email' : 'username');
        const loginId = source === 'manual' ? studentData.loginId : studentData['Login ID'];
        const password = source === 'manual' ? studentData.password : studentData['Password'];

        if (!name || !studentClass || !loginId || !password) {
            errors.push(`Row ${index + 1}: Missing one or more required fields (Name, Class, Login ID, Password).`);
            continue;
        }

        const selectedAvatar = avatarData[studentClass as ClassType]?.[1]?.[0] || '';
        if (!selectedAvatar) {
            errors.push(`Row ${index + 1}: Invalid class "${studentClass}". Could not assign default avatar.`);
            continue;
        }
        
        try {
            const finalEmail = loginIdMethod === 'email' ? loginId : `${loginId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`;
            const finalStudentId = loginIdMethod === 'email' ? loginId : loginId;

            const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
            const user = userCredential.user;

            const result = await createStudentDocuments({
                classCode,
                userUid: user.uid,
                email: finalEmail,
                studentId: finalStudentId,
                studentName: name,
                characterName: name,
                selectedClass: studentClass as ClassType,
                selectedAvatar: selectedAvatar,
            });

            if (result.success) {
                successCount++;
            } else {
                errors.push(`Row ${index + 1} (${name}): ${result.error}`);
            }
        } catch (error: any) {
            let errorMsg = error.message;
            if (error.code === 'auth/email-already-in-use') errorMsg = 'This username/email is already taken.';
            errors.push(`Row ${index + 1} (${name}): ${errorMsg}`);
        }
    }
    
    setIsLoading(false);

    toast({
        title: 'Bulk Add Complete',
        description: `${successCount} students were successfully added. ${errors.length} students failed.`,
        duration: 8000,
    });

    if (errors.length > 0) {
        // You might want a more sophisticated way to show errors, but for now a toast is fine.
        toast({
            variant: 'destructive',
            title: 'Encountered Errors',
            description: (
                <ScrollArea className="h-40">
                    <pre className="text-xs whitespace-pre-wrap">{errors.join('\n')}</pre>
                </ScrollArea>
            ),
            duration: 15000,
        });
    }
    
    // Clear inputs after processing
    if (source === 'manual') {
        setManualStudents([]);
    } else {
        setCsvData([]);
        setCsvFileName('');
    }
  };

  if (isCheckingStatus) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!isRegistrationOpen) {
    return (
        <div className="flex items-center justify-center min-h-screen p-4">
             <Card className="w-full max-w-lg shadow-2xl bg-card/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <ShieldAlert className="h-16 w-16 mx-auto text-amber-500" />
                    <CardTitle className="text-3xl font-headline text-primary">Registration Temporarily Closed</CardTitle>
                    <CardDescription>New hero creation has been paused by the Grandmaster.</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p>The Bulk Add tool is currently unavailable. Please check back later.</p>
                </CardContent>
                 <CardFooter>
                    <Button className="w-full" asChild>
                        <Link href="/login">Return to Login</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <Card className="w-full max-w-4xl">
             <CardHeader>
                <CardTitle className="text-3xl font-headline text-primary">Bulk Add Students</CardTitle>
                <CardDescription>Quickly create multiple student accounts for your guild.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
                <div className="space-y-2 text-center bg-primary/10 p-4 rounded-lg">
                    <Label htmlFor="class-code" className="flex items-center justify-center text-lg font-semibold"><BookUser className="w-5 h-5 mr-2" />Guild Code</Label>
                    <p className="text-sm text-muted-foreground">Enter your Guild Code to authorize this session.</p>
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
                            {isCheckingCode ? <Loader2 className="h-4 w-4 animate-spin"/> : (isCodeValidated ? <CheckCircle className="h-5 w-5 text-green-500"/> : 'Validate Code')}
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
                                    {manualStudents.map((student, index) => (
                                        <TableRow key={student.id}>
                                            <TableCell><Input value={student.name} onChange={(e) => handleManualStudentChange(student.id, 'name', e.target.value)} placeholder="Full Name" /></TableCell>
                                            <TableCell>
                                                <Select value={student.class} onValueChange={(value) => handleManualStudentChange(student.id, 'class', value)}>
                                                    <SelectTrigger><SelectValue placeholder="Class..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Guardian">Guardian</SelectItem>
                                                        <SelectItem value="Healer">Healer</SelectItem>
                                                        <SelectItem value="Mage">Mage</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                 <RadioGroup
                                                    value={student.loginIdMethod}
                                                    onValueChange={(value) => handleManualStudentChange(student.id, 'loginIdMethod', value)}
                                                    className="flex space-x-2"
                                                >
                                                    <div className="flex items-center space-x-1"><RadioGroupItem value="username" id={`username-${student.id}`} /><Label htmlFor={`username-${student.id}`}>Username</Label></div>
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
                            <Button onClick={handleManualAdd} variant="outline" className="mt-4">Add Student Row</Button>
                        </TabsContent>
                        <TabsContent value="csv" className="mt-4 space-y-4">
                            <p className="text-sm text-muted-foreground">Upload a CSV file with the headers: <code className="font-mono bg-muted p-1 rounded-sm">Student Name,Class,Login ID,Password</code>. The "Class" must be Guardian, Healer, or Mage. The password must be at least 6 characters long.</p>
                            <div className="flex items-center gap-4">
                                <Label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Choose CSV File
                                </Label>
                                <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                                {csvFileName && <p className="text-sm font-semibold">{csvFileName}</p>}
                            </div>
                            <div className="text-sm">
                                <a href="/bulk-add-template.csv" download className="underline text-primary">Download CSV Template</a>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
             </CardContent>
             <CardFooter className="flex flex-col items-center gap-4 pt-6 border-t">
                 <Button onClick={() => processStudents(manualStudents.length > 0 ? manualStudents : csvData, manualStudents.length > 0 ? 'manual' : 'csv')} disabled={isLoading || !isCodeValidated || (manualStudents.length === 0 && csvData.length === 0)}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create {manualStudents.length > 0 ? manualStudents.length : csvData.length} Student Account(s)
                 </Button>
                  <Button variant="link" className="text-muted-foreground" asChild>
                     <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
                 </Button>
             </CardFooter>
        </Card>
    </div>
  );
}
