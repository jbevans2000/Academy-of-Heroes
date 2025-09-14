import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
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
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
