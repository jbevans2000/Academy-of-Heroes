
'use server';
/**
 * @fileOverview A secure, server-side flow for running a direct prompt against the Gemini model.
 * This is intended for admin debugging purposes.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export async function directPrompt(promptText: string): Promise<string> {
    if (!promptText) {
        return "Error: Prompt text cannot be empty.";
    }
    try {
        const response = await ai.generate({
            prompt: promptText,
            model: 'googleai/gemini-2.5-flash',
            output: {
                format: 'text',
            },
        });
        return response.text || "The model returned an empty response.";
    } catch (error: any) {
        console.error("Error in directPrompt flow:", error);
        return `An error occurred: ${error.message}`;
    }
}
