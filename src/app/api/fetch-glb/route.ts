
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');

  if (!fileUrl) {
    return new NextResponse('Missing file URL', { status: 400 });
  }

  try {
    // Fetch the file from Firebase Storage on the server-side
    const response = await fetch(fileUrl);

    if (!response.ok) {
      // Pass through the error from Firebase Storage
      return new NextResponse(response.statusText, { status: response.status });
    }

    // Get the file content as a ReadableStream
    const body = response.body;

    // Create a new response to stream back to the client,
    // preserving the original content type.
    const headers = new Headers({
      'Content-Type': response.headers.get('Content-Type') || 'model/gltf-binary',
    });
    
    return new NextResponse(body, { status: 200, headers });

  } catch (error: any) {
    console.error('API Fetch Error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
