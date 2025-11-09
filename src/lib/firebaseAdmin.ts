// src/lib/firebaseAdmin.ts
import type { App } from 'firebase-admin/app';
import { initializeApp, getApps, getApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const globalForAdmin = globalThis as unknown as { __ADMIN_APP__?: App };

let app: App | undefined = globalForAdmin.__ADMIN_APP__;

if (!app) {
  // Prefer a secret (JSON key) if provided; otherwise use ADC.
  // Either way, PIN the projectId to your Firebase project.
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID;

    app = getApps().length
      ? getApp()
      : initializeApp({
          credential: applicationDefault(),
          projectId, // <<— pin
        });
  }

  globalForAdmin.__ADMIN_APP__ = app;


export const adminApp = app!;
export const adminAuth = getAuth(adminApp);
