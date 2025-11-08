// src/lib/firebaseAdmin.ts
import type { App } from 'firebase-admin/app';
import { initializeApp, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Optional: if you pass explicit credentials/options, put them here.
// const options: AppOptions = { credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)) };

const globalForAdmin = globalThis as unknown as { __ADMIN_APP__?: App };

// Prefer a global cache first (handles dev HMR / multiple module graphs)
let app: App | undefined = globalForAdmin.__ADMIN_APP__;

if (!app) {
  app = getApps().length ? getApp() : initializeApp({
        // Uses GCP/Firebase Studio service credentials automatically
        credential: applicationDefault(),
        // Optional but helps in some envs:
        projectId:
          process.env.GCLOUD_PROJECT ||
          process.env.FIREBASE_CONFIG?.projectId ||
          process.env.FIREBASE_PROJECT_ID,
      });
  globalForAdmin.__ADMIN_APP__ = app;
}

// Export singletons
export const adminApp = app;
export const adminAuth = getAuth(adminApp);
