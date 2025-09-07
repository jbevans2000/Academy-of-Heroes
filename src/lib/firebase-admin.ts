
import { initializeApp, getApp, getApps, type App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';


// It's safe to call this multiple times; it will return the existing app instance
// on subsequent calls.
function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // Explicitly initialize with the project ID to avoid environment issues.
  const app = initializeApp({
    projectId: 'academy-heroes-mziuf',
    storageBucket: 'academy-heroes-mziuf.firebasestorage.app'
  });

  return app;
}

// Initialize the app and export the instance directly.
export const adminApp = initializeAdminApp();
