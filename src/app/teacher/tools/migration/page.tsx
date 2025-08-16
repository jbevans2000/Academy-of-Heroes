
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DatabaseZap, Loader2 } from 'lucide-react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


// HARDCODED TEACHER UID
const TEACHER_UID = 'ICKWJ5MQl0SHFzzaSXqPuGS3NHr2';

export default function MigrationPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isMigrating, setIsMigrating] = useState(false);
    
    const handleMigration = async () => {
        setIsMigrating(true);
        try {
            const batch = writeBatch(db);
            const oldLiveBattlesRef = collection(db, 'liveBattles');
            const oldDocsSnapshot = await getDocs(oldLiveBattlesRef);

            if (oldDocsSnapshot.empty) {
                toast({
                    title: 'No Data to Move',
                    description: 'The top-level liveBattles collection is already empty.',
                });
                setIsMigrating(false);
                return;
            }
            
            let movedCount = 0;
            oldDocsSnapshot.forEach(oldDoc => {
                const newDocRef = doc(db, 'teachers', TEACHER_UID, 'liveBattles', oldDoc.id);
                batch.set(newDocRef, oldDoc.data());
                batch.delete(oldDoc.ref);
                movedCount++;
            });

            await batch.commit();

            toast({
                title: 'Migration Successful!',
                description: `Successfully moved ${movedCount} document(s) to the correct location.`,
            });
            router.push('/teacher/tools');

        } catch (error: any) {
             console.error("Error during migration: ", error);
             let description = 'Could not move the data. Please check the console for errors.';
             if (error.code === 'permission-denied') {
                description = "Permission Denied. Please ensure your Firestore security rules allow you to read from the top-level 'liveBattles' collection to perform this migration."
             }
             toast({
                variant: 'destructive',
                title: 'Migration Failed',
                description: description,
             });
        } finally {
            setIsMigrating(false);
        }
    };


    return (
        <div className="flex min-h-screen w-full flex-col">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                    <Card className="shadow-2xl text-center">
                        <CardHeader>
                            <div className="flex justify-center mb-2">
                                <DatabaseZap className="h-12 w-12 text-destructive" />
                            </div>
                            <CardTitle className="text-3xl">Database Migration Tool</CardTitle>
                            <CardDescription>
                                This is a one-time use tool to move the old `liveBattles` collection
                                to its correct nested location under your teacher account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <p className="text-muted-foreground">
                             Press the button below to start the migration process. This will read all documents from the top-level `liveBattles` collection, copy them to `teachers/{'{YOUR_ID}'}/liveBattles`, and then delete the old documents.
                           </p>

                            <AlertDialog>
                               <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="lg" disabled={isMigrating}>
                                        {isMigrating ? (
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        ) : (
                                            <DatabaseZap className="mr-2 h-5 w-5" />
                                        )}
                                        Start Migration
                                    </Button>
                               </AlertDialogTrigger>
                               <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Data Migration</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to proceed? This will permanently move data in your Firestore database.
                                        This action cannot be undone.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isMigrating}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleMigration} disabled={isMigrating}>
                                        {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Yes, Migrate Data
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
