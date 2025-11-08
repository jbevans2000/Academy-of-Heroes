
import { adminApp } from '@/ai/genkit';
import { type App } from 'firebase-admin/app';

/**
 * Provides the singleton instance of the Firebase Admin App, initialized in genkit.ts.
 * @returns {App} The initialized Firebase Admin App.
 */
export function getFirebaseAdminApp(): App {
  return adminApp;
}
