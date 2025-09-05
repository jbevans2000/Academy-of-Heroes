
'use server';

import { getStorage } from 'firebase-admin/storage';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

interface SaveAvatarInput {
  teacherUid: string;
  studentUid: string;
  imageDataUrl: string;
}

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  newAvatarUrl?: string;
}

export async function saveCustomAvatar(input: SaveAvatarInput): Promise<ActionResponse> {
  const { teacherUid, studentUid, imageDataUrl } = input;
  if (!teacherUid || !studentUid || !imageDataUrl) {
    return { success: false, error: 'Invalid input provided.' };
  }

  try {
    const adminApp = getFirebaseAdminApp();
    const storage = getStorage(adminApp);
    // Explicitly specify the bucket name when calling .bucket()
    const bucketName = 'academy-heroes-mziuf.appspot.com';
    const bucket = storage.bucket(bucketName);
    
    // Convert data URL to a buffer
    const base64Data = imageDataUrl.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Define storage path. The UUID ensures that if a user saves multiple times, they don't overwrite
    // the same file, preventing potential caching issues.
    const imagePath = `custom-avatars/${teacherUid}/${studentUid}/${uuidv4()}.png`;
    const file = bucket.file(imagePath);

    // Upload the image buffer to Cloud Storage
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
      },
    });
    
    // Make the file public to get a downloadable URL
    // Note: For stricter security, you might use signed URLs, but public URLs are common for avatars.
    await file.makePublic();
    const downloadUrl = file.publicUrl();

    // Update the student's document in Firestore with the new avatar URL
    const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
    await updateDoc(studentRef, {
        avatarUrl: downloadUrl,
        useCustomAvatar: true, // Set the flag to indicate a custom avatar is in use
    });
    
    return { 
        success: true, 
        message: 'Custom avatar has been set!',
        newAvatarUrl: downloadUrl
    };

  } catch (error: any) {
    console.error("Error saving custom avatar:", error);
    return { success: false, error: error.message || 'An unexpected error occurred while saving the avatar.' };
  }
}
