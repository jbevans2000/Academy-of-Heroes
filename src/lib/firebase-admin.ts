
import { initializeApp, getApp, getApps, type App, cert, type ServiceAccount } from 'firebase-admin/app';

// This function ensures that we initialize the Firebase Admin SDK only once.
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountKey = process.env.SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    // If running in a Google Cloud environment without the secret explicitly set,
    // initializeApp() can sometimes find default credentials.
    // However, the explicit method is more reliable.
    console.error("FATAL: SERVICE_ACCOUNT_KEY environment variable is not set.");
    console.log("Attempting to initialize with default credentials...");
    try {
        const app = initializeApp();
        return app;
    } catch (e) {
        console.error("Failed to initialize with default credentials.", e);
        throw new Error("Application is misconfigured. The SERVICE_ACCOUNT_KEY is missing and default credentials failed.");
    }
  }

  try {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
    const app = initializeApp({
      credential: cert(serviceAccount),
    });
    return app;
  } catch (e: any) {
    console.error("Failed to parse SERVICE_ACCOUNT_KEY or initialize Firebase Admin SDK.", e);
    throw new Error("The provided SERVICE_ACCOUNT_KEY is not valid JSON.");
  }
}
