
'use server';
/**
 * @fileOverview A flow for generating an image.
 * 
 * - generateImage - A function that calls the AI to generate an image and returns the data URI.
 * - ImageGeneratorInput - The input type for the function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ImageGeneratorInputSchema = z.object({
  prompt: z.string().describe('A text description of the image to generate.'),
});
export type ImageGeneratorInput = z.infer<typeof ImageGeneratorInputSchema>;

/**
 * Generates an image using an AI model and returns it as a data URI.
 * The client is then responsible for uploading this data to storage.
 * @param input The prompt for the image generation.
 * @returns A promise that resolves to the data URI (e.g., 'data:image/png;base64,...') of the generated image.
 */
export async function generateImage(input: ImageGeneratorInput): Promise<string> {
    const { prompt } = input;

    // 1. Generate the image using the specified model
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: prompt,
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    if (!media?.url) {
        throw new Error('AI did not return an image.');
    }

    // 2. Return the data URI directly to the client
    return media.url;
}
