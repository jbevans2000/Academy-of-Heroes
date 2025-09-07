
import { NextResponse } from 'next/server';
import { getSignedUrl } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    const signedUrl = await getSignedUrl(filePath);

    return NextResponse.json({ url: signedUrl });
  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL.' }, { status: 500 });
  }
}

    