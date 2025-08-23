
'use server';
/**
 * @fileOverview An AI flow for generating character names.
 * This file should use the Genkit AI library.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const NameInputSchema = z.object({
  class: z.string().describe('The character class (e.g., Mage, Guardian, Healer)'),
});

const NameOutputSchema = z.object({
  name: z.string().describe('A single, creative character name.'),
});

const nameGenerationPrompt = ai.definePrompt({
    name: 'nameGenerationPrompt',
    input: { schema: NameInputSchema },
    output: { schema: NameOutputSchema },
    prompt: `Generate a single, cool, and creative fantasy character name suitable for a {{{class}}}. Ensure the name is unique and fits the fantasy genre. Do not provide more than one name.`,
});


export async function generateName(characterClass: string): Promise<string> {
    try {
        const { output } = await nameGenerationPrompt({ class: characterClass });
        return output?.name || `Heroic ${characterClass}`;
    } catch (error) {
        console.error("Error generating name:", error);
        // Provide a fallback name on error
        return `Brave ${characterClass}`;
    }
}
