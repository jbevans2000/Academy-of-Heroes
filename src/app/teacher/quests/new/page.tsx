
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function NewQuestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    try {
        const hubId = 'capital-city';
        const hubRef = doc(db, 'questHubs', hubId);
        await setDoc(hubRef, {
            name: 'Capitol City of Luminaria',
            worldMapUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Map%20Images%2FCapital%20City%20Map%20-%20Winter.png?alt=media&token=b2dc0a99-b397-4f77-aed0-a712faea8353',
            coordinates: { x: 58.59, y: 72.59 }
        });

        const chapterId = 'chapter-1';
        const chapterRef = doc(db, 'chapters', chapterId);
        await setDoc(chapterRef, {
            hubId: hubId,
            chapterNumber: 1,
            title: 'A Summons from the Throne',
            coordinates: { x: 34.67, y: 17.36 },
            mainImageUrl: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Chapter%20Images%2F699033fa-5147-43c3-848f-182414887097_orig%5B1%5D.png?alt=media&token=363e71c9-5df5-4102-9138-120577b26b08',
            videoUrl: 'https://www.youtube.com/embed/6agugBXAKqc',
            storyContent: `You sit at a long oak table, reviewing notes on the aether-blooming fungi, a species known for its unique ability to thrive on both magical and biological energy. The delicate balance of its growth fascinates you—the way it mutates based on its surroundings, shifting between nourishment and toxin. You make a note in the margin of your journal when suddenly-- A shadow falls across your work.\\nLooking up, you see a short, balding man draped in the unmistakable crimson robes of a Royal Herald. His presence is striking—not because of his stature, but because of the silence that follows him. Conversations dull to murmurs. Scholars avert their gazes. Without a word, he places a scroll of yellowed vellum onto the table in front of you. The wax seal is unmistakable--a phoenix entwined with a double helix of golden serpents—the emblem of the Emperor and Empress themselves.\\nThen, in a voice that is calm, measured, and absolute, he speaks: "You are hereby summoned to the Royal Court of the Emperor and Empress to continue your studies in the field. This matter is of utmost importance, as you have been identified as an individual who is vital to the future security of the Realm." And just like that--he turns and leaves.\\nYou stare at the scroll. It almost doesn’t feel real. Your first thought is that it must be a joke. A prank, perhaps, from one of your fellow scholars. But the weight of the parchment in your hands says otherwise. It is thick, official, with golden veins running through the vellum, shimmering under the library’s candlelight. No forger would go to such lengths.\\nYour second thought is far more unsettling--are you in trouble? Your studies in the Biological Arts have been respectable, but hardly exceptional. You are no prodigy in Symbiotic Mysteries, nor a pioneer in Metamorphic Studies of Transmutative Anatomy. You are a student. Nothing more. So why summon you?\\nYou unroll the scroll and read the words that confirm the impossible. Ten days hence, when the Winter Sun hangs lowest in the sky, you are to present yourself at the Royal Court. A summons from the Emperor and Empress. A summons that cannot be ignored.`,
            decorativeImageUrl1: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Chapter%20Images%2Fdcdd4586-fb9e-40d3-b8ca-82fa382c132e_orig%5B1%5D.png?alt=media&token=72ea2558-c5bd-47f5-a4b1-92b635fa92dc',
            lessonContent: 'This is placeholder content for the lesson. Here, you can add detailed information, diagrams, and videos related to the story chapter. For example, we could explore the science behind the aether-blooming fungi, discussing symbiotic relationships in biology and how they might be affected by magical energy.\\nFuture content could include interactive diagrams, quizzes, or links to external resources to deepen the student\'s understanding of the scientific concepts presented in the narrative.',
            decorativeImageUrl2: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Chapter%20Images%2Ftwig-with-leaves-curved-wavy-free-vector%5B1%5D.jpg?alt=media&token=9958448c-9456-4279-9433-e8a00cb638e5'
        });

        toast({ title: 'Success!', description: 'Existing content has been imported into the database.' });
    } catch (error) {
        console.error("Error importing content:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not import content.' });
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="outline" onClick={() => router.push('/teacher/quests')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Quests
          </Button>
          <Card>
            <CardHeader>
                <CardTitle>Import Existing Content</CardTitle>
                <CardDescription>This is a one-time action to migrate your manually created 'Capitol City' and 'Chapter 1' into the new database system.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleImport} disabled={isImporting}>
                    {isImporting ? 'Importing...' : 'Import Existing Content'}
                </Button>
            </CardContent>
          </Card>
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
                <p className="text-muted-foreground">This section will contain the dropdown to select an existing hub or create a new one, including the map for drag-and-drop positioning. (Coming in Phase 2)</p>
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
