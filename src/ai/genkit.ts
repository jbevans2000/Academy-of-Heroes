import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// THIS IS A TEMPORARY WORKAROUND FOR TESTING.
// Replace "YOUR_GEMINI_API_KEY" with your actual key.
// For production, you should use secrets.
const apyKey = "YOUR_GEMINI_API_KEY";

if (!apyKey || apyKey === "YOUR_GEMINI_API_KEY") {
  // This is not a perfect check, but it's better than nothing.
  // It will prevent the app from crashing if the key is not set.
  console.warn("GEMINI_API_KEY is not set in src/ai/genkit.ts. The AI features will not work.");
}

export const ai = genkit({
  plugins: [googleAI({apiKey: apyKey})],
  model: 'googleai/gemini-2.0-flash',
});
