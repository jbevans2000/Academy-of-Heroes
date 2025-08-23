
'use server';

import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, writeBatch, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/data';
import { logGameEvent } from '@/lib/gamelog';

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
    studentOverrides?: {
        [studentUid: string]: boolean;
    };
}

interface RequestChapterCompletionInput {
    teacherUid: string;
    studentUid: string;
    studentName: string;
    characterName: string;
    hubId: string;
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
}

interface ApproveChapterCompletionInput {
    teacherUid: string;
    requestId: string;
}

// --------- SETTINGS MANAGEMENT ---------

export async function getQuestSettings(teacherUid: string): Promise<QuestSettings> {
    const teacherRef = doc(db, 'teachers', teacherUid);
    const teacherSnap = await getDoc(teacherRef);
    if (teacherSnap.exists()) {
        const data = teacherSnap.data();
        return {
            globalApprovalRequired: data.questSettings?.globalApprovalRequired ?? false,
            studentOverrides: data.questSettings?.studentOverrides || {},
        };
    }
    // Default settings if not found
    return { globalApprovalRequired: false, studentOverrides: {} };
}

export async function updateQuestSettings(teacherUid: string, newSettings: Partial<QuestSettings>): Promise<ActionResponse> {
    if (!teacherUid) return { success: false, error: 'User not authenticated.' };
    try {
        const teacherRef = doc(db, 'teachers', teacherUid);
        await setDoc(teacherRef, { questSettings: newSettings }, { merge: true });

        // Update individual student documents if studentOverrides are being set
        if (newSettings.studentOverrides !== undefined) {
            const batch = writeBatch(db);
            for (const [studentUid, approvalRequired] of Object.entries(newSettings.studentOverrides)) {
                const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
                batch.update(studentRef, { questApprovalRequired: approvalRequired });
            }
            await batch.commit();
        }

        return { success: true, message: 'Quest settings updated.' };
    } catch (error: any) {
        console.error("Error updating quest settings:", error);
        return { success: false, error: error.message };
    }
}


// --------- REQUEST MANAGEMENT ---------

export async function requestChapterCompletion(input: RequestChapterCompletionInput): Promise<ActionResponse> {
    const { teacherUid, ...requestData } = input;
    if (!teacherUid) return { success: false, error: 'Teacher not found.' };

    try {
        const requestsRef = collection(db, 'teachers', teacherUid, 'pendingQuestRequests');
        await addDoc(requestsRef, {
            ...requestData,
            requestedAt: serverTimestamp(),
        });
        return { success: true, message: 'Request sent for approval.' };
    } catch (error: any) {
        console.error("Error creating quest completion request:", error);
        return { success: false, error: "Could not send your request for approval." };
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

    if (chapterNumber === currentProgress + 1) {
        const newProgress = { ...studentData.questProgress, [hubId]: chapterNumber };
        batch.update(studentRef, { questProgress: newProgress });
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
