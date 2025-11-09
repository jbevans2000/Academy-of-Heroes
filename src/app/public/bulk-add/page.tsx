
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
import { Loader2, Shield, Heart, Wand, User, KeyRound, Star, Eye, EyeOff, ArrowLeft, BookUser, ShieldAlert, CheckCircle, Upload, FileText, Trash2 } from 'lucide-react';
import { getGlobalSettings } from '@/ai/flows/manage-settings';
import { createStudentDocuments } from '@/ai/flows/create-student';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { validateClassCode } from '@/ai/flows/validate-class-code';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { ClassType } from '@/lib/data';
import { avatarData } from '@/lib/avatars';


interface ManualStudentEntry {
    id: string;
    studentName: string;
    class: ClassType;
    loginMethod: 'email' | 'username';
    loginId: string;
    password: string;
}


export default function BulkAddPage() {
  const [classCode, setClassCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // New state for code validation
  const [isCodeValidated, setIsCodeValidated] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  // Manual Entry State
  const [manualStudents, setManualStudents] = useState<ManualStudentEntry[]>([]);

  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    // Initialize with 10 empty rows
    const initialRows = Array.from({ length: 10 }, () => ({
        id: uuidv4(),
        studentName: '',
        class: '' as ClassType,
        loginMethod: 'username' as 'email' | 'username',
        loginId: '',
        password: ''
    }));
    setManualStudents(initialRows);
  }, []);

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
  
    const handleManualStudentChange = (id: string, field: keyof ManualStudentEntry, value: any) => {
        setManualStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleAddManualStudent = () => {
        setManualStudents(prev => [...prev, {
            id: uuidv4(),
            studentName: '',
            class: '' as ClassType,
            loginMethod: 'username',
            loginId: '',
            password: ''
        }]);
    };

    const handleRemoveManualStudent = (id: string) => {
        setManualStudents(prev => prev.filter(s => s.id !== id));
    };

    const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            complete: (result) => {
                const csvData = result.data as string[][];
                if(csvData.length > 1) { // has headers and at least one row
                    const studentsFromCsv = csvData.slice(1).map(row => {
                        const [studentName, studentClass, loginId, password, characterName] = row;
                        return {
                            id: uuidv4(),
                            studentName: studentName || '',
                            class: studentClass as ClassType || '',
                            loginMethod: 'username' as 'email' | 'username',
                            loginId: loginId || '',
                            password: password || '',
                            characterName: characterName || studentName || '',
                        };
                    }).filter(s => s.studentName && s.class && s.loginId && s.password);
                    
                    if (studentsFromCsv.length > 0) {
                        handleBulkCreate(studentsFromCsv);
                    } else {
                        toast({ variant: 'destructive', title: 'Invalid CSV', description: 'No valid student rows found in the CSV file.' });
                    }
                }
            },
            error: (error) => {
                toast({ variant: 'destructive', title: 'CSV Parse Error', description: error.message });
            }
        });
        
        event.target.value = '';
    };

    const handleBulkCreate = async (studentsToCreate: (Omit<ManualStudentEntry, 'loginMethod'> & { characterName?: string })[]) => {
        if (!isCodeValidated) {
            toast({ variant: 'destructive', title: 'Guild Code Not Validated' });
            return;
        }

        const validStudents = studentsToCreate.filter(s => s.studentName && s.class && s.loginId && s.password);

        if (validStudents.length === 0) {
            toast({ variant: 'destructive', title: 'No Students to Add', description: 'Please fill out at least one student row completely.' });
            return;
        }
        
        setIsLoading(true);
        let successCount = 0;
        let failureCount = 0;
        let failedNames: string[] = [];

        for (const student of validStudents) {
            try {
                // Determine if loginId is an email or username
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.loginId);
                const finalEmail = isEmail ? student.loginId : `${student.loginId.toLowerCase().replace(/\s/g, '_')}@academy-heroes-mziuf.firebaseapp.com`;

                const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, student.password);
                const user = userCredential.user;
                
                const selectedAvatar = avatarData[student.class]?.[1]?.[0] || '';

                const result = await createStudentDocuments({
                    classCode,
                    userUid: user.uid,
                    email: finalEmail,
                    studentId: student.loginId,
                    studentName: student.studentName,
                    characterName: student.characterName || student.studentName,
                    selectedClass: student.class,
                    selectedAvatar: selectedAvatar,
                });
                
                if (result.success) {
                    successCount++;
                } else {
                    failureCount++;
                    failedNames.push(student.studentName);
                    // Consider how to handle auth user cleanup on failure
                    console.error(`Failed to create Firestore docs for ${student.studentName}: ${result.error}`);
                }
            } catch (error: any) {
                failureCount++;
                failedNames.push(student.studentName);
                console.error(`Failed to create auth user for ${student.studentName}: ${error.message}`);
            }
        }
        
        setIsLoading(false);
        if (failureCount > 0) {
            toast({
                variant: 'destructive',
                title: 'Partial Success',
                description: `Successfully created ${successCount} students. Failed to create ${failureCount} students: ${failedNames.join(', ')}. Check the console for errors.`
            });
        } else {
            toast({
                title: 'Bulk Add Complete!',
                description: `Successfully created and sent ${successCount} student(s) for approval.`
            });
        }
        // Reset manual entry form
        setManualStudents(Array.from({ length: 10 }, () => ({
            id: uuidv4(),
            studentName: '',
            class: '' as ClassType,
            loginMethod: 'username',
            loginId: '',
            password: ''
        })));
    };


  const RegistrationClosedCard = () => (
    <Card className="w-full max-w-lg shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
            <ShieldAlert className="h-16 w-16 mx-auto text-amber-500" />
            <CardTitle className="text-3xl font-headline text-primary">Registration Temporarily Closed</CardTitle>
            <CardDescription>New hero creation has been paused by the Grandmaster.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p>Please check back later or contact your Guild Leader for more information. The realm awaits your return!</p>
        </CardContent>
         <CardFooter>
            <Button className="w-full" asChild>
                <Link href="/login">Return to Login</Link>
            </Button>
        </CardFooter>
    </Card>
  );
  
  const isFormDisabled = !isCodeValidated;

  return (
      <div 
        className="flex items-start justify-center min-h-screen bg-background p-4 sm:p-6"
        style={{
          backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Sep%2012%2C%202025%2C%2005_51_46%20PM.png?alt=media&token=0d3a14f7-9769-4696-95a5-09e6b578c949')`,
          backgroundSize: 'cover',
          backgroundPosition: 'top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {isCheckingStatus ? <Loader2 className="h-16 w-16 animate-spin text-primary mt-24" /> :
         !isRegistrationOpen ? <RegistrationClosedCard /> :
        <Card className="w-full max-w-6xl shadow-2xl bg-card/90 backdrop-blur-sm mt-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline text-primary">Bulk Add Students</CardTitle>
            <CardDescription>Quickly create multiple student accounts for your guild.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2 text-center bg-primary/10 p-4 rounded-lg">
                <Label htmlFor="class-code" className="flex items-center justify-center text-lg font-semibold"><BookUser className="w-5 h-5 mr-2" />Guild Code</Label>
                 <p className="text-sm">This is the most important step! Get this code from your Guild Leader.</p>
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
                        {isCheckingCode ? <Loader2 className="h-4 w-4 animate-spin"/> : (isCodeValidated ? <CheckCircle className="h-4 w-4 text-green-500" /> : 'Validate Code')}
                    </Button>
                </div>
              </div>
              
            <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual" disabled={isFormDisabled}>Manual Entry</TabsTrigger>
                    <TabsTrigger value="csv" disabled={isFormDisabled}>CSV Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="manual">
                    <Card className="bg-transparent border-0 shadow-none">
                        <CardHeader>
                             <CardDescription>
                                Add students manually below. Click the "Add Students" button when you are finished. Unfilled rows will be ignored.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Class</TableHead>
                                            <TableHead>Login Method</TableHead>
                                            <TableHead>Login ID</TableHead>
                                            <TableHead>Password</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {manualStudents.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell><Input placeholder="e.g., John Smith" value={student.studentName} onChange={(e) => handleManualStudentChange(student.id, 'studentName', e.target.value)} /></TableCell>
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
                                                     <Select value={student.loginMethod} onValueChange={(value) => handleManualStudentChange(student.id, 'loginMethod', value)}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="username">Username</SelectItem>
                                                            <SelectItem value="email">Email</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell><Input placeholder={student.loginMethod === 'username' ? 'e.g., jsmith123' : 'e.g., student@email.com'} value={student.loginId} onChange={(e) => handleManualStudentChange(student.id, 'loginId', e.target.value)} /></TableCell>
                                                <TableCell><Input type="text" placeholder="e.g., student ID" value={student.password} onChange={(e) => handleManualStudentChange(student.id, 'password', e.target.value)} /></TableCell>
                                                <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveManualStudent(student.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </div>
                             <div className="flex justify-between mt-4">
                                <Button variant="outline" onClick={handleAddManualStudent}>Add Row</Button>
                                <Button onClick={() => handleBulkCreate(manualStudents)} disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Add Students
                                </Button>
                             </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="csv">
                     <Card className="bg-transparent border-0 shadow-none">
                        <CardHeader>
                             <CardDescription>
                                Upload a CSV file with student data. The file should have the following columns in this exact order: 
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="list-disc list-inside bg-secondary p-4 rounded-md">
                                <li><code className="font-semibold">Student Name</code></li>
                                <li><code className="font-semibold">Class</code> - Must be Guardian, Healer, or Mage - Incorrect spelling will result in account creation failure!</li>
                                <li><code className="font-semibold">Login ID</code>  - Can be a username or an email address </li>
                                <li><code className="font-semibold">Password</code>  - Must be at least 6 characters </li>
                                <li><code className="font-semibold">Character Name</code>  - Optional - defaults to Student Name if blank </li>
                                <li><code className="font-semibold">Avatar Image</code> - Will default to the first option, but can be changed on the student forge page after account creation.</li>
                            </ul>
                            <div className="flex items-center gap-4">
                                <Label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                                    <Upload className="mr-2 h-4 w-4" /> Upload CSV File
                                </Label>
                                <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} disabled={isLoading} />
                                <a
                                    href="data:text/csv;charset=utf-8,Student%20Name,Class,Login%20ID,Password,Character%20Name%20(Optional)"
                                    download="student_template.csv"
                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                >
                                    <FileText className="mr-2 h-4 w-4" /> Download Template
                                </a>
                            </div>
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>
          </CardContent>
           <CardFooter className="flex-col gap-4 pt-6">
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                        This tool creates real user accounts. Please ensure all information is correct and that you have the necessary permissions. All created accounts will require teacher approval before they can be used.
                    </AlertDescription>
                </Alert>
                <div className="flex justify-between items-center w-full">
                    <Button variant="link" className="text-muted-foreground" asChild>
                        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
                    </Button>
                </div>
            </CardFooter>
        </Card>
        }
      </div>
  );
}
