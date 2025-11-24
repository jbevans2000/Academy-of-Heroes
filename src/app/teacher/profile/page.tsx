
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDoc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, CreditCard, Upload, PlusCircle, Trash2, UserPlus, Copy, Edit, UserX } from 'lucide-react';
import { updateTeacherProfile } from '@/ai/flows/manage-teacher';
import { getGlobalSettings } from '@/ai/flows/manage-settings';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { createCoTeacherAccount, updateCoTeacherPermissions } from '@/ai/flows/create-co-teacher';
import { deleteTeacher } from '@/ai/flows/admin-actions';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeacherProfile {
    name: string;
    schoolName: string;
    className: string;
    characterName?: string;
    contactEmail?: string;
    address?: string;
    bio?: string;
    subjectsTaught?: string[];
    avatarUrl?: string;
    sagas?: string[];
    accountType?: 'main' | 'co-teacher';
    mainTeacherUid?: string;
    permissions?: Permissions;
}

const allPermissions = {
    canEditProfile: { label: "Edit Profile", default: true },
    canManageQuests: { label: "Manage Quests & Chapters", default: true },
    canManageBattles: { label: "Manage Boss Battles", default: true },
    canManageRewards: { label: "Manage Guild Rewards Store", default: true },
    canManageStudents: { label: "Manage Students (Edit, Award, etc.)", default: true },
    canManageCompanies: { label: "Manage Companies", default: true },
    canManageDuels: { label: "Manage Training Grounds", default: true },
    canManageTools: { label: "Use Classroom Tools", default: true },
    canManageSharedContent: { label: "Share Content to Royal Library", default: true },
    canBulkAddStudents: { label: "Bulk Add Students", default: false },
    canDeleteStudents: { label: "Retire Heroes (Delete Students)", default: false },
};

type Permissions = Record<keyof typeof allPermissions, boolean>;

interface CoTeacher extends TeacherProfile {
    id: string;
    email: string;
}


