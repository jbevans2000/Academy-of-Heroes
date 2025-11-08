// src/lib/firebaseAdmin.ts
import type { App } from 'firebase-admin/app';
import { initializeApp, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const globalForAdmin = globalThis as unknown as { __ADMIN_APP__?: App };

let app: App | undefined = globalForAdmin.__ADMIN_APP__;

if (!app) {
  // Explicitly set the projectId to ensure the correct project is used.
  const options = {
    credential: applicationDefault(),
    projectId: 'academy-heroes-mziuf',
  };
  app = getApps().length ? getApp() : initializeApp(options);
  globalForAdmin.__ADMIN_APP__ = app;
}

// Export singletons
export const adminApp = app;
export const adminAuth = getAuth(adminApp);
