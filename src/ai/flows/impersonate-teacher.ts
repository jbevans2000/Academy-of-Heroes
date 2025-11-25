
'use server';
/**
 * @fileOverview A secure, server-side flow for generating a custom Firebase auth token
 * to allow an admin to impersonate a teacher.
 * This file uses the Firebase Admin SDK.
 */
import { getAdminAuth } from '@/lib/firebaseAdmin';

interface ImpersonationResponse {
  success: boolean;
  customToken?: string;
  error?: string;
}

export async function impersonateTeacher(teacherUid: string, adminUid: string): Promise<ImpersonationResponse> {
    if (!teacherUid || !adminUid) {
        return { success: false, error: "Teacher and Admin UIDs are required." };
    }

    try {
        const adminAuth = getAdminAuth();
        
        // Add claims to the token so the client knows an admin is impersonating.
        const customToken = await adminAuth.createCustomToken(teacherUid, {
            impersonating: 'admin',
            original_uid: adminUid,
        });

        return { success: true, customToken };

    } catch (error: any) {
        console.error("Error creating custom token for teacher impersonation:", error);
        let errorMessage = 'Could not generate impersonation token.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'The teacher account to impersonate could not be found.';
        }
        return { success: false, error: errorMessage };
    }
}
