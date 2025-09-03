
'use server';

import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, writeBatch, deleteDoc, serverTimestamp, query as firestoreQuery, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student, QuestHub, Chapter } from '@/lib/data';
import { logGameEvent } from '@/lib/gamelog';
import firebase from 'firebase/compat/app';

// --------- INTERFACES ---------

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface CountResponse extends ActionResponse {
    count?: number;
}

interface QuestSettings {
    globalApprovalRequired: boolean;
    isDailyLimitEnabled: boolean; // New setting
    studentOverrides?: {
        [studentUid: string]: boolean;
    };
}

interface CompleteChapterInput {
    teacherUid: string;
    studentUid: string;
    hubId: string;
    chapterId: string;
    quizScore?: number;
    quizAnswers?: any[];
}


interface ApproveChapterCompletionInput {
    teacherUid: string;
    requestId: string;
}

interface SetStudentQuestProgressInput {
    teacherUid: string;

    studentUids: string[];
    hubId: string;
    chapterNumber: number;
}

// --------- SETTINGS MANAGEMENT ---------

export async function getQuestSettings(teacherUid: string): Promise<QuestSettings> {
    const teacherRef = doc(db, 'teachers', teacherUid);
    const teacherSnap = await getDoc(teacherRef);
    if (teacherSnap.exists()) {
        const data = teacherSnap.data();
        return {
            globalApprovalRequired: data.questSettings?.globalApprovalRequired ?? false,
            isDailyLimitEnabled: data.questSettings?.isDailyLimitEnabled ?? true, // Default to true
            studentOverrides: data.questSettings?.studentOverrides || {},
        };
    }
    // Default settings if not found
    return { globalApprovalRequired: false, isDailyLimitEnabled: true, studentOverrides: {} };
}

export async function updateQuestSettings(teacherUid: string, newSettings: Partial<QuestSettings>): Promise<ActionResponse> {
    if (!teacherUid) return { success: false, error: 'User not authenticated.' };
    try {
        const teacherRef = doc(db, 'teachers', teacherUid);
        await setDoc(teacherRef, { questSettings: newSettings }, { merge: true });
        
        return { success: true, message: 'Quest settings updated.' };
    } catch (error: any) {
        console.error("Error updating quest settings:", error);
        return { success: false, error: error.message };
    }
}


// --------- REQUEST MANAGEMENT ---------

export async function completeChapter(input: CompleteChapterInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, hubId, chapterId, quizScore, quizAnswers } = input;
    if (!teacherUid || !studentUid || !hubId || !chapterId) return { success: false, error: 'Invalid input.' };

    try {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        const chapterRef = doc(db, 'teachers', teacherUid, 'chapters', chapterId);
        
        const questSettings = await getQuestSettings(teacherUid);

        const [studentSnap, chapterSnap] = await Promise.all([getDoc(studentRef), getDoc(chapterRef)]);

        if (!studentSnap.exists()) throw new Error("Student not found.");
        if (!chapterSnap.exists()) throw new Error("Chapter not found.");

        const student = studentSnap.data() as Student;
        const chapter = chapterSnap.data() as Chapter;

        // Daily Completion Limit Check (only if enabled)
        if (questSettings.isDailyLimitEnabled && student.lastChapterCompletion) {
            const lastCompletionDate = student.lastChapterCompletion.toDate();
            const now = new Date();
            const timeSinceCompletion = now.getTime() - lastCompletionDate.getTime();
            const hoursSinceCompletion = timeSinceCompletion / (1000 * 60 * 60);
            if (hoursSinceCompletion < 24) {
                return { success: false, error: 'You may only complete one chapter per day. Your next quest awaits tomorrow!' };
            }
        }
        
        const currentProgress = student.questProgress?.[hubId] || 0;
        if (chapter.chapterNumber !== currentProgress + 1) {
            return { success: false, error: "This chapter cannot be marked as complete yet. Complete the previous chapter first." };
        }

        // Check if approval is required
        const isGlobalApprovalOn = questSettings.globalApprovalRequired;
        const studentOverride = questSettings.studentOverrides?.[student.uid];
        
        let needsApproval = isGlobalApprovalOn;
        if (studentOverride !== undefined) {
            needsApproval = studentOverride; // Override takes precedence
        }

        if (needsApproval) {
            const requestsRef = collection(db, 'teachers', teacherUid, 'pendingQuestRequests');
            await addDoc(requestsRef, {
                studentUid,
                studentName: student.studentName,
                characterName: student.characterName,
                hubId: hubId,
                chapterId: chapterId,
                chapterNumber: chapter.chapterNumber,
                chapterTitle: chapter.title,
                quizScore,
                quizAnswers,
                requestedAt: serverTimestamp(),
            });
            return { success: true, message: 'Request sent for approval.' };
        }

        // --- If no approval needed, complete it directly ---
        const chaptersInHubQuery = firestoreQuery(collection(db, 'teachers', teacherUid, 'chapters'), where('hubId', '==', hubId));
        const totalChaptersInHub = (await getDocs(chaptersInHubQuery)).size;
        
        const newProgress = { ...student.questProgress, [hubId]: chapter.chapterNumber };
        const updates: any = {
            questProgress: newProgress,
            lastChapterCompletion: serverTimestamp() // Update the timestamp
        };

        if (chapter.chapterNumber === totalChaptersInHub) {
            const hubRef = doc(db, 'teachers', teacherUid, 'questHubs', hubId);
            const hubSnap = await getDoc(hubRef);
            if(hubSnap.exists()) {
                 const hub = hubSnap.data() as QuestHub;
                 if ((student.hubsCompleted || 0) < hub.hubOrder) {
                    updates.hubsCompleted = hub.hubOrder;
                }
            }
        }
        
        await updateDoc(studentRef, updates);
        await logGameEvent(teacherUid, 'CHAPTER', `${student.characterName} completed Chapter ${chapter.chapterNumber}: ${chapter.title}.`);

        return { success: true, message: `You have completed Chapter ${chapter.chapterNumber}: ${chapter.title}!` };

    } catch (error: any) {
        console.error("Error completing chapter:", error);
        return { success: false, error: error.message || "Failed to complete chapter." };
    }
}


