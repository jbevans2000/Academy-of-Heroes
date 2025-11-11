// src/lib/firebaseAdmin.ts
import type { App } from 'firebase-admin/app';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const globalForAdmin = globalThis as unknown as { __ADMIN_APP__?: App };

function getFirebaseAdminApp() {
    if (globalForAdmin.__ADMIN_APP__) {
        return globalForAdmin.__ADMIN_APP__;
    }

    // Check if any apps are already initialized to prevent re-initialization.
    if (getApps().length > 0) {
        const existingApp = getApps().find(app => app.name === '[DEFAULT]');
        if (existingApp) {
             globalForAdmin.__ADMIN_APP__ = existingApp;
             return existingApp;
        }
    }
    
    // In App Hosting, the SDK will automatically use the provisioned
    // service account when initialized without explicit credentials.
    const newApp = initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });

    globalForAdmin.__ADMIN_APP__ = newApp;
    return newApp;
}


const adminApp = getFirebaseAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb, getFirebaseAdminApp };
