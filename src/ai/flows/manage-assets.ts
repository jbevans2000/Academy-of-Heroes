
'use server';

import { getSignedUrl } from '@/lib/firebase-admin';

/**
 * A server action that can be called from client components
 * to securely get a signed URL for a private asset in Firebase Storage.
 * @param filePath The full path to the file in the bucket.
 * @returns A promise that resolves to the signed URL.
 */
export async function getSignedUrlForAsset(filePath: string): Promise<string> {
    try {
        const url = await getSignedUrl(filePath);
        return url;
    } catch (error) {
        console.error(`Failed to get signed URL for ${filePath}`, error);
        // In a real app, you might want more robust error handling,
        // but for now, we'll re-throw to let the client know.
        throw new Error('Could not generate secure URL for the asset.');
    }
}
