
import { initializeApp, getApp, getApps, type App, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';


// It's safe to call this multiple times; it will return the existing app instance
// on subsequent calls.
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // Use the simplest initialization. The environment should provide the credentials.
  const app = initializeApp({
    credential: applicationDefault(),
    storageBucket: 'academy-heroes-mziuf.firebasestorage.app'
  });

  return app;
}

// Initialize the app. This will be a singleton.
getFirebaseAdminApp();
