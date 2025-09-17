
'use server';
/**
 * @fileOverview A secure, server-side flow for validating a class code.
 */
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ValidationResponse {
  isValid: boolean;
}

export async function validateClassCode(code: string): Promise<ValidationResponse> {
  if (!code || code.trim().length === 0) {
    return { isValid: false };
  }

  const uppercaseCode = code.toUpperCase();
  const teachersRef = collection(db, 'teachers');
  const q = query(teachersRef, where('classCode', '==', uppercaseCode), limit(1));
  
  try {
    const querySnapshot = await getDocs(q);
    return { isValid: !querySnapshot.empty };
  } catch (error) {
    console.error("Error validating class code:", error);
    // In case of a database error, we should fail closed for security.
    return { isValid: false };
  }
}
