
import { initializeApp, getApp, getApps, type App, cert } from 'firebase-admin/app';

// It's safe to call this multiple times; it will return the existing app instance
// on subsequent calls.
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // If you have a service account JSON file, you can use it like this:
  // const serviceAccount = require("./path/to/your/serviceAccountKey.json");
  // credential: cert(serviceAccount)

  return initializeApp();
}
