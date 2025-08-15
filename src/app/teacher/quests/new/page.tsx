
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestHub } from '@/lib/quests';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewQuestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State for the new Hub creator
  const [hubs, setHubs] = useState<QuestHub[]>([]);
  const [selectedHub, setSelectedHub] = useState('');
  const [newHubName, setNewHubName] = useState('');
  const [newHubMapUrl, setNewHubMapUrl] = useState('');

  useEffect(() => {
    const fetchHubs = async () => {
        setIsLoading(true);
        try {
            const hubsSnapshot = await getDocs(collection(db, 'questHubs'));
            const hubsData = hubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestHub));
            setHubs(hubsData);
        } catch (error) {
            console.error("Error fetching hubs: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch quest hubs.' });
        } finally {
            setIsLoading(false);
        }
    };
    fetchHubs();
  }, [toast]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="outline" onClick={() => router.push('/teacher/quests')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Quests
          </Button>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl">Create New Quest</CardTitle>
              <CardDescription>
                Design a new chapter for your students. Start by defining the Hub, then add the chapter content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              <div className="space-y-4 p-6 border rounded-lg">
                <h3 className="text-xl font-semibold">Phase 1: Quest Hub</h3>
                <p className="text-muted-foreground mb-4">A Hub is a location on the world map that contains multiple chapters, like a city or region.</p>
                
                {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="hub-select">Select an Existing Hub or Create a New One</Label>
                            <Select onValueChange={setSelectedHub} value={selectedHub} disabled={isSaving}>
                                <SelectTrigger id="hub-select">
                                    <SelectValue placeholder="Choose a Hub..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">-- Create a New Hub --</SelectItem>
                                    {hubs.map(hub => (
                                        <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedHub === 'new' && (
                            <div className="p-4 border bg-secondary/50 rounded-md space-y-4">
                                <h4 className="font-semibold text-md">New Hub Details</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="new-hub-name">New Hub Name</Label>
                                    <Input 
                                        id="new-hub-name"
                                        placeholder="e.g., The Whispering Woods"
                                        value={newHubName}
                                        onChange={e => setNewHubName(e.target.value)}
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-hub-map">URL for Hub's Regional Map</Label>
                                    <Input 
                                        id="new-hub-map"
                                        placeholder="https://example.com/map.png"
                                        value={newHubMapUrl}
                                        onChange={e => setNewHubMapUrl(e.target.value)}
                                        disabled={isSaving}
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">The drag-and-drop map to place this hub on the world map will appear here in the next phase.</p>
                            </div>
                        )}
                    </div>
                )}
              </div>
              
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Phase 2: Chapter Content</h3>
                <p className="text-muted-foreground">This section will contain the form to add the chapter title, story text, lesson text, images, and video URLs. (Coming in Phase 3)</p>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button size="lg" disabled>
                    Save Quest
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
