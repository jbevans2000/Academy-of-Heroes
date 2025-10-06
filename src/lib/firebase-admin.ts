
import { initializeApp, getApp, getApps, type App } from 'firebase-admin/app';

// It's safe to call this multiple times; it will return the existing app instance
// on subsequent calls.
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // When running in a Google Cloud environment (like App Hosting),
  // initializeApp() with no arguments will automatically use the
  // environment's service account credentials.
  return initializeApp();
}
