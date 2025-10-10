
'use client';

import { useState, useEffect } from 'react';
import type { Student, Mission } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, RotateCcw, File as FileIcon, Star, Coins } from 'lucide-react';
import { gradeSubmission } from '@/ai/flows/manage-submissions';
import RichTextEditor from './rich-text-editor';

interface Submission {
    id: string;
    submissionContent?: string;
    fileUrl?: string;
    grade?: string;
    feedback?: string;
    xpAwarded?: number;
    goldAwarded?: number;
}

interface ReviewSubmissionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  student: Student;
  submission: Submission;
  mission: Mission;
  teacherUid: string;
}

export function ReviewSubmissionDialog({ isOpen, onOpenChange, student, submission, mission, teacherUid }: ReviewSubmissionDialogProps) {
    const { toast } = useToast();
    
    const [grade, setGrade] = useState(submission.grade || '');
    const [feedback, setFeedback] = useState(submission.feedback || '');
    const [xpAward, setXpAward] = useState<number | string>(submission.xpAwarded ?? mission.defaultXpReward ?? 0);
    const [goldAward, setGoldAward] = useState<number | string>(submission.goldAwarded ?? mission.defaultGoldReward ?? 0);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isRequestingResubmission, setIsRequestingResubmission] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setGrade(submission.grade || '');
            setFeedback(submission.feedback || '');
            setXpAward(submission.xpAwarded ?? mission.defaultXpReward ?? 0);
            setGoldAward(submission.goldAwarded ?? mission.defaultGoldReward ?? 0);
        }
    }, [isOpen, submission, mission]);

    const handleGradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const percentage = Number(e.target.value);
        setGrade(e.target.value);

        if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
            const xp = Math.ceil((mission.defaultXpReward || 0) * (percentage / 100));
            const gold = Math.ceil((mission.defaultGoldReward || 0) * (percentage / 100));
            setXpAward(xp);
            setGoldAward(gold);
        }
    }

    const handleAction = async (action: 'complete' | 'resubmit') => {
        if (!grade.trim() || !feedback.trim()) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please provide a grade and feedback.' });
            return;
        }

        const numericXp = Number(xpAward);
        const numericGold = Number(goldAward);

        if (isNaN(numericXp) || isNaN(numericGold) || numericXp < 0 || numericGold < 0) {
            toast({ variant: 'destructive', title: 'Invalid Rewards', description: 'XP and Gold must be non-negative numbers.'});
            return;
        }

        action === 'complete' ? setIsSaving(true) : setIsRequestingResubmission(true);

        try {
            const result = await gradeSubmission({
                teacherUid,
                studentUid: student.uid,
                missionId: mission.id,
                grade,
                feedback,
                xpAward: numericXp,
                goldAward: numericGold,
                status: action
            });

            if (result.success) {
                toast({ title: result.message });
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
             action === 'complete' ? setIsSaving(false) : setIsRequestingResubmission(false);
        }
    };
    
    const isEmbedded = mission.content.includes('<iframe');
    const submissionContentHtml = submission.submissionContent 
        ? submission.submissionContent
        : isEmbedded
        ? '<p class="text-muted-foreground">This was an embedded assignment. Please view the student\'s submitted file to see their work.</p>'
        : '<p class="text-muted-foreground">No written response submitted.</p>';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Review Submission: {student.characterName}</DialogTitle>
                    <DialogDescription>Mission: {mission.title}</DialogDescription>
                </DialogHeader>
                <div className="flex-grow grid grid-cols-2 gap-4 overflow-hidden">
                    <div className="flex flex-col space-y-4">
                        <h3 className="font-semibold">Student's Response</h3>
                        <ScrollArea className="h-full border rounded-md p-4 bg-secondary/50">
                           <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: submissionContentHtml }} />
                        </ScrollArea>
                        {submission.fileUrl && (
                            <Button asChild variant="outline">
                                <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <FileIcon className="mr-2 h-4 w-4"/> View Submitted File
                                </a>
                            </Button>
                        )}
                    </div>
                     <div className="flex flex-col space-y-4">
                        <h3 className="font-semibold">Grading & Feedback</h3>
                        <div className="space-y-2">
                            <Label htmlFor="grade">Grade (%)</Label>
                            <Input id="grade" value={grade} onChange={handleGradeChange} placeholder="e.g., 85" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="xp-award" className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400" /> XP Reward</Label>
                                <Input id="xp-award" type="number" value={xpAward} onChange={e => setXpAward(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="gold-award" className="flex items-center gap-1"><Coins className="h-4 w-4 text-amber-500" /> Gold Reward</Label>
                                <Input id="gold-award" type="number" value={goldAward} onChange={e => setGoldAward(e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2 flex-grow flex flex-col">
                            <Label htmlFor="feedback">Feedback</Label>
                            <RichTextEditor value={feedback} onChange={setFeedback} className="flex-grow"/>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                     <Button variant="secondary" onClick={() => handleAction('resubmit')} disabled={isSaving || isRequestingResubmission}>
                        {isRequestingResubmission ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCcw className="mr-2 h-4 w-4"/>}
                        Request Resubmission
                    </Button>
                    <Button onClick={() => handleAction('complete')} disabled={isSaving || isRequestingResubmission}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Mark as Completed
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
