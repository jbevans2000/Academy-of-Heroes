
'use server';

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


/**
 * Generates a signed URL for a file in Firebase Storage.
 * This URL is temporary and grants access to the file for a limited time.
 * @param filePath The full path to the file in your bucket (e.g., 'test-models/user-id/file.glb').
 * @returns A promise that resolves with the signed URL string.
 */
export async function getSignedUrl(filePath: string): Promise<string> {
    const bucket = getStorage().bucket();
    const file = bucket.file(filePath);

    const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const [url] = await file.getSignedUrl(options);
    return url;
}
