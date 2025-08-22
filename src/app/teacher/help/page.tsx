
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ArrowLeft, BookOpen, Swords, Wrench, Star, UserPlus, LayoutDashboard, Copy, Gift } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


interface TeacherData {
    classCode: string;
}

const helpTopics = [
    { id: 'signup', title: 'Student Sign-Up', icon: <UserPlus className="h-8 w-8 text-primary" />, description: 'How to get students registered and into your class.' },
    { id: 'dashboard', title: 'Understanding the Dashboard', icon: <LayoutDashboard className="h-8 w-8 text-primary" />, description: 'An overview of the main dashboard features.' },
    { id: 'awarding', title: 'Awarding XP & Gold', icon: <Star className="h-8 w-8 text-primary" />, description: 'How to give rewards and edit student stats.' },
    { id: 'rewards', title: 'Managing Guild Rewards', icon: <Gift className="h-8 w-8 text-primary" />, description: 'Create and manage custom rewards for your students.' },
    { id: 'quests', title: 'Quests & Chapters', icon: <BookOpen className="h-8 w-8 text-primary" />, description: 'Learn how to create and manage the story campaign.' },
    { id: 'battles', title: 'Boss Battles', icon: <Swords className="h-8 w-8 text-primary" />, description: 'Set up and run exciting, live boss battles.' },
    { id: 'tools', title: 'Classroom Tools', icon: <Wrench className="h-8 w-8 text-primary" />, description: 'Discover the suite of helpful classroom utilities.' },
];

