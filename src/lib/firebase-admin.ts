
import { initializeApp, getApp, getApps, type App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// This function ensures that we initialize the Firebase Admin SDK only once.
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
    credential: credential.applicationDefault(),
    // The databaseURL is required for the Realtime Database, but it's good practice
    // to include the storageBucket for Storage operations as well.
    // The project ID is usually inferred from the environment.
    storageBucket: "academy-heroes-mziuf.appspot.com",
  });

  return app;
}
