
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
    
    let serviceAccount;
    // In a deployed environment (like App Hosting), the secret will be in process.env
    if (process.env.SERVICE_ACCOUNT_KEY) {
        serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
    } else {
        // Fallback for local development if the JSON file exists.
        try {
             serviceAccount = require('../../../firebase-service-account.json');
        } catch (e) {
            console.error(
                "Service account key not found. " +
                "For local development, ensure 'firebase-service-account.json' is in the root directory. " +
                "For production, ensure the 'SERVICE_ACCOUNT_KEY' secret is set."
            );
            throw new Error("Firebase Admin SDK initialization failed: Service Account credentials are not available.");
        }
    }
    
    // Check if any apps are already initialized to prevent re-initialization.
    if (getApps().length > 0) {
        const existingApp = getApps().find(app => app.name === '[DEFAULT]');
        if (existingApp) {
             globalForAdmin.__ADMIN_APP__ = existingApp;
             return existingApp;
        }
    }
    
    const newApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });

    globalForAdmin.__ADMIN_APP__ = newApp;
    return newApp;
}


const adminApp = getFirebaseAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb, getFirebaseAdminApp };
