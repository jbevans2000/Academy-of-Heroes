
'use server';

import { collection, doc, addDoc, getDocs, writeBatch, query, where, serverTimestamp, getDoc, runTransaction, increment, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { QuestHub, Chapter, LibraryHub, LibraryChapter } from '@/lib/quests';
import { v4 as uuidv4 } from 'uuid';

interface ImportHubInput {
  teacherUid: string;
  libraryHubId: string;
}

interface ImportHubResponse {
  success: boolean;
  hubName?: string;
  error?: string;
}

export async function importHub(input: ImportHubInput): Promise<ImportHubResponse> {
  const { teacherUid, libraryHubId } = input;
  if (!teacherUid || !libraryHubId) {
    return { success: false, error: "Invalid input." };
  }

  try {
    const hubName = await runTransaction(db, async (transaction) => {
        const libraryHubRef = doc(db, 'library_hubs', libraryHubId);
        const libraryHubSnap = await transaction.get(libraryHubRef);

        if (!libraryHubSnap.exists()) {
            throw new Error("Shared hub not found in the library.");
        }

        const libraryHubData = libraryHubSnap.data() as LibraryHub;

        // Check for conflicts
        const teacherHubsRef = collection(db, 'teachers', teacherUid, 'questHubs');
        const nameConflictQuery = query(teacherHubsRef, where('name', '==', libraryHubData.name));
        const nameConflictSnap = await getDocs(nameConflictQuery);
        if (!nameConflictSnap.empty) {
            throw new Error(`You already have a hub named "${libraryHubData.name}". Please rename it before importing.`);
        }

        const orderConflictQuery = query(teacherHubsRef, where('hubOrder', '==', libraryHubData.hubOrder));
        const orderConflictSnap = await getDocs(orderConflictQuery);

        let newHubOrder = libraryHubData.hubOrder;
        // Avoid order conflicts only for standard hubs
        if (libraryHubData.hubType !== 'sidequest' && !orderConflictSnap.empty) {
            // Find the highest current order and add 1
            const allHubsSnap = await getDocs(query(teacherHubsRef, orderBy('hubOrder', 'desc'), limit(1)));
            const highestOrder = allHubsSnap.empty ? 0 : allHubsSnap.docs[0].data().hubOrder;
            newHubOrder = highestOrder + 1;
        }

        // 1. Create the new QuestHub for the teacher
        const newQuestHubRef = doc(collection(db, 'teachers', teacherUid, 'questHubs'));
        const newHubData: Omit<QuestHub, 'id'> = {
            name: libraryHubData.name,
            worldMapUrl: libraryHubData.worldMapUrl,
            coordinates: libraryHubData.coordinates,
            hubOrder: newHubOrder,
            storySummary: libraryHubData.storySummary || '', // Ensure storySummary is not undefined
            areRewardsEnabled: false, // Default to off for imported quests
            isVisibleToAll: true,
            isActive: false, // Default to inactive so teacher can review
            hubType: libraryHubData.hubType || 'standard', // Fallback to 'standard' if hubType is missing
        };
        transaction.set(newQuestHubRef, newHubData);

        // 2. Find and copy all associated chapters
        const libraryChaptersQuery = query(collection(db, 'library_chapters'), where('libraryHubId', '==', libraryHubId));
        const libraryChaptersSnap = await getDocs(libraryChaptersQuery);

        for (const chapterDoc of libraryChaptersSnap.docs) {
            const libraryChapterData = chapterDoc.data() as LibraryChapter;
            
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { originalChapterId, originalTeacherId, libraryHubId, ...chapterDataToCopy } = libraryChapterData;

            const newChapterRef = doc(collection(db, 'teachers', teacherUid, 'chapters'));
            const newChapterData: Omit<Chapter, 'id'> = {
                ...chapterDataToCopy,
                hubId: newQuestHubRef.id,
                createdAt: serverTimestamp(),
                isActive: false, // Default chapters to inactive as well
            };
            transaction.set(newChapterRef, newChapterData);
        }

        // 3. Increment the import count on the library hub
        transaction.update(libraryHubRef, {
            importCount: increment(1)
        });

        return libraryHubData.name;
    });

    return { success: true, hubName };

  } catch (error: any) {
    console.error("Error importing hub:", error);
    return { success: false, error: error.message || "An unknown error occurred during import." };
  }
}
