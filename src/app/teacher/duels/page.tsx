
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Edit, Trash2, Check, X, Loader2, Save, Star, Coins, ShieldAlert, RefreshCcw, BookOpen } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { DuelQuestionSection, DuelSettings } from '@/lib/duels';
import { useToast } from '@/hooks/use-toast';
import { 
    createDuelSection, 
    updateDuelSection, 
    deleteDuelSection, 
    toggleDuelSectionActive, 
    getDuelSettings,
    updateDuelSettings,
    resetAllDuelStatuses,
    resetAllDailyTrainings
} from '@/ai/flows/manage-duels';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


export default function TrainingGroundsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [teacher, setTeacher] = useState<User | null>(null);
  const [sections, setSections] = useState<DuelQuestionSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog State
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<DuelQuestionSection | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Deletion State
  const [sectionToDelete, setSectionToDelete] = useState<DuelQuestionSection | null>(null);
  
  // Toggling State
  const [isToggling, setIsToggling] = useState<string | null>(null);

  // Settings State
  const [duelSettings, setDuelSettings] = useState<DuelSettings>({ rewardXp: 25, rewardGold: 10, isDuelsEnabled: true, duelCost: 0, dailyDuelLimit: 5, isDailyLimitEnabled: true, includeDuelsInDailyTraining: true, numNormalQuestions: 10, numSuddenDeathQuestions: 10, dailyTrainingXpReward: 50, dailyTrainingGoldReward: 25, isDailyTrainingEnabled: true });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingTraining, setIsResettingTraining] = useState(false);

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
    const sectionsRef = collection(db, 'teachers', teacher.uid, 'duelQuestionSections');
    const q = query(sectionsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setSections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DuelQuestionSection)));
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching duel sections:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load question sections.' });
        setIsLoading(false);
    });

    getDuelSettings(teacher.uid).then(setDuelSettings);

    return () => unsubscribe();
  }, [teacher, toast]);

  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => a.name.localeCompare(b.name));
  }, [sections]);
  
  const handleOpenDialog = (section: DuelQuestionSection | null) => {
      setEditingSection(section);
      setSectionName(section ? section.name : '');
      setIsSectionDialogOpen(true);
  }

  const handleSaveSection = async () => {
    if (!teacher || !sectionName.trim()) {
        toast({ variant: 'destructive', title: 'Invalid Name', description: 'Section name cannot be empty.' });
        return;
    }
    setIsSaving(true);
    try {
        if (editingSection) {
            await updateDuelSection({ teacherUid: teacher.uid, sectionId: editingSection.id, name: sectionName });
            toast({ title: 'Section Updated' });
        } else {
            await createDuelSection({ teacherUid: teacher.uid, name: sectionName });
            toast({ title: 'Section Created' });
        }
        setIsSectionDialogOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!teacher || !sectionToDelete) return;
    setIsToggling(sectionToDelete.id); // Re-use toggling state for loading indicator
    try {
        await deleteDuelSection({ teacherUid: teacher.uid, sectionId: sectionToDelete.id });
        toast({ title: 'Section Deleted', description: `"${sectionToDelete.name}" and all its questions have been removed.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setIsToggling(null);
        setSectionToDelete(null);
    }
  };
  
  const handleToggleActive = async (section: DuelQuestionSection) => {
    if (!teacher) return;
    setIsToggling(section.id);
    try {
        await toggleDuelSectionActive({ teacherUid: teacher.uid, sectionId: section.id, isActive: !section.isActive });
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsToggling(null);
    }
  }

  const handleToggleFeature = async (feature: 'isDuelsEnabled' | 'isDailyTrainingEnabled' | 'includeDuelsInDailyTraining') => {
    if(!teacher) return;
    const newStatus = !(duelSettings[feature] ?? true);
    setIsToggling(feature);
    try {
        await updateDuelSettings({ teacherUid: teacher.uid, settings: { [feature]: newStatus } });
        setDuelSettings(prev => ({...prev, [feature]: newStatus}));
        let featureName = '';
        if (feature === 'isDuelsEnabled') featureName = 'Training Grounds';
        else if (feature === 'isDailyTrainingEnabled') featureName = 'Daily Training';
        else if (feature === 'includeDuelsInDailyTraining') featureName = 'Duel Questions in Daily Training';
        
        toast({ title: `${featureName} ${newStatus ? 'Enabled' : 'Disabled'}` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsToggling(null);
    }
  }
  
   const handleSaveSettings = async () => {
    if (!teacher) return;
    setIsSavingSettings(true);
    const { rewardXp, rewardGold, duelCost, dailyDuelLimit, isDailyLimitEnabled, numNormalQuestions, numSuddenDeathQuestions, dailyTrainingXpReward, dailyTrainingGoldReward } = duelSettings;
    try {
        const result = await updateDuelSettings({ 
            teacherUid: teacher.uid, 
            settings: { rewardXp, rewardGold, duelCost, dailyDuelLimit, isDailyLimitEnabled, numNormalQuestions, numSuddenDeathQuestions, dailyTrainingXpReward, dailyTrainingGoldReward } 
        });
        if (result.success) {
            toast({ title: 'Settings Updated', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsSavingSettings(false);
    }
  };

  const handleResetStatuses = async () => {
    if (!teacher) return;
    setIsResetting(true);
    try {
        const result = await resetAllDuelStatuses(teacher.uid);
        if (result.success) {
            toast({ title: 'Statuses Reset', description: result.message });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Reset Failed', description: error.message });
    } finally {
        setIsResetting(false);
    }
  }
  
  const handleResetTrainings = async () => {
    if (!teacher) return;
    setIsResettingTraining(true);
    try {
        const result = await resetAllDailyTrainings(teacher.uid);
        if (result.success) {
            toast({ title: 'Daily Trainings Reset', description: result.message });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Reset Failed', description: error.message });
    } finally {
        setIsResettingTraining(false);
    }
  };

  const isDuelsEnabled = duelSettings.isDuelsEnabled ?? true;
  const isDailyTrainingEnabled = duelSettings.isDailyTrainingEnabled ?? true;
  const includeDuelsInDailyTraining = duelSettings.includeDuelsInDailyTraining ?? true;

  return (
    <>
    <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingSection ? 'Edit Section Name' : 'Create New Section'}</DialogTitle>
                <DialogDescription>
                    {editingSection ? 'Rename your question section.' : 'Create a new section to organize your duel questions.'}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="section-name">Section Name</Label>
                <Input
                    id="section-name"
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    placeholder="e.g., Unit 3: Ecosystems"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveSection} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Section
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
     <AlertDialog open={!!sectionToDelete} onOpenChange={() => setSectionToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the "{sectionToDelete?.name}" section and ALL of its questions. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Yes, Delete Section
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <div className="relative flex min-h-screen w-full flex-col">
       <div 
            className="absolute inset-0 -z-10 bg-no-repeat"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FDual%20Page%20Battle.png?alt=media&token=7db8be1d-0318-4dd5-b621-bf007d15dbf6')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.25,
            }}
        />
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
             <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Podium
            </Button>
            <div className="flex gap-2">
                 <Button 
                    onClick={() => handleToggleFeature('isDuelsEnabled')} 
                    disabled={isToggling === 'isDuelsEnabled'}
                    className={cn(isDuelsEnabled ? 'bg-destructive hover:bg-destructive/90' : 'bg-green-600 hover:bg-green-700')}
                 >
                    {isToggling === 'isDuelsEnabled' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isDuelsEnabled ? 'Close Training Grounds' : 'Open Training Grounds'}
                </Button>
                 <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4"/> New Section</Button>
            </div>
          </div>
          
            <Alert variant={isDuelsEnabled ? 'default' : 'destructive'} className={cn('bg-opacity-80 backdrop-blur-sm', isDuelsEnabled ? 'bg-green-100 dark:bg-green-900/50 border-green-500' : 'bg-red-100 dark:bg-red-900/50 border-red-500')}>
                <ShieldAlert className={cn("h-4 w-4", isDuelsEnabled ? 'text-green-600' : 'text-destructive')} />
                <AlertTitle className="font-bold text-lg">Training Grounds Status</AlertTitle>
                <AlertDescription className="font-semibold text-base">
                    The Training Grounds are currently {isDuelsEnabled ? 'OPEN' : 'CLOSED'}. Students {isDuelsEnabled ? 'CAN' : 'CANNOT'} challenge each other to duels.
                </AlertDescription>
            </Alert>
            <Alert variant={isDailyTrainingEnabled ? 'default' : 'destructive'} className={cn('bg-opacity-80 backdrop-blur-sm', isDailyTrainingEnabled ? 'bg-green-100 dark:bg-green-900/50 border-green-500' : 'bg-red-100 dark:bg-red-900/50 border-red-500')}>
                <BookOpen className={cn("h-4 w-4", isDailyTrainingEnabled ? 'text-green-600' : 'text-destructive')} />
                <AlertTitle className="font-bold text-lg">Daily Training Status</AlertTitle>
                <AlertDescription className="font-semibold text-base">
                    Daily Training is currently {isDailyTrainingEnabled ? 'ENABLED' : 'DISABLED'}. Students {isDailyTrainingEnabled ? 'CAN' : 'CANNOT'} access this feature.
                </AlertDescription>
            </Alert>

           <Card>
                <CardHeader>
                    <CardTitle>Training Grounds Settings</CardTitle>
                    <CardDescription>Configure rewards, costs, and limits for student activities.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="border-b pb-4 space-y-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="duels-enabled" checked={isDuelsEnabled} onCheckedChange={() => handleToggleFeature('isDuelsEnabled')} disabled={isToggling === 'isDuelsEnabled'} />
                            <Label htmlFor="duels-enabled" className="text-lg font-semibold">Student vs. Student Duels</Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="num-normal-questions"># of Normal Questions</Label>
                                <Input
                                    id="num-normal-questions"
                                    type="number"
                                    value={duelSettings.numNormalQuestions || ''}
                                    onChange={(e) => setDuelSettings(prev => ({...prev, numNormalQuestions: Number(e.target.value)}))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="num-sudden-death-questions"># of Sudden Death Questions</Label>
                                <Input
                                    id="num-sudden-death-questions"
                                    type="number"
                                    value={duelSettings.numSuddenDeathQuestions || ''}
                                    onChange={(e) => setDuelSettings(prev => ({...prev, numSuddenDeathQuestions: Number(e.target.value)}))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                            <div className="space-y-1">
                                <Label htmlFor="reward-xp" className="flex items-center gap-1"><Star className="h-4 w-4" /> Duel XP Reward</Label>
                                <Input 
                                    id="reward-xp"
                                    type="number"
                                    value={duelSettings.rewardXp}
                                    onChange={(e) => setDuelSettings(prev => ({...prev, rewardXp: Number(e.target.value)}))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="reward-gold" className="flex items-center gap-1"><Coins className="h-4 w-4" /> Duel Gold Reward</Label>
                                <Input 
                                    id="reward-gold"
                                    type="number"
                                    value={duelSettings.rewardGold}
                                    onChange={(e) => setDuelSettings(prev => ({...prev, rewardGold: Number(e.target.value)}))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="duel-cost" className="flex items-center gap-1"><Coins className="h-4 w-4 text-destructive" /> Duel Cost</Label>
                                <Input 
                                    id="duel-cost"
                                    type="number"
                                    value={duelSettings.duelCost || ''}
                                    onChange={(e) => setDuelSettings(prev => ({...prev, duelCost: Number(e.target.value)}))}
                                    placeholder="e.g., 5"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Switch id="daily-limit-enabled" checked={duelSettings.isDailyLimitEnabled} onCheckedChange={(checked) => setDuelSettings(prev => ({...prev, isDailyLimitEnabled: checked}))} />
                                    <Label htmlFor="daily-limit-enabled">Enforce Daily Duel Limit</Label>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="daily-limit">Daily Duel Limit</Label>
                                <Input 
                                    id="daily-limit"
                                    type="number"
                                    value={duelSettings.dailyDuelLimit || ''}
                                    onChange={(e) => setDuelSettings(prev => ({...prev, dailyDuelLimit: Number(e.target.value)}))}
                                    placeholder="e.g., 5"
                                    disabled={!duelSettings.isDailyLimitEnabled}
                                />
                            </div>
                        </div>
                    </div>
                     <div className="pt-4 space-y-4">
                        <div className="flex items-center space-x-2">
                             <Switch id="daily-training-enabled" checked={isDailyTrainingEnabled} onCheckedChange={() => handleToggleFeature('isDailyTrainingEnabled')} disabled={isToggling === 'isDailyTrainingEnabled'} />
                             <Label htmlFor="daily-training-enabled" className="text-lg font-semibold">Daily Training</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="include-duels-in-training" checked={includeDuelsInDailyTraining} onCheckedChange={() => handleToggleFeature('includeDuelsInDailyTraining')} disabled={isToggling === 'includeDuelsInDailyTraining'} />
                            <Label htmlFor="include-duels-in-training">Include Duel Questions in Daily Training</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">Note: Questions for Daily Training are also pulled from any quizzes in chapters that a student has completed.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="training-reward-xp" className="flex items-center gap-1"><Star className="h-4 w-4" /> Max XP Reward</Label>
                                <Input 
                                    id="training-reward-xp"
                                    type="number"
                                    value={duelSettings.dailyTrainingXpReward || ''}
                                    onChange={(e) => setDuelSettings(prev => ({...prev, dailyTrainingXpReward: Number(e.target.value)}))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="training-reward-gold" className="flex items-center gap-1"><Coins className="h-4 w-4" /> Max Gold Reward</Label>
                                <Input 
                                    id="training-reward-gold"
                                    type="number"
                                    value={duelSettings.dailyTrainingGoldReward || ''}
                                    onChange={(e) => setDuelSettings(prev => ({...prev, dailyTrainingGoldReward: Number(e.target.value)}))}
                                />
                            </div>
                        </div>
                         <Button variant="secondary" onClick={handleResetTrainings} disabled={isResettingTraining}>
                            {isResettingTraining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                            Reset All Daily Trainings
                        </Button>
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t">
                        <Button variant="secondary" onClick={handleResetStatuses} disabled={isResetting}>
                            {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                            Reset All Duel Statuses
                        </Button>
                        <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                             {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save All Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>

          <Card>
            <CardHeader>
                <CardTitle>Question Sections</CardTitle>
                <CardDescription>Manage the question sections for student duels. Active sections will be included in the random question pool for all duels.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : sections.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No question sections created yet. Click "New Section" to begin.</p>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {sortedSections.map(section => (
                            <AccordionItem value={section.id} key={section.id}>
                                <div className="flex items-center w-full">
                                    <AccordionTrigger className="text-lg flex-grow hover:no-underline" onClick={() => router.push(`/teacher/duels/edit/${section.id}`)}>
                                        {section.name} ({section.questionCount || 0} Questions)
                                    </AccordionTrigger>
                                    <div className="flex items-center gap-2 pr-4">
                                        <span className="text-sm font-semibold">{section.isActive ? 'Active' : 'Inactive'}</span>
                                        {isToggling === section.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Switch checked={section.isActive} onCheckedChange={() => handleToggleActive(section)} />}
                                        <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(section)}><Edit className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setSectionToDelete(section)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                </div>
                                <AccordionContent>
                                    <div className="p-4 bg-secondary rounded-md">
                                        <p>Click the section name to add or edit questions.</p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </>
  );
}
