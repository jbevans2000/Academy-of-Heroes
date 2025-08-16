import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// THIS IS A TEMPORARY WORKAROUND FOR TESTING.
// Replace "YOUR_GEMINI_API_KEY" with your actual key.
// For production, you should use secrets.
const apyKey = "YOUR_GEMINI_API_KEY" || process.env.GEMINI_API_KEY;

if (!apyKey) {
  throw new Error("GEMINI_API_KEY is not set.");
}

export const ai = genkit({
  plugins: [googleAI({apiKey: apyKey})],
  model: 'googleai/gemini-2.0-flash',
});