export default function TeacherHelpPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeDialog, setActiveDialog] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setTeacher(user);
                const teacherRef = doc(db, 'teachers', user.uid);
                const teacherSnap = await getDoc(teacherRef);
                if (teacherSnap.exists()) {
                    setTeacherData(teacherSnap.data() as TeacherData);
                }
                setIsLoading(false);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const copyClassCode = () => {
        if (teacherData?.classCode) {
            navigator.clipboard.writeText(teacherData.classCode);
            toast({ title: "Class Code Copied!", description: "You can now share it with your students." });
        }
    };
    
    const renderDialogContent = () => {
        switch (activeDialog) {
            case 'signup':
                return (
                    <>
                        <AlertDialogTitle className="text-2xl">Getting Students Signed Up</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="text-base text-black space-y-4">
                                <p>Here is the simple, 3-step process for students to create their accounts and join your class:</p>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li><strong>Navigate Home:</strong> Direct students to the application's main home page.</li>
                                    <li><strong>Create a Hero:</strong> They should click the "Create New Hero & Join a Class" button.</li>
                                    <li><strong>Enter Class Code:</strong> On the registration page, the most important step is to enter your unique Class Code below.</li>
                                </ol>
                                <div className="text-center p-4 bg-primary/10 rounded-lg">
                                    <p className="font-semibold text-black">Your Unique Class Code:</p>
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <strong className="text-3xl font-mono tracking-widest text-primary">{teacherData?.classCode || 'Loading...'}</strong>
                                        <Button size="icon" variant="ghost" onClick={copyClassCode}><Copy className="w-5 h-5" /></Button>
                                    </div>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </>
                );
            case 'dashboard':
                 return (
                    <>
                        <AlertDialogTitle className="text-2xl">Understanding the Dashboard</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="text-base text-black space-y-4">
                                <p>The Teacher Dashboard is your central command center. Here’s a quick breakdown:</p>
                                <Image src="https://placehold.co/800x400.png" alt="Placeholder for dashboard screenshot" width={800} height={400} className="rounded-lg border" data-ai-hint="dashboard interface" />
                                <ul className="list-disc list-inside space-y-2">
                                    <li><strong>Student Cards:</strong> Each student in your class gets their own card, showing their character, name, class, and key stats at a glance.</li>
                                    <li><strong>Selection:</strong> Click the checkbox in the top-right of a card to select a student. You can select multiple students, or use the "Select All" button.</li>
                                    <li><strong>Manual Stat Editing:</strong> You can directly edit a student's XP, Gold, HP, or MP by clicking on the stat on their card. A small input box will appear for you to enter a new value.</li>
                                    <li><strong>View Details:</strong> Click the "View Details" button on a card to see a full-screen preview of that student's dashboard, exactly as they see it.</li>
                                    <li><strong>Global Actions:</strong> The buttons at the top (Award XP, Award Gold, Delete) apply to all currently selected students.</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </>
                );
            case 'awarding':
                 return (
                    <>
                        <AlertDialogTitle className="text-2xl">Awarding XP & Gold</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                             <div className="text-base text-black space-y-4">
                                <p>You can award Experience Points (XP) and Gold to students individually or in groups.</p>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li><strong>Select Students:</strong> On the dashboard, click the checkbox on the cards of the students you want to reward. Use "Select All" for the whole class.</li>
                                    <li><strong>Click Award Button:</strong> Click either the "Award Experience" or "Award Gold" button at the top of the dashboard.</li>
                                    <li><strong>Enter Amount:</strong> A dialog will appear. Enter the amount you wish to give. You can also enter a negative number to subtract points.</li>
                                    <li><strong>Confirm:</strong> Click "Confirm Award". The points will be applied, and any level-ups (from XP), HP, or MP gains will be calculated automatically.</li>
                                </ol>
                                <p className="font-semibold">Note: You can also set a stat to a specific number by clicking directly on it within a student's card.</p>
                            </div>
                        </AlertDialogDescription>
                    </>
                );
            case 'rewards':
                return (
                    <>
                        <AlertDialogTitle className="text-2xl">Managing Guild Rewards</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="text-base text-black space-y-4">
                                <p><strong>Guild Rewards</strong> are custom real-world or in-game perks you can create for your students to purchase with their Gold.</p>
                                <h4 className="font-bold mt-2">Creating Rewards</h4>
                                <p>From your main Podium, navigate to Game Management &gt; Guild Rewards. Here, you can click "Create New Reward" to design a new item. You can set its name, description, cost, and image. You can also decide if a purchase requires your approval.</p>
                                <h4 className="font-bold mt-2">Managing Rewards</h4>
                                <p>On the Guild Rewards page, you can see all the rewards you've created. Each card has controls to:</p>
                                <ul className="list-disc list-inside">
                                    <li><strong>Toggle Visibility:</strong> Make a reward visible or hidden from the student store.</li>
                                    <li><strong>Edit:</strong> Change any of the reward's details.</li>
                                    <li><strong>Delete:</strong> Permanently remove the reward.</li>
                                </ul>
                                <h4 className="font-bold mt-2">Student Experience</h4>
                                <p>Students browse and purchase visible rewards in "The Vault". If a reward requires approval, you will see a request on your Guild Rewards page. Students use their purchased rewards from the "My Inventory" page.</p>
                            </div>
                        </AlertDialogDescription>
                    </>
                );
            case 'quests':
                return (
                    <>
                        <AlertDialogTitle className="text-2xl">Creating Quests & Chapters</AlertDialogTitle>
                         <AlertDialogDescription asChild>
                           <div className="text-base text-black space-y-4">
                                <p>The Quest system is how you deliver your curriculum content through a story.</p>
                                <Image src="https://placehold.co/800x400.png" alt="Placeholder for quest creation screenshot" width={800} height={400} className="rounded-lg border" data-ai-hint="quest map" />
                                <h3 className="font-bold">Key Concepts:</h3>
                                <ul className="list-disc list-inside space-y-2">
                                    <li><strong>Quest Hubs:</strong> Think of these as main story areas or units (e.g., "The Kingdom of Fractions," "The Forest of Verbs"). Each Hub has its own map and can contain multiple chapters. They appear on the World Map.</li>
                                    <li><strong>Chapters:</strong> These are the individual lessons within a Hub. Each chapter has a "Story" tab and a "Lesson" tab, allowing you to separate the narrative from the academic content.</li>
                                </ul>
                                <h3 className="font-bold">How to Create:</h3>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Navigate to "Manage Quests" from the dashboard.</li>
                                    <li>Click "Create New Quest".</li>
                                    <li>First, either select an existing Hub or choose to create a new one by providing its name, map URL, and position on the world map.</li>
                                    <li>Next, fill out the content for your new Chapter, including its title, story, lesson, and any images or videos.</li>
                                    <li>Finally, click and drag the icon on the Hub map to position your new chapter.</li>
                                </ol>
                            </div>
                        </AlertDialogDescription>
                    </>
                );
            case 'battles':
                return (
                    <>
                        <AlertDialogTitle className="text-2xl">Running Boss Battles</AlertDialogTitle>
                         <AlertDialogDescription asChild>
                             <div className="text-base text-black space-y-4">
                                <p>Boss Battles are live, timed quiz games for the whole class.</p>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li><strong>Create a Battle:</strong> Go to "Manage Boss Battles" and click "Create New". Give it a name, a boss image/video, and add your questions, answers, and the HP damage for incorrect answers.</li>
                                    <li><strong>Start the Battle:</strong> From the battles list, click "Start Battle". This opens the waiting room for students.</li>
                                    <li><strong>Run the Battle:</strong> On the Live Battle Control Panel, you will advance the game:
                                        <ul className="list-disc list-inside ml-6">
                                            <li>Click "Start First Question" to begin.</li>
                                            <li>Click "End Round" to start a 10-second countdown for students to lock in answers.</li>
                                            <li>After the timer, results are shown. Click "Next Question" to proceed.</li>
                                        </ul>
                                    </li>
                                    <li><strong>End the Battle:</strong> When you're done, click "End Battle". This calculates all rewards, saves a summary report, and directs students to their results.</li>
                                </ol>
                             </div>
                        </AlertDialogDescription>
                    </>
                );
             case 'tools':
                return (
                    <>
                        <AlertDialogTitle className="text-2xl">Using Classroom Tools</AlertDialogTitle>
                         <AlertDialogDescription asChild>
                           <div className="text-base text-black space-y-4">
                                <p>The Classroom Tools are utilities to help you manage your class with a fantasy theme.</p>
                                <ul className="list-disc list-inside space-y-2">
                                    <li><strong>Mystical Clock:</strong> A themed timer and stopwatch.</li>
                                    <li><strong>Sleeping Dragon:</strong> A noise monitor. The dragon on screen wakes up if the class gets too loud!</li>
                                    <li><strong>Call to Duty:</strong> A random student selector.</li>
                                    <li><strong>A Task from the Throne:</strong> An AI-powered generator for quick, fun, fantasy-themed classroom activities (e.g., "Draw a mythical creature").</li>
                                    <li><strong>Group Guilder:</strong> Randomly sorts your students into named groups or "guilds".</li>
                                    <li><strong>The Royal Scribe:</strong> An AI-powered generator for grade-specific writing prompts.</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                    <Card className="text-center">
                        <CardHeader>
                            <CardTitle className="text-3xl">Help Center</CardTitle>
                            <CardDescription>Find answers and instructions on how to use the Academy of Heroes platform.</CardDescription>
                        </CardHeader>
                    </Card>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {helpTopics.map(topic => (
                            <Card key={topic.id} className="hover:border-primary hover:shadow-lg transition-all cursor-pointer" onClick={() => setActiveDialog(topic.id)}>
                                <CardHeader className="items-center text-center">
                                    {topic.icon}
                                    <CardTitle className="mt-2">{topic.title}</CardTitle>

                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{topic.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
                 <AlertDialog open={!!activeDialog} onOpenChange={(open) => !open && setActiveDialog(null)}>
                    <AlertDialogContent className="max-w-3xl">
                        <AlertDialogHeader>
                           {renderDialogContent()}
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction>Got it!</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </div>
    );
}