async function approveSingleRequest(batch: firebase.firestore.WriteBatch, teacherUid: string, requestId: string, requestData: any) {
    const { studentUid, hubId, chapterNumber, chapterTitle } = requestData;
    const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        console.warn(`Student ${studentUid} not found for request ${requestId}. Skipping.`);
        return;
    }

    const studentData = studentSnap.data() as Student;
    const currentProgress = studentData.questProgress?.[hubId] || 0;

    // We only approve if this is the next sequential chapter.
    // This prevents issues if a teacher accidentally approves an old request.
    if (chapterNumber === currentProgress + 1) {
        const newProgress = { ...studentData.questProgress, [hubId]: chapterNumber };
        batch.update(studentRef, { 
            questProgress: newProgress,
            lastChapterCompletion: serverTimestamp() // Also update timestamp on approval
        });
        await logGameEvent(teacherUid, 'CHAPTER', `${studentData.characterName}'s completion of "${chapterTitle}" was approved.`);
    }

    const requestRef = doc(db, 'teachers', teacherUid, 'pendingQuestRequests', requestId);
    batch.delete(requestRef);
}

export async function approveChapterCompletion(input: ApproveChapterCompletionInput): Promise<ActionResponse> {
    const { teacherUid, requestId } = input;
    if (!teacherUid) return { success: false, error: 'User not authenticated.' };
    
    const requestRef = doc(db, 'teachers', teacherUid, 'pendingQuestRequests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) return { success: false, error: 'This request no longer exists.' };
    
    try {
        const batch = writeBatch(db);
        await approveSingleRequest(batch, teacherUid, requestId, requestSnap.data());
        await batch.commit();
        return { success: true, message: 'Quest completion approved!' };
    } catch (error: any) {
        console.error("Error approving request:", error);
        return { success: false, error: "Failed to approve the request." };
    }
}

export async function denyChapterCompletion(teacherUid: string, requestId: string): Promise<ActionResponse> {
    if (!teacherUid) return { success: false, error: 'User not authenticated.' };

    try {
        const requestRef = doc(db, 'teachers', teacherUid, 'pendingQuestRequests', requestId);
        await deleteDoc(requestRef);
        return { success: true, message: 'Request denied.' };
    } catch (error: any) {
        console.error("Error denying request:", error);
        return { success: false, error: "Failed to deny the request." };
    }
}

export async function approveAllPending(teacherUid: string): Promise<CountResponse> {
    if (!teacherUid) return { success: false, error: 'User not authenticated.' };

    const requestsRef = collection(db, 'teachers', teacherUid, 'pendingQuestRequests');
    const requestsSnapshot = await getDocs(requestsRef);

    if (requestsSnapshot.empty) {
        return { success: true, message: 'No pending requests to approve.', count: 0 };
    }
    
    try {
        const batch = writeBatch(db);
        for (const requestDoc of requestsSnapshot.docs) {
            await approveSingleRequest(batch, teacherUid, requestDoc.id, requestDoc.data());
        }
        await batch.commit();
        return { success: true, message: 'All pending requests approved.', count: requestsSnapshot.size };
    } catch (error: any) {
        console.error("Error approving all requests:", error);
        return { success: false, error: 'Failed to approve all requests.' };
    }
}

// --------- PROGRESS MANAGEMENT ---------

export async function setStudentQuestProgress(input: SetStudentQuestProgressInput): Promise<ActionResponse> {
    const { teacherUid, studentUids, hubId, chapterNumber } = input;
    if (!teacherUid || studentUids.length === 0 || !hubId || chapterNumber === undefined) {
        return { success: false, error: 'Invalid input provided.' };
    }

    const batch = writeBatch(db);
    try {
        // Fetch all hub and chapter data once
        const hubsRef = collection(db, 'teachers', teacherUid, 'questHubs');
        const chaptersRef = collection(db, 'teachers', teacherUid, 'chapters');
        const [hubsSnapshot, chaptersSnapshot] = await Promise.all([getDocs(hubsRef), getDocs(chaptersRef)]);
        
        const allHubs = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
        const allChapters = chaptersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));

        const targetHub = allHubs.find(h => h.id === hubId);
        if (!targetHub) throw new Error("Target hub not found.");

        const precedingHubs = allHubs.filter(h => h.hubOrder < targetHub.hubOrder);

        for (const studentUid of studentUids) {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
            const studentSnap = await getDoc(studentRef);
            if (!studentSnap.exists()) continue; // Skip if student doesn't exist

            const studentData = studentSnap.data() as Student;
            const newQuestProgress = { ...(studentData.questProgress || {}) };

            // Mark all chapters in preceding hubs as complete
            for (const hub of precedingHubs) {
                const chaptersInHub = allChapters.filter(c => c.hubId === hub.id);
                if (chaptersInHub.length > 0) {
                    newQuestProgress[hub.id] = chaptersInHub.length;
                }
            }

            // Set the progress for the target hub
            newQuestProgress[hubId] = chapterNumber > 0 ? chapterNumber - 1 : 0;
            
            const newHubsCompleted = Math.max(studentData.hubsCompleted || 0, targetHub.hubOrder -1);

            batch.update(studentRef, { 
                questProgress: newQuestProgress,
                hubsCompleted: newHubsCompleted
            });
        }
        
        await batch.commit();
        await logGameEvent(teacherUid, 'GAMEMASTER', `Set quest progress for ${studentUids.length} student(s) to Hub: ${targetHub.name}, Chapter: ${chapterNumber}.`);

        return { success: true };

    } catch (error: any) {
        console.error("Error setting student quest progress:", error);
        return { success: false, error: error.message || "Failed to update student progress." };
    }
}

