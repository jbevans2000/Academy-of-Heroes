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

    if (getApps().length > 0) {
        const existingApp = getApps()[0];
        if (existingApp) {
             globalForAdmin.__ADMIN_APP__ = existingApp;
             return existingApp;
        }
    }
    
    let serviceAccount;
    try {
        if (process.env.SERVICE_ACCOUNT_KEY) {
            serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
        } else {
             // Fallback for local development if firebase-service-account.json exists
             serviceAccount = require('../../../firebase-service-account.json');
        }
    } catch (e) {
        console.error("Service account key not found or invalid. Please ensure SERVICE_ACCOUNT_KEY secret is set in production, or firebase-service-account.json exists for local dev.");
        throw new Error("Firebase Admin SDK initialization failed: Service Account credentials are not available.");
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
