import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { dotprompt } from '@genkit-ai/dotprompt';

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

export const ai = configureGenkit({
  plugins: [
    dotprompt(),
    firebase(),
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  // For local development, we can log to the console.
  // In a production environment, this would be configured to export to a different system.
  logSinks: [
  ],
  enableTracing: true,
});
