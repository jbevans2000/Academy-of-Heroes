
import { NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/lib/firebase-admin';

// This API route uses the initialized adminApp directly.

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required.' }, { status: 400 });
    }

    // Explicitly use the initialized adminApp instance
    const bucket = getStorage(adminApp).bucket('academy-heroes-mziuf.firebasestorage.app');
    const file = bucket.file(filePath);

    // Set the expiration date for the signed URL.
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 15);

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: expiration,
    });
    
    return NextResponse.json({ signedUrl });

  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL.', details: error.message }, { status: 500 });
  }
}
