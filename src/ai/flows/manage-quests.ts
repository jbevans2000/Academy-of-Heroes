

'use server';

import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, writeBatch, deleteDoc, serverTimestamp, query as firestoreQuery, where, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student, QuestHub, Chapter } from '@/lib/data';
import { logGameEvent } from '@/lib/gamelog';
import { handleLevelChange } from '@/lib/game-mechanics';
import { logAvatarEvent } from '@/lib/avatar-log';

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

interface UncompleteChapterInput {
    teacherUid: string;
    studentUid: string;
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
        const teacherRef = doc(db, 'teachers', teacherUid);
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        const chapterRef = doc(db, 'teachers', teacherUid, 'chapters', chapterId);
        const hubRef = doc(db, 'teachers', teacherUid, 'questHubs', hubId);
        
        const questSettings = await getQuestSettings(teacherUid);

        const [teacherSnap, studentSnap, chapterSnap, hubSnap] = await Promise.all([getDoc(teacherRef), getDoc(studentRef), getDoc(chapterRef), getDoc(hubRef)]);

        if (!studentSnap.exists()) throw new Error("Student not found.");
        if (!chapterSnap.exists()) throw new Error("Chapter not found.");
        if (!hubSnap.exists()) throw new Error("Quest Hub not found.");

        const levelingTable = teacherSnap.exists() ? teacherSnap.data().levelingTable : null;
        const student = studentSnap.data() as Student;
        const chapter = { id: chapterSnap.id, ...chapterSnap.data() } as Chapter;
        const hub = { id: hubSnap.id, ...hubSnap.data() } as QuestHub;

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
        
        // This is the crucial check. We only enforce sequential completion for standard hubs.
        if (hub.hubType !== 'sidequest') {
            const currentProgress = student.questProgress?.[hubId] || 0;
            if (chapter.chapterNumber > currentProgress + 1) {
                return { success: false, error: "This chapter cannot be marked as complete yet. Complete the previous chapter first." };
            }
        }


        // Check if approval is required
        const isGlobalApprovalOn = questSettings.globalApprovalRequired;
        const studentOverride = questSettings.studentOverrides?.[student.uid];
        
        let needsApproval = isGlobalApprovalOn;
        if (studentOverride !== undefined) {
            needsApproval = studentOverride; // Override takes precedence
        }
        
        // Don't send for approval if the chapter is already completed.
        const isAlreadyCompleted = (student.completedChapters || []).includes(chapterId);

