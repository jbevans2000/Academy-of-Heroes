
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This will use the environment variable provided by next.config.ts
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY environment variable is not set. AI features may not work.");
}

export const ai = genkit({
  plugins: [googleAI({apiKey: apiKey})],
  model: 'googleai/gemini-2.0-flash',
});
