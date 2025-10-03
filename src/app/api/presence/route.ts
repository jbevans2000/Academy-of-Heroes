
import { getFirebaseAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { teacherUid, studentUid, status } = await request.json();

    if (!teacherUid || !studentUid || !status) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // Initialize Firebase Admin SDK
    const adminApp = getFirebaseAdminApp();
    const db = getFirestore(adminApp);

    const presenceRef = doc(db, 'teachers', teacherUid, 'presence', 'online');

    await setDoc(presenceRef, {
        onlineStatus: {
            [studentUid]: {
                status: status,
                lastSeen: FieldValue.serverTimestamp(),
            }
        }
    }, { merge: true });

    return new NextResponse('Presence updated', { status: 200 });
  } catch (error: any) {
    console.error('Error in presence API:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
