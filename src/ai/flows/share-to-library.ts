
'use server';

import { collection, doc, addDoc, getDocs, writeBatch, query, where, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { QuestHub, Chapter, LibraryHub, LibraryChapter } from '@/lib/quests';

interface ShareHubsInput {
    teacherUid: string;
    hubIds: string[];
    subject: string;
    gradeLevels: string[]; // Changed from gradeLevel
    tags: string[];
    sagaType: 'standalone' | 'ongoing';
    description: string;
    sagaName?: string;
}

interface ShareHubsResponse {
    success: boolean;
    sharedCount?: number;
    error?: string;
}

export async function shareHubsToLibrary(input: ShareHubsInput): Promise<ShareHubsResponse> {
    const { teacherUid, hubIds, subject, gradeLevels, tags, sagaType, description, sagaName } = input;
    if (!teacherUid || hubIds.length === 0) {
        return { success: false, error: "Invalid input." };
    }
    
    let sharedCount = 0;

    try {
        const batch = writeBatch(db);
        const teacherRef = doc(db, 'teachers', teacherUid);
        const teacherSnap = await getDoc(teacherRef);
        const teacherData = teacherSnap.exists() ? teacherSnap.data() : null;
        const teacherName = teacherData?.name || 'Anonymous Teacher';
        const teacherAvatar = teacherData?.avatarUrl || '';

        for (const hubId of hubIds) {
            const hubRef = doc(db, 'teachers', teacherUid, 'questHubs', hubId);
            const hubSnap = await getDoc(hubRef);
            if (!hubSnap.exists()) continue;

            const hubData = hubSnap.data() as QuestHub;

            // 1. Create Library Hub document
            const newLibraryHubRef = doc(collection(db, 'library_hubs'));
            const libraryHubData: Omit<LibraryHub, 'id'> = {
                originalHubId: hubId,
                originalTeacherId: teacherUid,
                originalTeacherName: teacherName,
                originalTeacherAvatarUrl: teacherAvatar,
                name: hubData.name,
                worldMapUrl: hubData.worldMapUrl,
                coordinates: { x: 50, y: 50 }, // Use default coordinates for library view
                hubOrder: 0, // Not relevant for library
                storySummary: '', // Can be generated later
                subject,
                gradeLevels, // Changed from gradeLevel
                tags,
                sagaType,
                sagaName: sagaType === 'ongoing' ? sagaName : '',
                description,
                importCount: 0,
                createdAt: serverTimestamp(),
            };
            batch.set(newLibraryHubRef, libraryHubData);

            // 2. Find and copy all chapters for this hub
            const chaptersQuery = query(collection(db, 'teachers', teacherUid, 'chapters'), where('hubId', '==', hubId));
            const chaptersSnapshot = await getDocs(chaptersQuery);

            for (const chapterDoc of chaptersSnapshot.docs) {
                const chapterData = chapterDoc.data() as Chapter;
                const newLibraryChapterRef = doc(collection(db, 'library_chapters'));
                
                const libraryChapterData: Omit<LibraryChapter, 'id'> = {
                    ...chapterData,
                    libraryHubId: newLibraryHubRef.id,
                    originalChapterId: chapterDoc.id,
                    originalTeacherId: teacherUid,
                    createdAt: serverTimestamp(),
                };
                batch.set(newLibraryChapterRef, libraryChapterData);
            }
            sharedCount++;
        }
        
        await batch.commit();

        return { success: true, sharedCount };

    } catch (error: any) {
        console.error("Error sharing hubs to library:", error);
        return { success: false, error: error.message || "An unknown error occurred while sharing." };
    }
}


interface UnshareHubInput {
    teacherUid: string;
    hubId: string; // This is the ID of the document in `library_hubs`
}

interface UnshareHubResponse {
    success: boolean;
    error?: string;
}

export async function unshareHubFromLibrary(input: UnshareHubInput): Promise<UnshareHubResponse> {
    const { teacherUid, hubId } = input;
    if (!teacherUid || !hubId) {
        return { success: false, error: "Invalid input provided." };
    }
    
    try {
        const hubRef = doc(db, 'library_hubs', hubId);
        const hubSnap = await getDoc(hubRef);

        if (!hubSnap.exists()) {
            return { success: false, error: "The shared hub could not be found." };
        }

        const hubData = hubSnap.data() as LibraryHub;
        if (hubData.originalTeacherId !== teacherUid) {
            return { success: false, error: "You are not authorized to delete this hub." };
        }

        const batch = writeBatch(db);

        // Find and delete all associated chapters in the library
        const chaptersQuery = query(collection(db, 'library_chapters'), where('libraryHubId', '==', hubId));
        const chaptersSnapshot = await getDocs(chaptersQuery);

        chaptersSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete the main library hub document
        batch.delete(hubRef);

        await batch.commit();

        return { success: true };

    } catch (error: any) {
        console.error("Error unsharing hub from library:", error);
        return { success: false, error: error.message || "Could not remove the hub from the library." };
    }
}
