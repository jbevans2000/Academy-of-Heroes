/**
 * SACROSANCT: DO NOT TOUCH
 * This file contains the working and tested Firebase Admin SDK initialization logic.
 * It is critical for server-side operations.
 * DO NOT MODIFY this file or any functions within it under any circumstances.
 */

'use server';
// src/lib/firebaseAdmin.ts
import type { App } from 'firebase-admin/app';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import serviceAccount from './firebase-admin-creds.json';

const globalForAdmin = globalThis as unknown as { __ADMIN_APP__?: App };

function getFirebaseAdminApp(): App {
    if (globalForAdmin.__ADMIN_APP__) {
        return globalForAdmin.__ADMIN_APP__;
    }

    const existingApps = getApps();
    if (existingApps.length > 0) {
        const existingApp = existingApps.find(app => app.name === '[DEFAULT]');
        if (existingApp) {
             globalForAdmin.__ADMIN_APP__ = existingApp;
             return existingApp;
        }
    }
    
    const newApp = initializeApp({
        credential: cert(serviceAccount),
    });

    console.log('Firebase Admin initialized successfully');
    globalForAdmin.__ADMIN_APP__ = newApp;
    return newApp;
}

function getAdminAuth(): Auth {
    return getAuth(getFirebaseAdminApp());
}

function getAdminDb(): Firestore {
    return getFirestore(getFirebaseAdminApp());
}

export { getFirebaseAdminApp, getAdminAuth, getAdminDb };
