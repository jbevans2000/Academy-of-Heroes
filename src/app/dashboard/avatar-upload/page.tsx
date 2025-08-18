
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db, app } from '@/lib/firebase';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findTeacherForStudent } from '@/lib/utils';

export default function AvatarUploadPage() {
  const [user, setUser] = useState<User | null>(null);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const foundTeacherUid = await findTeacherForStudent(currentUser.uid);
        if (foundTeacherUid) {
            setTeacherUid(foundTeacherUid);
        }
      } else {
        router.push('/');
      }
      setIsPageLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !user || !teacherUid) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please choose an image file to upload.',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const storage = getStorage(app);
      // Create a path that is unique to the user to prevent overwrites
      const filePath = `avatars/${user.uid}/avatar.png`;
      const storageRef = ref(storage, filePath);

      // Upload the file
      const uploadResult = await uploadBytes(storageRef, file);
      
      // Get the public URL of the uploaded file
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // Update the user's avatarUrl in their Firestore document
      const studentDocRef = doc(db, 'teachers', teacherUid, 'students', user.uid);
      await updateDoc(studentDocRef, {
        avatarUrl: downloadUrl,
      });

      toast({
        title: 'Upload Successful!',
        description: 'Your new avatar has been set.',
      });

      router.push('/dashboard');

    } catch (error: any) {
      console.error('Error uploading file:', error);
      let description = 'An unexpected error occurred.';
      if (error.code === 'storage/unauthorized') {
        description = 'You do not have permission to upload to this location. Please check the storage rules.';
      }
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
        <DashboardHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center bg-muted/40">
            <div className="w-full max-w-lg space-y-4">
                 <Button variant="outline" onClick={() => router.push('/dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>
                <Card className="shadow-lg">
                    <CardHeader className="text-center">
                        <UploadCloud className="h-12 w-12 mx-auto text-primary" />
                        <CardTitle className="text-2xl">Upload Custom Avatar</CardTitle>
                        <CardDescription>Choose an image for your hero from your device.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="picture">Picture</Label>
                            <Input id="picture" type="file" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} />
                        </div>
                        {file && (
                            <p className="text-sm text-muted-foreground">Selected file: {file.name}</p>
                        )}
                        <Button onClick={handleUpload} disabled={isLoading || !file} className="w-full">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Upload and Set as Avatar
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </main>
    </div>
  );
}
