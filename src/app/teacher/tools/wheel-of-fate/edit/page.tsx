
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface WheelEvent {
    id: string;
    text: string;
}

export default function EditWheelOfFatePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [events, setEvents] = useState<WheelEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // For adding/editing
    const [currentEventText, setCurrentEventText] = useState('');
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                setTeacher(user);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!teacher) return;
        const eventsRef = collection(db, 'teachers', teacher.uid, 'wheelOfFateEvents');
        const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, text: doc.data().text })));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [teacher]);
    
    const handleSaveEvent = async () => {
        if (!teacher || !currentEventText.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Event text cannot be empty.' });
            return;
        }
        setIsSaving(true);
        try {
            if (editingEventId) {
                // Update existing event
                const eventRef = doc(db, 'teachers', teacher.uid, 'wheelOfFateEvents', editingEventId);
                await updateDoc(eventRef, { text: currentEventText });
                toast({ title: 'Event Updated' });
            } else {
                // Add new event
                const eventsRef = collection(db, 'teachers', teacher.uid, 'wheelOfFateEvents');
                await addDoc(eventsRef, { text: currentEventText });
                toast({ title: 'Event Added' });
            }
            // Reset form
            setCurrentEventText('');
            setEditingEventId(null);
        } catch (error) {
            console.error("Error saving event:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save the event.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteEvent = async (eventId: string) => {
        if (!teacher) return;
        try {
            const eventRef = doc(db, 'teachers', teacher.uid, 'wheelOfFateEvents', eventId);
            await deleteDoc(eventRef);
            toast({ title: 'Event Deleted' });
        } catch (error) {
             console.error("Error deleting event:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the event.' });
        }
    };

    const startEditing = (event: WheelEvent) => {
        setEditingEventId(event.id);
        setCurrentEventText(event.text);
    }
    
    const cancelEditing = () => {
        setEditingEventId(null);
        setCurrentEventText('');
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-2xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                    <Card>
                        <CardHeader>
                            <CardTitle>Edit the Wheel of Fate</CardTitle>
                            <CardDescription>Add, edit, or remove the events that can appear on your wheel.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input 
                                    placeholder={editingEventId ? "Edit your event..." : "Add a new event..."}
                                    value={currentEventText}
                                    onChange={(e) => setCurrentEventText(e.target.value)}
                                />
                                <Button onClick={handleSaveEvent} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : editingEventId ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                    {editingEventId ? 'Update' : 'Add'}
                                </Button>
                                {editingEventId && <Button variant="ghost" onClick={cancelEditing}>Cancel</Button>}
                            </div>

                            <div className="space-y-2 pt-4">
                                {isLoading ? (
                                    <p>Loading events...</p>
                                ) : events.length === 0 ? (
                                    <p className="text-muted-foreground text-center">No events yet. Add one above to get started!</p>
                                ) : (
                                    events.map(event => (
                                        <div key={event.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                            <p className="flex-grow">{event.text}</p>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => startEditing(event)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(event.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
