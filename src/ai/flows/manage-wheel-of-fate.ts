
'use server';

/**
 * @fileOverview Server-side functions for managing Wheel of Fate events.
 */

import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface CreateEventInput {
    teacherUid: string;
    text: string;
}

export async function createWheelOfFateEvent(input: CreateEventInput): Promise<ActionResponse> {
    if (!input.teacherUid || !input.text.trim()) {
        return { success: false, error: 'Invalid input.' };
    }
    try {
        const eventsRef = collection(db, 'teachers', input.teacherUid, 'wheelOfFateEvents');
        await addDoc(eventsRef, {
            text: input.text,
            createdAt: serverTimestamp(),
        });
        return { success: true, message: 'Event created successfully.' };
    } catch (error: any) {
        console.error('Error creating wheel of fate event:', error);
        return { success: false, error: error.message || 'Failed to create event.' };
    }
}

interface UpdateEventInput {
    teacherUid: string;
    eventId: string;
    text: string;
}

export async function updateWheelOfFateEvent(input: UpdateEventInput): Promise<ActionResponse> {
    if (!input.teacherUid || !input.eventId || !input.text.trim()) {
        return { success: false, error: 'Invalid input.' };
    }
    try {
        const eventRef = doc(db, 'teachers', input.teacherUid, 'wheelOfFateEvents', input.eventId);
        await updateDoc(eventRef, { text: input.text });
        return { success: true, message: 'Event updated successfully.' };
    } catch (error: any) {
        console.error('Error updating wheel of fate event:', error);
        return { success: false, error: error.message || 'Failed to update event.' };
    }
}

interface DeleteEventInput {
    teacherUid: string;
    eventId: string;
}

export async function deleteWheelOfFateEvent(input: DeleteEventInput): Promise<ActionResponse> {
    if (!input.teacherUid || !input.eventId) {
        return { success: false, error: 'Invalid input.' };
    }
    try {
        const eventRef = doc(db, 'teachers', input.teacherUid, 'wheelOfFateEvents', input.eventId);
        await deleteDoc(eventRef);
        return { success: true, message: 'Event deleted successfully.' };
    } catch (error: any) {
        console.error('Error deleting wheel of fate event:', error);
        return { success: false, error: error.message || 'Failed to delete event.' };
    }
}