// --------- HUB & CHAPTER DELETION ---------

interface DeleteHubInput {
    teacherUid: string;
    hubId: string;
}

export async function deleteQuestHub(input: DeleteHubInput): Promise<ActionResponse> {
    const { teacherUid, hubId } = input;
    if (!teacherUid || !hubId) {
        return { success: false, error: "Invalid input provided." };
    }

    const batch = writeBatch(db);

    try {
        // 1. Find and delete all chapters associated with this hub
        const chaptersQuery = firestoreQuery(collection(db, 'teachers', teacherUid, 'chapters'), where('hubId', '==', hubId));
        const chaptersSnapshot = await getDocs(chaptersQuery);
        
        if (!chaptersSnapshot.empty) {
            chaptersSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
        }

        // 2. Delete the hub itself
        const hubRef = doc(db, 'teachers', teacherUid, 'questHubs', hubId);
        batch.delete(hubRef);

        await batch.commit();
        
        await logGameEvent(teacherUid, 'GAMEMASTER', `Deleted Quest Hub with ID: ${hubId} and its ${chaptersSnapshot.size} chapter(s).`);

        return { success: true, message: 'Hub and all its chapters have been deleted.' };

    } catch (error: any) {
        console.error("Error deleting quest hub:", error);
        return { success: false, error: error.message || 'Failed to delete the quest hub.' };
    }
}
