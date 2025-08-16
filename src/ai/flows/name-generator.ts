
'use server';
/**
 * @fileOverview A flow for generating random, fantasy-themed character names.
 *
 * - generateName - A function that calls the AI to generate a name.
 * - NameInput - The input type for the generateName function.
 */
import '@/ai/genkit'; // Ensure Genkit is initialized
import {ai} from '@/ai/genkit';
import {z} from 'zod';

const NameInputSchema = z.object({
  gender: z.enum(['Male', 'Female', 'Non-binary']),
});
export type NameInput = z.infer<typeof NameInputSchema>;

const namePrompt = ai.definePrompt({
    name: 'namePrompt',
    input: { schema: NameInputSchema },
    prompt: `You are an expert in fantasy world-building. 
    
Generate a single, cool-sounding, fantasy-style character name.
{{#if isNonBinary}}
The name should be gender-neutral, not sounding distinctly male or female.
{{else}}
The name should be appropriate for a {{gender}} character.
{{/if}}

Do not provide any explanation or surrounding text. Only provide the name itself.
`,
});

export async function generateName(input: NameInput): Promise<string> {
  const isNonBinary = input.gender === 'Non-binary';

  const {text} = await namePrompt({
    ...input,
    isNonBinary,
  });
  return text;
}
