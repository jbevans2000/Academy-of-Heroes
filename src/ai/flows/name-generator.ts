
'use server';
/**
 * @fileOverview An AI flow for generating character names.
 * This file should use the Genkit AI library.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const nameGenerationPrompt = ai.definePrompt({
    name: 'nameGenerationPrompt',
    prompt: `Generate a single, cool, and creative fantasy character name. Ensure the name is unique and fits the fantasy genre. Do not provide more than one name. Do not add any extra formatting or quotation marks.`,
});


export async function generateName(): Promise<string> {
    try {
        const { output } = await nameGenerationPrompt();
        // Return a fallback name if the model returns an empty string or null
        return output || 'Heroic Adventurer';
    } catch (error) {
        console.error("Error generating name:", error);
        // Provide a fallback name on error
        return 'Brave Hero';
    }
}
