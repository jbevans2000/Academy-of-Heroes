import { initializeApp, getApp, getApps, type App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// It's safe to call this multiple times; it will return the existing app instance
// on subsequent calls.
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // When running in a Google Cloud environment (like Cloud Run or App Hosting),
  // a parameter-less initializeApp() automatically uses the
  // default credentials of the service account associated with the resource.
  const app = initializeApp();

  return app;
}

// Initialize the app. This will be a singleton.
getFirebaseAdminApp();
