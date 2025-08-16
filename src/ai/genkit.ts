
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This will use the environment variable provided by next.config.ts OR the App Hosting secret.
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // This log will appear in the Firebase App Hosting logs if the key is not available.
  console.error("FATAL: GEMINI_API_KEY environment variable is not set or not accessible by the App Hosting service account.");
  throw new Error("Application is misconfigured. The GEMINI_API_KEY is missing.");
}

export const ai = genkit({
  plugins: [googleAI({apiKey: apiKey})],
  model: 'googleai/gemini-2.0-flash',
});
