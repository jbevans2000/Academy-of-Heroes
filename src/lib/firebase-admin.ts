
import { initializeApp, getApp, getApps, type App } from 'firebase-admin/app';

// This function ensures that we initialize the Firebase Admin SDK only once.
// It's safe to call this multiple times; it will return the existing app instance
// on subsequent calls.
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // When running in a Google Cloud environment (like App Hosting), initializing
  // without arguments will automatically use the service account credentials
  // associated with the runtime environment. This is the most reliable method.
  const app = initializeApp();

  return app;
}
