// src/lib/firebaseAdmin.ts
import type { App } from 'firebase-admin/app';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const globalForAdmin = globalThis as unknown as { __ADMIN_APP__?: App };

let app: App | undefined = globalForAdmin.__ADMIN_APP__;
let adminDb: ReturnType<typeof getFirestore> | undefined;

if (process.env.NODE_ENV === 'production' && !globalForAdmin.__ADMIN_APP__) {
  const serviceAccount = JSON.parse(
    process.env.SERVICE_ACCOUNT_KEY as string
  );
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
  globalForAdmin.__ADMIN_APP__ = app;
} else if (process.env.NODE_ENV !== 'production') {
  if (!globalForAdmin.__ADMIN_APP__) {
    try {
      const serviceAccount = require('../../../firebase-service-account.json');
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
      });
      globalForAdmin.__ADMIN_APP__ = app;
    } catch (e) {
      console.error(
        'Could not load firebase-service-account.json. Please ensure you have this file for local development.'
      );
    }
  } else {
    app = globalForAdmin.__ADMIN_APP__;
  }
}

const adminApp = app!;
const adminAuth = getAuth(adminApp);
adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb };
