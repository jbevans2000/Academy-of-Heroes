
'use server';
/**
 * @fileOverview A secure, server-side flow for generating a custom Firebase auth token
 * to allow a teacher to impersonate a student.
 * This file uses the Firebase Admin SDK.
 */
import { getAdminAuth } from '@/lib/firebaseAdmin';

interface ImpersonationResponse {
  success: boolean;
  customToken?: string;
  error?: string;
}

export async function impersonateStudent(studentUid: string, teacherUid: string): Promise<ImpersonationResponse> {
    if (!studentUid || !teacherUid) {
        return { success: false, error: "Student and Teacher UIDs are required." };
    }

    try {
        const adminAuth = getAdminAuth();
        
        // Add claims to the token so the client knows who is impersonating.
        const customToken = await adminAuth.createCustomToken(studentUid, {
            impersonating: true,
            original_uid: teacherUid,
        });

        return { success: true, customToken };

    } catch (error: any) {
        console.error("Error creating custom token for impersonation:", error);
        let errorMessage = 'Could not generate impersonation token.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'The student account to impersonate could not be found.';
        }
        return { success: false, error: errorMessage };
    }
}