function InviteCoTeacherDialog({ isOpen, onOpenChange, teacher, teacherName }: { isOpen: boolean, onOpenChange: (open: boolean) => void, teacher: User | null, teacherName: string }) {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [inviteeName, setInviteeName] = useState('');
    const [inviteeEmail, setInviteeEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [permissions, setPermissions] = useState<Permissions>(() => 
        Object.entries(allPermissions).reduce((acc, [key, { default: defaultValue }]) => {
            (acc as any)[key] = defaultValue;
            return acc;
        }, {} as Permissions)
    );

    const [isInviting, setIsInviting] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string, pass: string } | null>(null);

    const resetState = () => {
        setStep(1);
        setInviteeName('');
        setInviteeEmail('');
        setPassword('');
        setConfirmPassword('');
        setCreatedCredentials(null);
        setPermissions(
            Object.entries(allPermissions).reduce((acc, [key, { default: defaultValue }]) => {
            (acc as any)[key] = defaultValue;
            return acc;
        }, {} as Permissions));
    };

    const handleNext = () => {
        if (!inviteeName || !inviteeEmail || !password || password !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Invalid Information', description: 'Please fill all fields and ensure passwords match.' });
            return;
        }
        if (password.length < 6) {
             toast({ variant: 'destructive', title: 'Password Too Short', description: 'Password must be at least 6 characters.' });
            return;
        }
        setStep(2);
    }

    const handleInvite = async () => {
        if (!teacher) return;
        setIsInviting(true);
        try {
            const result = await createCoTeacherAccount({
                inviteeName,
                inviteeEmail,
                password,
                mainTeacherUid: teacher.uid,
                mainTeacherName: teacherName,
                permissions,
            });

            if (result.success) {
                setCreatedCredentials({ email: inviteeEmail, pass: password });
                setStep(3); // Go to success step
                toast({ title: 'Co-Teacher Account Created!', description: 'Share the login details with your colleague.' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
        } finally {
            setIsInviting(false);
        }
    };
    
    const handlePermissionChange = (key: keyof Permissions, checked: boolean) => {
        setPermissions(prev => ({ ...prev, [key]: checked }));
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetState(); onOpenChange(open); }}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{createdCredentials ? 'Account Created!' : `Invite Co-Teacher (Step ${step}/2)`}</DialogTitle>
                     <DialogDescription>
                        {step === 1 && "Create an account for your co-teacher. They will be able to help manage your classroom."}
                        {step === 2 && "Set the permissions for this co-teacher. They can be edited later."}
                        {step === 3 && "Share these temporary login credentials with your co-teacher. They can change their password after logging in."}
                    </DialogDescription>
                </DialogHeader>
                {step === 1 && (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="invitee-name">Co-Teacher's Name</Label>
                            <Input id="invitee-name" value={inviteeName} onChange={(e) => setInviteeName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invitee-email">Co-Teacher's Email</Label>
                            <Input id="invitee-email" type="email" value={inviteeEmail} onChange={(e) => setInviteeEmail(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="initial-password">Set Initial Password</Label>
                            <Input id="initial-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="confirm-initial-password">Confirm Password</Label>
                            <Input id="confirm-initial-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                    </div>
                )}
                 {step === 2 && (
                    <ScrollArea className="h-72 w-full rounded-md border p-4">
                        <div className="space-y-4">
                            {Object.entries(allPermissions).map(([key, { label }]) => (
                                <div key={key} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`perm-${key}`}
                                        checked={permissions[key as keyof Permissions]}
                                        onCheckedChange={(checked) => handlePermissionChange(key as keyof Permissions, !!checked)}
                                    />
                                    <Label htmlFor={`perm-${key}`}>{label}</Label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
                 {step === 3 && createdCredentials && (
                    <div className="py-4 space-y-4">
                        <div className="p-4 rounded-md bg-secondary border">
                            <p><strong>Email:</strong> {createdCredentials.email}</p>
                            <p><strong>Password:</strong> {createdCredentials.pass}</p>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    {step === 1 && <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>}
                    {step === 1 && <Button onClick={handleNext}>Next: Set Permissions</Button>}
                    {step === 2 && <Button variant="outline" onClick={() => setStep(1)}>Back</Button>}
                    {step === 2 && <Button onClick={handleInvite} disabled={isInviting}>{isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Account</Button>}
                    {step === 3 && <Button onClick={() => { onOpenChange(false); resetState(); }}>Close</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditPermissionsDialog({ isOpen, onOpenChange, coTeacher }: { isOpen: boolean, onOpenChange: (open: boolean) => void, coTeacher: CoTeacher | null }) {
    const { toast } = useToast();
    const [permissions, setPermissions] = useState<Permissions | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (coTeacher?.permissions) {
            setPermissions(coTeacher.permissions);
        } else if (coTeacher) {
            // If permissions object is missing, initialize with defaults
            const defaultPermissions = Object.entries(allPermissions).reduce((acc, [key, { default: defaultValue }]) => {
                (acc as any)[key] = defaultValue;
                return acc;
            }, {} as Permissions);
            setPermissions(defaultPermissions);
        }
    }, [coTeacher]);

    const handlePermissionChange = (key: keyof Permissions, checked: boolean) => {
        setPermissions(prev => prev ? { ...prev, [key]: checked } : null);
    };

    const handleSave = async () => {
        if (!coTeacher || !permissions) return;
        setIsSaving(true);
        try {
            const result = await updateCoTeacherPermissions({ coTeacherUid: coTeacher.id, permissions });
            if (result.success) {
                toast({ title: 'Permissions Updated', description: `Permissions for ${coTeacher.name} have been saved.` });
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (!coTeacher || !permissions) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Edit Permissions for {coTeacher.name}</DialogTitle>
                    <DialogDescription>
                        Grant or revoke access to specific features for this co-teacher.
                    </DialogDescription>
                </DialogHeader>
                 <ScrollArea className="h-72 w-full rounded-md border p-4">
                    <div className="space-y-4">
                        {Object.entries(allPermissions).map(([key, { label }]) => (
                            <div key={key} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`edit-perm-${key}`}
                                    checked={permissions[key as keyof Permissions]}
                                    onCheckedChange={(checked) => handlePermissionChange(key as keyof Permissions, !!checked)}
                                />
                                <Label htmlFor={`edit-perm-${key}`}>{label}</Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Permissions
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function TeacherProfilePage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [profile, setProfile] = useState<TeacherProfile>({ name: '', schoolName: '', className: '', sagas: [] });
    const [initialProfile, setInitialProfile] = useState<TeacherProfile>({ name: '', schoolName: '', className: '', sagas: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isBeta, setIsBeta] = useState(false);

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [newSagaName, setNewSagaName] = useState('');
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    
    // State for managing co-teachers
    const [coTeachers, setCoTeachers] = useState<CoTeacher[]>([]);
    const [coTeacherToDelete, setCoTeacherToDelete] = useState<CoTeacher | null>(null);
    const [isDeletingCoTeacher, setIsDeletingCoTeacher] = useState(false);
    
    // State for editing co-teacher permissions
    const [editingCoTeacher, setEditingCoTeacher] = useState<CoTeacher | null>(null);
    const [isEditPermsDialogOpen, setIsEditPermsDialogOpen] = useState(false);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setTeacher(user);
                const docRef = doc(db, 'teachers', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as TeacherProfile;
                    const profileData = { ...data, sagas: data.sagas || [] };
                    setProfile(profileData);
                    setInitialProfile(profileData);
                    setAvatarPreview(data.avatarUrl || null);
                }
                const settings = await getGlobalSettings();
                setIsBeta(settings.isFeedbackPanelVisible ?? false);
                setIsLoading(false);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    const isMainTeacher = profile.accountType !== 'co-teacher';

    // Fetch co-teachers
    useEffect(() => {
        if (!isMainTeacher || !teacher) return;
        
        const q = query(collection(db, 'teachers'), where('mainTeacherUid', '==', teacher.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCoTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoTeacher)));
        });
        return () => unsubscribe();
    }, [isMainTeacher, teacher]);
    
    const handleDeleteCoTeacher = async () => {
        if (!coTeacherToDelete) return;
        setIsDeletingCoTeacher(true);
        try {
            const result = await deleteTeacher(coTeacherToDelete.id);
            if(result.success) {
                toast({ title: 'Co-Teacher Removed', description: `${coTeacherToDelete.name} has been removed from your guild.` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
        } finally {
            setIsDeletingCoTeacher(false);
            setCoTeacherToDelete(null);
        }
    };


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubjectsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setProfile(prev => ({ ...prev, subjectsTaught: value.split(',').map(s => s.trim()) }));
    }

    const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleAddSaga = () => {
        if (newSagaName.trim()) {
            const updatedSagas = [...(profile.sagas || []), newSagaName.trim()];
            setProfile(prev => ({ ...prev, sagas: updatedSagas }));
            setNewSagaName('');
        }
    };

    const handleRemoveSaga = (indexToRemove: number) => {
        const updatedSagas = (profile.sagas || []).filter((_, index) => index !== indexToRemove);
        setProfile(prev => ({ ...prev, sagas: updatedSagas }));
    };

    const hasChanges = JSON.stringify(profile) !== JSON.stringify(initialProfile) || !!avatarFile;

    const handleSaveChanges = async () => {
        if (!teacher) return;
        if (!hasChanges && !avatarFile) {
            toast({ title: 'No Changes', description: 'There are no new updates to save.' });
            return;
        }

        setIsSaving(true);
        let uploadedAvatarUrl = profile.avatarUrl;

        try {
            // Step 1: Upload new avatar if it exists
            if (avatarFile) {
                setIsUploading(true);
                const storage = getStorage(app);
                const filePath = `teacher-avatars/${teacher.uid}/${uuidv4()}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, avatarFile);
                uploadedAvatarUrl = await getDownloadURL(storageRef);
                setIsUploading(false);
            }

            // Step 2: Update the profile document
            const result = await updateTeacherProfile({
                teacherUid: teacher.uid,
                name: profile.name,
                schoolName: profile.schoolName,
                className: profile.className,
                characterName: profile.characterName || '',
                contactEmail: profile.contactEmail || '',
                address: profile.address || '',
                bio: profile.bio || '',
                subjectsTaught: profile.subjectsTaught || [],
                sagas: profile.sagas || [], // Save sagas
                avatarUrl: uploadedAvatarUrl,
            });

            if (result.success) {
                toast({ title: "Profile Updated", description: "Your information has been successfully saved." });
                // Update local state to reflect saved data
                const updatedProfile = { ...profile, avatarUrl: uploadedAvatarUrl };
                setProfile(updatedProfile);
                setInitialProfile(updatedProfile);
                setAvatarFile(null); // Clear the file input state
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Error saving profile: ", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message || "An unexpected error occurred." });
        } finally {
            setIsSaving(false);
            setIsUploading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <>
            <InviteCoTeacherDialog isOpen={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen} teacher={teacher} teacherName={profile.name} />
            <EditPermissionsDialog isOpen={isEditPermsDialogOpen} onOpenChange={setIsEditPermsDialogOpen} coTeacher={editingCoTeacher} />
             <AlertDialog open={!!coTeacherToDelete} onOpenChange={() => setCoTeacherToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Co-Teacher?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove {coTeacherToDelete?.name}? Their account will be permanently deleted, and they will lose access to your guild.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCoTeacher} disabled={isDeletingCoTeacher} className="bg-destructive hover:bg-destructive/90">
                            {isDeletingCoTeacher && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Remove Co-Teacher
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div 
                className="flex min-h-screen w-full flex-col bg-cover bg-center"
                style={{
                  backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.googleapis.com/o/Web%20Backgrounds%2Fenvato-labs-ai-76d263d1-64d5-4a17-bda2-a3dc4f20d94f.jpg?alt=media&token=c42c3ef2-243c-4458-9cd5-10bc3bf7fadd')`,
                }}
            >
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Podium
                        </Button>

                        <Card className="bg-card/90 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>My Profile</CardTitle>
                                <CardDescription>Update your personal and school information here.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="space-y-2">
                                        <Label>Profile Picture</Label>
                                        <div className="w-32 h-32 relative rounded-full overflow-hidden border-4 border-primary">
                                            {avatarPreview ? (
                                                <Image src={avatarPreview} alt="Avatar Preview" layout="fill" className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground">
                                                    No Image
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-full">
                                        <Label htmlFor="avatar-upload">Upload New Avatar</Label>
                                        <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarFileChange} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" name="name" value={profile.name} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="characterName">Character Name (Optional)</Label>
                                    <Input id="characterName" name="characterName" value={profile.characterName || ''} onChange={handleInputChange} placeholder="e.g., The Grandmaster" />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="contactEmail">Contact Email</Label>
                                    <Input id="contactEmail" name="contactEmail" type="email" value={profile.contactEmail || ''} onChange={handleInputChange} />
                                    <p className="text-xs text-muted-foreground">This does not change your login email.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="schoolName">School Name</Label>
                                    <Input id="schoolName" name="schoolName" value={profile.schoolName} onChange={handleInputChange} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="address">School Address</Label>
                                    <Input id="address" name="address" value={profile.address || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="className">Guild Name (Class Name)</Label>
                                    <Input id="className" name="className" value={profile.className} onChange={handleInputChange} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="bio">Bio</Label>
                                    <Textarea id="bio" name="bio" value={profile.bio || ''} onChange={handleInputChange} placeholder="A short bio for your creator profile in the Royal Library." />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="subjectsTaught">Subjects Taught</Label>
                                    <Input id="subjectsTaught" name="subjectsTaught" value={profile.subjectsTaught?.join(', ') || ''} onChange={handleSubjectsChange} placeholder="e.g., History, Mathematics, Science" />
                                    <p className="text-xs text-muted-foreground">Enter subjects separated by commas.</p>
                                </div>
                            </CardContent>
                        </Card>

                        {isMainTeacher && (
                             <Card className="bg-card/90 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle>My Sagas</CardTitle>
                                    <CardDescription>Create names for overarching storylines that connect multiple Quest Hubs.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-saga-name">New Saga Name</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="new-saga-name"
                                                value={newSagaName}
                                                onChange={(e) => setNewSagaName(e.target.value)}
                                                placeholder="e.g., The Dragon's Awakening"
                                            />
                                            <Button onClick={handleAddSaga}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Saga
                                            </Button>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div>
                                        <h4 className="font-semibold mb-2">Existing Sagas:</h4>
                                        <div className="space-y-2">
                                            {(profile.sagas && profile.sagas.length > 0) ? (
                                                profile.sagas.map((saga, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                                        <span className="font-medium">{saga}</span>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSaga(index)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground">You haven't created any sagas yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
                        {isMainTeacher && (
                             <Card className="bg-card/90 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle>Co-Teacher Management</CardTitle>
                                    <CardDescription>Invite and manage teachers who can help run your guild.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={() => setIsInviteDialogOpen(true)}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Invite a Co-Teacher
                                    </Button>
                                    <div className="mt-4 space-y-2">
                                        <h4 className="font-semibold">Current Co-Teachers:</h4>
                                        {coTeachers.length > 0 ? (
                                            coTeachers.map(ct => (
                                                <div key={ct.id} className="flex justify-between items-center p-2 border rounded-md">
                                                    <div>
                                                        <p className="font-medium">{ct.name}</p>
                                                        <p className="text-sm text-muted-foreground">{ct.email}</p>
                                                    </div>
                                                     <div className="flex items-center gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => { setEditingCoTeacher(ct); setIsEditPermsDialogOpen(true); }}>
                                                            <Edit className="mr-2 h-4 w-4"/>
                                                            Permissions
                                                        </Button>
                                                        <Button variant="destructive" size="sm" onClick={() => setCoTeacherToDelete(ct)}>
                                                            <UserX className="mr-2 h-4 w-4" />
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">You have not invited any co-teachers.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}


                         <Card className="bg-card/90 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Billing & Subscription</CardTitle>
                                <CardDescription>Manage your Academy of Heroes plan.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-start gap-4">
                                {isBeta ? (
                                    <p className="text-destructive font-bold p-4 border-l-4 border-destructive bg-destructive/10 rounded-r-md">
                                        Subscription and payment features are disabled during the BETA testing period.
                                    </p>
                                ) : (
                                    <>
                                        <div className="p-4 border rounded-md w-full">
                                            <p className="font-semibold">Current Plan: <span className="text-primary">Premium</span></p>
                                            <p className="text-sm text-muted-foreground">Your plan renews on September 1, 2025.</p>
                                        </div>
                                        <Button disabled><CreditCard className="mr-2 h-4 w-4" /> Manage Subscription</Button>
                                        <p className="text-xs text-muted-foreground">Subscription management is handled by our secure third-party provider.</p>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button onClick={handleSaveChanges} disabled={!hasChanges || isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}
