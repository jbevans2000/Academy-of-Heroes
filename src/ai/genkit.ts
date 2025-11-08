
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { initializeApp } from 'firebase-admin/app';

// This will use the environment variable provided by next.config.ts OR the App Hosting secret.
if (!process.env.GEMINI_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'GEMINI_API_KEY environment variable is not set. Please set it in your App Hosting secrets.'
    );
  } else {
    // Soft error for local dev
    console.warn(
      'GEMINI_API_KEY environment variable is not set. AI features will not work.'
    );
  }
}

// Initialize the Firebase Admin App once.
// This is the source of truth for all server-side Firebase Admin operations.
export const adminApp = initializeApp();

export const ai = genkit({
  plugins: [
    firebase(), // Correctly initializes Firebase functions for Genkit
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