        if (needsApproval && !isAlreadyCompleted) {
            const requestsRef = collection(db, 'teachers', teacherUid, 'pendingQuestRequests');
            await addDoc(requestsRef, {
                studentUid,
                studentName: student.studentName,
                characterName: student.characterName,
                hubId: hub.id,
                chapterId: chapter.id,
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
        
        const newProgress = { ...student.questProgress, [hubId]: Math.max(student.questProgress?.[hubId] || 0, chapter.chapterNumber) };
        let updates: Partial<Student> = {
            questProgress: newProgress,
            lastChapterCompletion: serverTimestamp() // Update the timestamp
        };

        // --- Award Rewards if applicable ---
        let rewardMessage = '';
        if (hub.areRewardsEnabled && !isAlreadyCompleted) {
            const xpToAdd = hub.rewardXp || 0;
            const goldToAdd = hub.rewardGold || 0;

            if (goldToAdd > 0) updates.gold = increment(goldToAdd);
            
            if (xpToAdd > 0) {
                 const newXp = (student.xp || 0) + xpToAdd;
                 const levelUpdates = handleLevelChange(student, newXp, levelingTable);
                 updates = { ...updates, ...levelUpdates };
            }
            
            if (xpToAdd > 0 || goldToAdd > 0) {
                 await logAvatarEvent(teacherUid, studentUid, {
                    source: 'Quest Completion',
                    xp: xpToAdd,
                    gold: goldToAdd,
                    reason: `Completed "${chapter.title}"`,
                });
            }

            updates.completedChapters = arrayUnion(chapterId); // Mark chapter as rewarded
            rewardMessage = ` You have been awarded ${xpToAdd} XP and ${goldToAdd} Gold!`;
        }

        if (chapter.chapterNumber === totalChaptersInHub && hub.hubType !== 'sidequest') {
             if ((student.hubsCompleted || 0) < hub.hubOrder) {
                updates.hubsCompleted = hub.hubOrder;
            }
        }
        
        await updateDoc(studentRef, updates);
        if(!isAlreadyCompleted) {
            await logGameEvent(teacherUid, 'CHAPTER', `${student.characterName} completed Chapter ${chapter.chapterNumber}: ${chapter.title}.`);
        }

        return { success: true, message: `You have completed Chapter ${chapter.chapterNumber}: ${chapter.title}!${rewardMessage}` };

    } catch (error: any) {
        console.error("Error completing chapter:", error);
        return { success: false, error: error.message || "Failed to complete chapter." };
    }
}


async function approveSingleRequest(batch: any, teacherUid: string, requestId: string, requestData: any, levelingTable: any) {
    const { studentUid, hubId, chapterId, chapterNumber, chapterTitle } = requestData;
    const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
    const hubRef = doc(db, 'teachers', teacherUid, 'questHubs', hubId);
    
    const studentSnap = await getDoc(studentRef);
    const hubSnap = await getDoc(hubRef);

    if (!studentSnap.exists() || !hubSnap.exists()) {
        console.warn(`Student ${studentUid} or Hub ${hubId} not found for request ${requestId}. Skipping.`);
        const requestRefToDelete = doc(db, 'teachers', teacherUid, 'pendingQuestRequests', requestId);
        batch.delete(requestRefToDelete); // Clean up invalid request
        return;
    }

    const studentData = studentSnap.data() as Student;
    const hubData = hubSnap.data() as QuestHub;
    const currentProgress = studentData.questProgress?.[hubId] || 0;

    if (chapterNumber === currentProgress + 1 || hubData.hubType === 'sidequest') {
        const newProgressNumber = Math.max(currentProgress, chapterNumber);
        const newProgress = { ...studentData.questProgress, [hubId]: newProgressNumber };
        let updates: Partial<Student> = {
            questProgress: newProgress,
            lastChapterCompletion: serverTimestamp()
        };

        if (hubData.areRewardsEnabled && !(studentData.completedChapters || []).includes(chapterId)) {
            const xpToAdd = hubData.rewardXp || 0;
            const goldToAdd = hubData.rewardGold || 0;
            
            if(goldToAdd > 0) updates.gold = increment(goldToAdd);

            if(xpToAdd > 0) {
                const newXp = (studentData.xp || 0) + xpToAdd;
                const levelUpdates = handleLevelChange(studentData, newXp, levelingTable);
                updates = { ...updates, ...levelUpdates };
            }

             if (xpToAdd > 0 || goldToAdd > 0) {
                 await logAvatarEvent(teacherUid, studentUid, {
                    source: 'Quest Completion',
                    xp: xpToAdd,
                    gold: goldToAdd,
                    reason: `Completed "${chapterTitle}"`,
                });
            }

            updates.completedChapters = arrayUnion(chapterId);
        }

        batch.update(studentRef, updates);
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
        const teacherRef = doc(db, 'teachers', teacherUid);
        const teacherSnap = await getDoc(teacherRef);
        const levelingTable = teacherSnap.exists() ? teacherSnap.data().levelingTable : null;

        const batch = writeBatch(db);
        await approveSingleRequest(batch, teacherUid, requestId, requestSnap.data(), levelingTable);
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
        const teacherRef = doc(db, 'teachers', teacherUid);
        const teacherSnap = await getDoc(teacherRef);
        const levelingTable = teacherSnap.exists() ? teacherSnap.data().levelingTable : null;

        const batch = writeBatch(db);
        for (const requestDoc of requestsSnapshot.docs) {
            await approveSingleRequest(batch, teacherUid, requestDoc.id, requestDoc.data(), levelingTable);
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
    if (!teacherUid || studentUids.length === 0 || !hubId) {
        return { success: false, error: 'Invalid input provided.' };
    }

    const batch = writeBatch(db);
    try {
        // Fetch all hub and chapter data once
        const hubsRef = collection(db, 'teachers', teacherUid, 'questHubs');
        const chaptersRef = collection(db, 'teachers', teacherUid, 'chapters');
        const [hubsSnapshot, chaptersSnapshot] = await Promise.all([getDocs(hubsRef), getDocs(chaptersRef)]);
        
        const allHubs = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub)).sort((a,b) => a.hubOrder - b.hubOrder);
        const allChapters = chaptersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));

        for (const studentUid of studentUids) {
            const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
            const studentSnap = await getDoc(studentRef);
            if (!studentSnap.exists()) continue; // Skip if student doesn't exist

            const studentData = studentSnap.data() as Student;
            const newQuestProgress = { ...(studentData.questProgress || {}) };
            
            const targetHub = allHubs.find(h => h.id === hubId);
            if (!targetHub) continue;

            // Set the new target progress for the specified hub
            newQuestProgress[hubId] = chapterNumber;

            // Backfill progress for all hubs with a lower order number
            for (const hub of allHubs) {
                if (hub.hubOrder < targetHub.hubOrder) {
                    const chaptersInThisHub = allChapters.filter(c => c.hubId === hub.id);
                    newQuestProgress[hub.id] = chaptersInThisHub.length;
                } else if (hub.hubOrder > targetHub.hubOrder) {
                     // Clear progress for all hubs with a higher order number
                    delete newQuestProgress[hub.id];
                }
            }
            
            // Rebuild the completed chapters array from scratch
            const newRewardedChapters = new Set<string>();
            for (const hub of allHubs) {
                const chaptersCompletedInHub = newQuestProgress[hub.id] || 0;
                if (chaptersCompletedInHub > 0) {
                    const chaptersInThisHub = allChapters.filter(c => c.hubId === hub.id);
                    for (let i = 1; i <= chaptersCompletedInHub; i++) {
                        const chapterToMark = chaptersInThisHub.find(c => c.chapterNumber === i);
                        if (chapterToMark) {
                            newRewardedChapters.add(chapterToMark.id);
                        }
                    }
                }
            }


            // Determine highest completed hub order based on the updated progress
            let highestCompletedOrder = 0;
            for (const hub of allHubs) {
                const chaptersInHub = allChapters.filter(c => c.hubId === hub.id);
                if(newQuestProgress[hub.id] === chaptersInHub.length && chaptersInHub.length > 0) {
                    if (hub.hubOrder > highestCompletedOrder) {
                        highestCompletedOrder = hub.hubOrder;
                    }
                }
            }

            batch.update(studentRef, { 
                questProgress: newQuestProgress,
                hubsCompleted: highestCompletedOrder,
                completedChapters: Array.from(newRewardedChapters)
            });
        }
        
        await batch.commit();
        const targetHubName = allHubs.find(h => h.id === hubId)?.name || 'Unknown Hub';
        await logGameEvent(teacherUid, 'GAMEMASTER', `Set quest progress for ${studentUids.length} student(s) to Hub: ${targetHubName}, Chapter: ${chapterNumber}.`);

        return { success: true };

    } catch (error: any) {
        console.error("Error setting student quest progress:", error);
        return { success: false, error: error.message || "Failed to update student progress." };
    }
}

