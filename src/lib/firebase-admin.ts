import { initializeApp, getApp, getApps, type App, cert, type ServiceAccount } from 'firebase-admin/app';

// This function ensures that we initialize the Firebase Admin SDK only once.
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountKey = process.env.SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    // This will be logged in the App Hosting logs if the secret is not set.
    console.error("FATAL: SERVICE_ACCOUNT_KEY environment variable is not set. The application will not have administrative privileges.");
    throw new Error("Application is misconfigured. The SERVICE_ACCOUNT_KEY is missing.");
  }

  try {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
    const app = initializeApp({
      credential: cert(serviceAccount),
    });
    return app;
  } catch (e: any) {
    console.error("Failed to parse SERVICE_ACCOUNT_KEY or initialize Firebase Admin SDK.", e);
    // This provides a more specific error in the logs if the JSON is malformed.
    throw new Error("The provided SERVICE_ACCOUNT_KEY is not valid JSON.");
  }
}
