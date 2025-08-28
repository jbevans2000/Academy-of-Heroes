
'use client';

import { useState, useEffect } from 'react';
import type { Student, QuestHub, Chapter } from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { setStudentQuestProgress } from '@/ai/flows/manage-quests';

interface SetQuestProgressDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  studentsToUpdate: Student[];
  teacherUid: string;
  hubs: QuestHub[];
  chapters: Chapter[];
}

export function SetQuestProgressDialog({ isOpen, onOpenChange, studentsToUpdate, teacherUid, hubs, chapters }: SetQuestProgressDialogProps) {
  const { toast } = useToast();
  const [selectedHubId, setSelectedHubId] = useState('');
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number | ''>('');
  const [chaptersInSelectedHub, setChaptersInSelectedHub] = useState<Chapter[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSetting, setIsSetting] = useState(false);

  useEffect(() => {
    if (selectedHubId) {
      const filteredChapters = chapters
        .filter(c => c.hubId === selectedHubId)
        .sort((a, b) => a.chapterNumber - b.chapterNumber);
      setChaptersInSelectedHub(filteredChapters);
      setSelectedChapterNumber(''); // Reset chapter when hub changes
    } else {
      setChaptersInSelectedHub([]);
    }
  }, [selectedHubId, chapters]);
  
  useEffect(() => {
    // Reset state when dialog opens
    if (isOpen) {
        setSelectedHubId('');
        setSelectedChapterNumber('');
        setChaptersInSelectedHub([]);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!teacherUid || !selectedHubId || selectedChapterNumber === '') return;
    setIsSetting(true);
    try {
        const studentUids = studentsToUpdate.map(s => s.uid);
        const result = await setStudentQuestProgress({
            teacherUid,
            studentUids,
            hubId: selectedHubId,
            chapterNumber: Number(selectedChapterNumber),
        });

        if (result.success) {
            toast({
                title: "Progress Updated",
                description: `${studentUids.length} student(s) have been moved to the specified chapter.`
            });
            onOpenChange(false); // Close the main dialog
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsSetting(false);
        setIsConfirmOpen(false);
    }
  }
  
  const studentNames = studentsToUpdate.map(s => s.characterName).join(', ');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Chapter Location</DialogTitle>
            <DialogDescription>
              Choose a destination chapter for the selected student(s). All previous chapters and hubs will be marked as complete.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label>Destination Hub</Label>
                <Select value={selectedHubId} onValueChange={setSelectedHubId}>
                    <SelectTrigger><SelectValue placeholder="Select a hub..."/></SelectTrigger>
                    <SelectContent>
                        {hubs.map(hub => <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {selectedHubId && (
                 <div className="space-y-2">
                    <Label>Destination Chapter</Label>
                    <Select value={String(selectedChapterNumber)} onValueChange={(val) => setSelectedChapterNumber(Number(val))}>
                        <SelectTrigger><SelectValue placeholder="Select a chapter..."/></SelectTrigger>
                        <SelectContent>
                            {chaptersInSelectedHub.map(chapter => (
                                <SelectItem key={chapter.id} value={String(chapter.chapterNumber)}>
                                    Chapter {chapter.chapterNumber}: {chapter.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!selectedHubId || selectedChapterNumber === ''} onClick={() => setIsConfirmOpen(true)}>
                Set Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    <p>You are about to set the quest progress for:</p>
                    <p className="font-bold my-2">{studentNames}</p>
                    <p>They will be moved to <span className="font-bold">Chapter {selectedChapterNumber}</span> of <span className="font-bold">{hubs.find(h => h.id === selectedHubId)?.name}</span>. All prior content will be marked as complete for them.</p>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSetting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm} disabled={isSetting}>
                    {isSetting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirm
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