export async function uncompleteChapter(input: UncompleteChapterInput): Promise<ActionResponse> {
    const { teacherUid, studentUid, hubId, chapterNumber } = input;
    if (!teacherUid || !studentUid || !hubId || chapterNumber <= 0) {
        return { success: false, error: 'Invalid input.' };
    }

    try {
        const studentRef = doc(db, 'teachers', teacherUid, 'students', studentUid);
        const studentSnap = await getDoc(studentRef);
        if (!studentSnap.exists()) {
            throw new Error("Student not found.");
        }
        const student = studentSnap.data() as Student;
        
        const newProgressNumber = chapterNumber - 1;
        const newQuestProgress = { ...(student.questProgress || {}), [hubId]: newProgressNumber };

        // Recalculate hubsCompleted
        const hubsRef = collection(db, 'teachers', teacherUid, 'questHubs');
        const chaptersRef = collection(db, 'teachers', teacherUid, 'chapters');
        const [hubsSnapshot, chaptersSnapshot] = await Promise.all([getDocs(hubsRef), getDocs(chaptersRef)]);
        
        const allHubs = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub)).sort((a,b) => a.hubOrder - b.hubOrder);
        const allChapters = chaptersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));

        let highestCompletedOrder = 0;
        for (const hub of allHubs) {
            const chaptersInHub = allChapters.filter(c => c.hubId === hub.id);
            if (newQuestProgress[hub.id] === chaptersInHub.length && chaptersInHub.length > 0) {
                 if (hub.hubOrder > highestCompletedOrder) {
                    highestCompletedOrder = hub.hubOrder;
                }
            }
        }
        
        await updateDoc(studentRef, { 
            questProgress: newQuestProgress,
            hubsCompleted: highestCompletedOrder,
        });

        await logGameEvent(teacherUid, 'CHAPTER', `${student.characterName} has returned to Chapter ${chapterNumber} to review their lessons.`);

        return { success: true, message: "Your progress has been reset. You may now proceed from this chapter again." };

    } catch (error: any) {
        console.error("Error uncompleting chapter:", error);
        return { success: false, error: error.message || 'Failed to update your progress.' };
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
            chaptersSnapshot.docs.forEach(doc => {
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

interface DeleteChapterInput {
    teacherUid: string;
    chapterId: string;
}

export async function deleteChapter(input: DeleteChapterInput): Promise<ActionResponse> {
    const { teacherUid, chapterId } = input;
    if (!teacherUid || !chapterId) {
        return { success: false, error: "Invalid input provided." };
    }

    try {
        const chapterRef = doc(db, 'teachers', teacherUid, 'chapters', chapterId);
        await deleteDoc(chapterRef);

        // We are intentionally NOT cleaning up student progress here per the user's request.
        // The Daily Training function is resilient to missing chapter documents.

        await logGameEvent(teacherUid, 'GAMEMASTER', `Deleted Chapter with ID: ${chapterId}.`);
        return { success: true, message: 'Chapter has been deleted.' };

    } catch (error: any) {
        console.error("Error deleting chapter:", error);
        return { success: false, error: error.message || 'Failed to delete the chapter.' };
    }
}



  