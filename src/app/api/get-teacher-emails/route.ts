
import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
getFirebaseAdminApp();

export async function GET() {
  try {
    const auth = getAuth();
    const listUsersResult = await auth.listUsers(1000); // Fetches up to 1000 users

    // We can't directly filter by custom claims or other criteria here.
    // We will have to fetch all and then potentially filter if needed,
    // but for now, we'll assume most users with emails are teachers or admins.
    // A more robust solution might involve checking against a 'teachers' collection.
    const userEmails = listUsersResult.users.map(userRecord => {
      return {
        uid: userRecord.uid,
        email: userRecord.email,
      };
    });

    return NextResponse.json(userEmails);
  } catch (error: any) {
    console.error('Error fetching teacher emails:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
