import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function downloadCsv(data: any[][], headers: string[], filename: string) {
  const csvRows = [
    headers.join(','), // header row
    ...data.map(row => row.join(',')) // data rows
  ];

  const csvString = csvRows.join('\\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Finds the teacher UID for a given student UID by searching through all teachers.
 * This is inefficient and not recommended for production at scale, but is
 * suitable for this specific application's architecture.
 * @param studentUid The UID of the student to find.
 * @returns The UID of the teacher if found, otherwise null.
 */
export const findTeacherForStudent = async (studentUid: string): Promise<string | null> => {
    const teachersRef = collection(db, 'teachers');
    const teacherSnapshot = await getDocs(teachersRef);

    for (const teacherDoc of teacherSnapshot.docs) {
      const studentDocRef = doc(db, 'teachers', teacherDoc.id, 'students', studentUid);
      const studentSnap = await getDoc(studentDocRef);
      if (studentSnap.exists()) {
        return teacherDoc.id;
      }
    }
    return null;
}
