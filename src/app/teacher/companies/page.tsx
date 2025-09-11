
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, app } from '@/lib/firebase';
import type { Student, Company } from '@/lib/data';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PlusCircle, Edit, Trash2, Loader2, Upload, Users, Briefcase, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const CompanyCard = ({ company, students, onEdit, onDelete, onDrop, onRemoveStudent }: {
    company: Company;
    students: Student[];
    onEdit: (company: Company) => void;
    onDelete: (companyId: string) => void;
    onDrop: (studentId: string, companyId: string) => void;
    onRemoveStudent: (studentId: string) => void;
}) => {
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const studentId = e.dataTransfer.getData('studentId');
        onDrop(studentId, company.id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <Card onDrop={handleDrop} onDragOver={handleDragOver} className="flex flex-col">
            <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    {company.logoUrl && <Image src={company.logoUrl} alt={company.name} width={40} height={40} className="rounded-full object-cover" />}
                    <CardTitle>{company.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(company)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(company.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
                {students.length > 0 ? students.map(student => (
                    <div key={student.uid} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                        <span className="font-medium">{student.characterName}</span>
                         <Button variant="ghost" size="icon" onClick={() => onRemoveStudent(student.uid)}><X className="h-4 w-4" /></Button>
                    </div>
                )) : <p className="text-muted-foreground text-sm">Drag students here to assign them.</p>}
            </CardContent>
        </Card>
    );
};

const FreelancerCard = ({ students, onDrop }: {
    students: Student[];
    onDrop: (studentId: string) => void;
}) => {
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const studentId = e.dataTransfer.getData('studentId');
        onDrop(studentId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };
    
    const handleDragStart = (e: React.DragEvent, studentId: string) => {
        e.dataTransfer.setData('studentId', studentId);
    };

    return (
        <Card onDrop={handleDrop} onDragOver={handleDragOver} className="bg-muted/50">
            <CardHeader>
                <CardTitle>Freelancers</CardTitle>
                <CardDescription>Students not assigned to a company.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {students.map(student => (
                     <div 
                        key={student.uid} 
                        className="flex items-center justify-between p-2 bg-background rounded-md shadow-sm cursor-grab" 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, student.uid)}
                    >
                        <div className="flex items-center gap-2">
                            <Image src={student.avatarUrl} alt={student.characterName} width={32} height={32} className="rounded-full" />
                            <span className="font-medium">{student.characterName}</span>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export default function CompaniesPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [companyName, setCompanyName] = useState('');
    const [companyLogo, setCompanyLogo] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) setTeacher(user);
            else router.push('/teacher/login');
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!teacher) return;
        
        const unsubStudents = onSnapshot(collection(db, 'teachers', teacher.uid, 'students'), (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student)));
            setIsLoading(false);
        });

        const unsubCompanies = onSnapshot(collection(db, 'teachers', teacher.uid, 'companies'), (snapshot) => {
            setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
        });

        return () => {
            unsubStudents();
            unsubCompanies();
        };
    }, [teacher]);

    const openNewCompanyDialog = () => {
        setEditingCompany(null);
        setCompanyName('');
        setCompanyLogo(null);
        setIsCompanyDialogOpen(true);
    };

    const openEditCompanyDialog = (company: Company) => {
        setEditingCompany(company);
        setCompanyName(company.name);
        setCompanyLogo(null);
        setIsCompanyDialogOpen(true);
    };

    const handleStudentDrop = async (studentId: string, companyId: string) => {
        if (!teacher) return;
        const studentRef = doc(db, 'teachers', teacher.uid, 'students', studentId);
        await updateDoc(studentRef, { companyId: companyId });
    };

    const handleRemoveStudentFromCompany = async (studentId: string) => {
         if (!teacher) return;
        const studentRef = doc(db, 'teachers', teacher.uid, 'students', studentId);
        await updateDoc(studentRef, { companyId: '' }); // Or delete the field
    }

    const handleDeleteCompany = async () => {
        if (!teacher || !companyToDelete) return;
        setIsSaving(true);
        try {
            const companyRef = doc(db, 'teachers', teacher.uid, 'companies', companyToDelete);
            
            // Unassign all students from this company
            const studentsToUpdate = students.filter(s => s.companyId === companyToDelete);
            const batch = writeBatch(db);
            studentsToUpdate.forEach(student => {
                const studentRef = doc(db, 'teachers', teacher.uid, 'students', student.uid);
                batch.update(studentRef, { companyId: '' });
            });
            
            batch.delete(companyRef);
            await batch.commit();

            toast({ title: "Company Disbanded", description: "The company and its assignments have been removed." });
        } catch (error) {
            console.error("Error deleting company: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the company.' });
        } finally {
            setIsSaving(false);
            setCompanyToDelete(null);
            setIsDeleteConfirmOpen(false);
        }
    };
    
    const handleSaveCompany = async () => {
        if (!teacher || !companyName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Company name cannot be empty.' });
            return;
        }
        setIsSaving(true);

        try {
            let logoUrl = editingCompany?.logoUrl || '';
            if (companyLogo) {
                const storage = getStorage(app);
                const logoRef = ref(storage, `company-logos/${teacher.uid}/${Date.now()}_${companyLogo.name}`);
                
                const reader = new FileReader();
                reader.readAsDataURL(companyLogo);
                reader.onload = async (event) => {
                    if (event.target?.result) {
                        const dataUrl = event.target.result as string;
                        try {
                            await uploadString(logoRef, dataUrl, 'data_url');
                            logoUrl = await getDownloadURL(logoRef);
                            await saveCompanyData(logoUrl);
                        } catch(uploadError) {
                            console.error("Error during logo upload and data save: ", uploadError);
                            toast({ variant: 'destructive', title: 'Error', description: 'Could not upload the logo and save the company.' });
                            setIsSaving(false);
                        }
                    } else {
                        throw new Error("Failed to read file for upload.");
                    }
                };
                reader.onerror = (error) => {
                    console.error("File reading error: ", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not read the selected file.' });
                    setIsSaving(false);
                };
            } else {
                 await saveCompanyData(logoUrl);
            }
            
        } catch (error) {
             console.error("Error saving company: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save the company.' });
            setIsSaving(false);
        }
    }
    
    const saveCompanyData = async (logoUrl: string) => {
        if (!teacher) return;
        try {
            const companyData = { name: companyName, logoUrl };
            if (editingCompany) {
                const companyRef = doc(db, 'teachers', teacher.uid, 'companies', editingCompany.id);
                await updateDoc(companyRef, companyData);
                toast({ title: 'Company Updated', description: 'The company details have been saved.' });
            } else {
                await addDoc(collection(db, 'teachers', teacher.uid, 'companies'), {
                    ...companyData,
                    createdAt: serverTimestamp(),
                });
                toast({ title: 'Company Created', description: 'The new company is ready for members.' });
            }
        } finally {
            setIsSaving(false);
            setIsCompanyDialogOpen(false);
            setEditingCompany(null);
            setCompanyLogo(null);
            setCompanyName('');
        }
    }

    const freelancers = students.filter(s => !s.companyId && !s.isHidden);
    const visibleStudents = students.filter(s => !s.isHidden);


    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin" /></main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold flex items-center gap-2"><Briefcase /> Company Management</h1>
                        <p className="text-muted-foreground">Drag and drop students to assign them to companies.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => router.push('/teacher/dashboard')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Return to Podium</Button>
                        <Button onClick={openNewCompanyDialog}><PlusCircle className="mr-2 h-4 w-4" /> Create New Company</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                         {companies.map(company => (
                            <CompanyCard
                                key={company.id}
                                company={company}
                                students={visibleStudents.filter(s => s.companyId === company.id)}
                                onEdit={openEditCompanyDialog}
                                onDelete={(id) => { setCompanyToDelete(id); setIsDeleteConfirmOpen(true); }}
                                onDrop={handleStudentDrop}
                                onRemoveStudent={handleRemoveStudentFromCompany}
                            />
                        ))}
                    </div>
                    <FreelancerCard students={freelancers} onDrop={(studentId) => handleRemoveStudentFromCompany(studentId)} />
                </div>
            </main>

             <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCompany ? 'Edit Company' : 'Create New Company'}</DialogTitle>
                        <DialogDescription>
                            Enter a name for the company and optionally upload a logo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="company-name">Company Name</Label>
                            <Input id="company-name" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g., The Crimson Blades" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="company-logo">Company Logo</Label>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="company-logo-upload" className={cn(buttonVariants({ variant: 'secondary' }), "cursor-pointer")}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Choose File
                                </Label>
                                <Input id="company-logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setCompanyLogo(e.target.files ? e.target.files[0] : null)} />
                                {companyLogo && <p className="text-sm text-muted-foreground">{companyLogo.name}</p>}
                                {companyLogo && <Button variant="ghost" size="icon" onClick={() => setCompanyLogo(null)}><X className="h-4 w-4" /></Button>}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveCompany} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingCompany ? 'Save Changes' : 'Create Company'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this company?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will disband the company, and all its members will become freelancers. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCompany} className="bg-destructive hover:bg-destructive/90">
                            Yes, Disband Company
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
