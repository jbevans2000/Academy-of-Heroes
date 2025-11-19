
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, CreditCard, Upload, PlusCircle, Trash2 } from 'lucide-react';
import { updateTeacherProfile } from '@/ai/flows/manage-teacher';
import { getGlobalSettings } from '@/ai/flows/manage-settings';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from '@/components/ui/separator';

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
    sagas?: string[]; // New field
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

    // New state for avatar upload
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // New state for sagas
    const [newSagaName, setNewSagaName] = useState('');

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
        <div 
            className="flex min-h-screen w-full flex-col bg-cover bg-center"
            style={{
              backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-76d263d1-64d5-4a17-bda2-a3dc4f20d94f.jpg?alt=media&token=c42c3ef2-243c-4458-9cd5-10bc3bf7fadd')`,
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
    )
}
