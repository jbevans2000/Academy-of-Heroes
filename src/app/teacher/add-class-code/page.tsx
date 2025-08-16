
'use server';

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { revalidatePath } from 'next/cache';

// HARDCODED TEACHER UID
const TEACHER_UID = 'ICKWJ5MQl0SHFzzaSXqPuGS3NHr2';

const generateClassCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omitted I, O, 0, 1 for clarity
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
        if (i === 2) {
            result += '-';
        }
    }
    return result;
};

async function addClassCode() {
    'use server';
    const teacherRef = doc(db, 'teachers', TEACHER_UID);

    try {
        const teacherSnap = await getDoc(teacherRef);
        if (teacherSnap.exists() && teacherSnap.data().classCode) {
            return { success: true, code: teacherSnap.data().classCode, message: 'You already have a class code.' };
        }
        
        const newCode = generateClassCode();
        await updateDoc(teacherRef, {
            classCode: newCode
        });
        
        revalidatePath('/teacher/add-class-code');
        return { success: true, code: newCode, message: 'Your new class code has been generated!' };

    } catch (error: any) {
        console.error("Error adding class code:", error);
        return { success: false, code: null, message: error.message };
    }
}

export default async function AddClassCodePage() {
    let result = { success: false, code: null, message: '' };

    const teacherRef = doc(db, 'teachers', TEACHER_UID);
    const teacherSnap = await getDoc(teacherRef);
    const existingCode = teacherSnap.exists() ? teacherSnap.data().classCode : null;

    if (existingCode) {
        result = { success: true, code: existingCode, message: 'You already have a class code:' };
    }

    return (
        <div className="flex min-h-screen w-full flex-col">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
                <Card className="w-full max-w-lg shadow-lg">
                    <CardHeader>
                        <CardTitle>Generate Your Class Code</CardTitle>
                        <CardDescription>
                           Click the button below to generate a unique Class Code for your account. You only need to do this once.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                       <form action={addClassCode}>
                            <Button type="submit" size="lg" disabled={!!existingCode}>
                                {existingCode ? "Code Already Generated" : "Generate My Code"}
                            </Button>
                        </form>
                         {existingCode && (
                            <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                                <p className="text-muted-foreground text-lg">{result.message}</p>
                                <p className="text-4xl font-bold font-mono text-primary mt-2">{result.code}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
