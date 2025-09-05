
import { initializeApp, getApp, getApps, type App } from 'firebase-admin/app';

// It's safe to call this multiple times; it will return the existing app instance
// on subsequent calls.
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // Use the simplest initialization. The environment should provide the credentials.
  const app = initializeApp();

  return app;
}

// Initialize the app. This will be a singleton.
getFirebaseAdminApp();
