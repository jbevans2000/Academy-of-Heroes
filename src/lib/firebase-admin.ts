
import { initializeApp, getApp, getApps, type App, applicationDefault } from 'firebase-admin/app';

// It's safe to call this multiple times; it will return the existing app instance
// on subsequent calls.
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // Explicitly use the Application Default Credentials provided by the
  // App Hosting environment and specify the correct storage bucket.
  const app = initializeApp({
    credential: applicationDefault(),
    storageBucket: 'academy-heroes-mziuf.firebasestorage.app'
  });

  return app;
}

// Initialize the app. This will be a singleton.
getFirebaseAdminApp();
