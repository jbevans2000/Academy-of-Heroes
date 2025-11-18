/**
 * SACROSANCT: DO NOT TOUCH
 * This file uses the Firebase Admin SDK and its logic has been confirmed to be correct.
 * DO NOT MODIFY this file or any functions within it under any circumstances.
 */

'use server';
/**
 * @fileOverview A server-side flow specifically for testing and diagnosing the Firebase Admin SDK initialization.
 */

import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

interface TestResult {
    success: boolean;
    message: string;
    diagnostics?: any;
    appName?: string;
    projectId?: string | null;
    error?: string;
    stack?: string;
}

export async function testAdminSdkInitialization(): Promise<TestResult> {
    try {
        const diagnostics = {
            nodeEnv: process.env.NODE_ENV,
            hasGoogleCloudProject: !!process.env.GOOGLE_CLOUD_PROJECT,
            googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
            hasServiceAccountKey: !!process.env.SERVICE_ACCOUNT_KEY,
            serviceAccountKeyLength: process.env.SERVICE_ACCOUNT_KEY?.length,
            hasGcloudProject: !!process.env.GCLOUD_PROJECT,
            gcloudProject: process.env.GCLOUD_PROJECT,
            hasFirebaseConfig: !!process.env.FIREBASE_CONFIG,
            allEnvKeys: Object.keys(process.env).filter(key => 
                key.includes('GOOGLE') || key.includes('FIREBASE') || key.includes('GCLOUD')
            ),
        };
        
        console.log('Environment diagnostics:', diagnostics);

        // Now try to initialize
        const app = getFirebaseAdminApp();
        
        return {
            success: true,
            message: "Firebase Admin SDK initialization was successful.",
            diagnostics,
            appName: app.name,
            projectId: app.options.projectId || 'Not Found',
        };
    } catch (error: any) {
        const diagnostics = {
            nodeEnv: process.env.NODE_ENV,
            hasGoogleCloudProject: !!process.env.GOOGLE_CLOUD_PROJECT,
            googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
            hasServiceAccountKey: !!process.env.SERVICE_ACCOUNT_KEY,
            serviceAccountKeyLength: process.env.SERVICE_ACCOUNT_KEY?.length,
        };

        console.error("CRITICAL: Firebase Admin SDK initialization test failed.", error);

        return {
            success: false,
            message: 'Firebase Admin SDK initialization FAILED.',
            diagnostics,
            projectId: 'Not Found',
            error: `Code: ${error.code}, Message: ${error.message}`,
            stack: error.stack,
        };
    }
}
