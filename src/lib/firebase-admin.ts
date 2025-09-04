
import { initializeApp, getApp, getApps, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// It's safe to call this multiple times; it will return the existing app instance
// on subsequent calls.
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // When running in a Google Cloud environment (like Cloud Run, App Engine, or
  // Firebase App Hosting), the GOOGLE_APPLICATION_CREDENTIALS environment variable
  // is automatically set. `credential.applicationDefault()` uses these credentials.
  const app = initializeApp({
    storageBucket: 'academy-heroes-mziuf.appspot.com',
  });

  return app;
}

// Initialize the app. This will be a singleton.
getFirebaseAdminApp();
