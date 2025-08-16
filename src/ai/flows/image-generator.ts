
'use server';
/**
 * @fileOverview A flow for generating a boss image and uploading it to Firebase Storage.
 * 
 * - generateAndUploadBossImage - A function that calls the AI to generate an image and then uploads it.
 * - ImageGeneratorInput - The input type for the function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase'; // Ensure Firebase app is initialized
import { v4 as uuidv4 } from 'uuid';

const ImageGeneratorInputSchema = z.object({
  prompt: z.string().describe('A text description of the boss image to generate.'),
});
export type ImageGeneratorInput = z.infer<typeof ImageGeneratorInputSchema>;

export async function generateAndUploadBossImage(input: ImageGeneratorInput): Promise<string> {
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

    const dataUri = media.url;

    // 2. Upload the generated image data URI to Firebase Storage
    const storage = getStorage(app);
    const imageId = uuidv4();
    const storageRef = ref(storage, `boss-images/${imageId}.png`);

    try {
        // Correctly handle the data URI on the server.
        // We need to extract the base64 part of the string for server-side uploads.
        const base64Data = dataUri.substring(dataUri.indexOf(',') + 1);
        
        await uploadString(storageRef, base64Data, 'base64');
        
        // 3. Get the public download URL for the uploaded image
        const downloadUrl = await getDownloadURL(storageRef);
        return downloadUrl;

    } catch (error: any) {
        console.error("Full Firebase Storage Error:", JSON.stringify(error, null, 2));
        throw new Error(`Failed to save the generated image. Firebase code: ${error.code}`);
    }
}
