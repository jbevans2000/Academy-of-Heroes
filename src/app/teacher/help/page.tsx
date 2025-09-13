
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
import { ArrowLeft, BookOpen, Swords, Wrench, Star, UserPlus, LayoutDashboard, Copy, Gift, DatabaseZap, Users, Briefcase, Sparkles, User as UserIcon, Coins, Heart, Zap, Gamepad2, School, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


interface TeacherData {
    classCode: string;
}

export default function TeacherHelpPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
            toast({ title: "Guild Code Copied!", description: "You can now share it with your students." });
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
                <div className="max-w-4xl mx-auto space-y-8">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Podium
                    </Button>
                    <Card className="text-center">
                        <CardHeader>
                            <CardTitle className="text-3xl">The Grandmaster's Guide</CardTitle>
                            <CardDescription>A complete guide to managing your guild and leading your students to victory.</CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><UserPlus className="text-primary"/> Teacher Features</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="signup">
                                    <AccordionTrigger className="text-lg">Student Sign-Up</AccordionTrigger>
                                    <AccordionContent className="prose dark:prose-invert max-w-none">
                                        <p>To get students into your class, they need your unique Guild Code. The process is simple:</p>
                                        <ol>
                                            <li>Direct students to the application's home page.</li>
                                            <li>They click "Forge Your Hero & Join a Guild".</li>
                                            <li>They enter your Guild Code: <strong className="font-mono text-primary bg-primary/10 p-1 rounded-md">{teacherData?.classCode}</strong> <Button size="sm" variant="ghost" onClick={copyClassCode}><Copy className="w-4 h-4 mr-1"/>Copy</Button></li>
                                            <li>They fill out the form, choosing a login method (email or username), class, and avatar.</li>
                                        </ol>
                                        <p>Once they register, their application will appear in the "Pending Approvals" dialog on your main Podium, where you must approve them to grant access.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="dashboard">
                                    <AccordionTrigger className="text-lg">Podium (Main Dashboard)</AccordionTrigger>
                                    <AccordionContent className="prose dark:prose-invert max-w-none">
                                        <p>The Podium is your central command center. Here’s a breakdown:</p>
                                        <ul>
                                            <li><strong>Student Roster:</strong> View all your students at a glance, with key stats like Level, HP, MP, XP, and Gold.</li>
                                            <li><strong>Stat Editing:</strong> Click directly on a student's XP, Gold, HP, or MP on their card to manually set a new value. This is useful for quick corrections.</li>
                                            <li><strong>Student Selection:</strong> Use the checkboxes on each card to select one or more students. Use "Select All" to target everyone. Selected students can be awarded points in bulk, archived, or have their quest progress set.</li>
                                             <li><strong>Awarding Points:</strong> Use the "Bestow Experience" and "Bestow Gold" buttons to give or take points from all selected students.</li>
                                             <li><strong>Student Details:</strong> Click "View Details" to see a student's dashboard exactly as they see it. Use the pencil icons on their card to edit their name or character name.</li>
                                            <li><strong>Dropdown Menus:</strong> All major features are accessible from the "Game Management" and "Classroom" dropdowns at the top of the page.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="quests">
                                    <AccordionTrigger className="text-lg">Quest Archives (Content Management)</AccordionTrigger>
                                    <AccordionContent className="prose dark:prose-invert max-w-none">
                                        <p>This is where you build your educational adventure. Access it via `Game Management &gt; The Quest Archives`.</p>
                                        <ul>
                                            <li><strong>Quest Hubs:</strong> These are the main zones on your World Map (e.g., "Unit 1: The Crystal Mountains"). Each Hub has its own regional map where you place Chapters. You can create a Hub from the Quest Archives page.</li>
                                            <li><strong>Chapters:</strong> These are your individual lessons. Each Chapter has a "Story" tab for narrative and a "Lesson" tab for curriculum content. You can add text, images, and YouTube videos.</li>
                                            <li><strong>Quizzes:</strong> You can add an optional multiple-choice quiz to the end of any chapter to test student knowledge.</li>
                                            <li><strong>Quest Completion:</strong> In `Classroom &gt; Manage Quest Completion`, you can set a global rule requiring your approval for students to advance chapters. You can also override this setting for individual students or manually set any student's progress to a specific chapter.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="boons-rewards">
                                    <AccordionTrigger className="text-lg">Guild Rewards & The Workshop</AccordionTrigger>
                                    <AccordionContent className="prose dark:prose-invert max-w-none">
                                        <p>You can create custom real-world or in-game perks for students to buy with their earned Gold.</p>
                                        <ul>
                                            <li><strong>Guild Rewards (`Game Management &gt; Guild Rewards`):</strong> This is your workshop. Create new rewards, edit existing ones, and toggle their visibility in the student store ("The Vault").</li>
                                            <li><strong>Pending Approvals:</strong> If a reward requires your approval, student purchase requests will appear here for you to accept or deny.</li>
                                            <li><strong>Manage Rewards (`Classroom &gt; Manage Rewards`):</strong> This page provides a master table allowing you to manually add or remove any reward from any student's inventory at any time.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="battles">
                                    <AccordionTrigger className="text-lg">Boss Battles & Training Grounds</AccordionTrigger>
                                    <AccordionContent className="prose dark:prose-invert max-w-none">
                                        <p>Engage your class with two forms of combat-based quizzing.</p>
                                        <ul>
                                            <li><strong>Boss Battles (`Game Management &gt; The Field of Battle`):</strong> Create multiple-choice quizzes that the whole class can fight together in real-time. Students join from their dashboards to answer questions on their own devices. Their combined effort damages the boss.</li>
                                            <li><strong>Training Grounds (Duels) (`Game Management &gt; The Training Grounds`):</strong> This is a Player vs. Player (PvP) system. You create sections of questions, and students can challenge each other to 1v1 duels using the questions from the active sections. You can set XP/Gold rewards, entry costs, and daily duel limits.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="tools">
                                    <AccordionTrigger className="text-lg">The Guild Leader's Toolkit</AccordionTrigger>
                                    <AccordionContent className="prose dark:prose-invert max-w-none">
                                        <p>A suite of utilities to help manage your classroom with a fantasy theme. Access it via `Game Management &gt; The Guild Leader's Toolkit`.</p>
                                         <ul>
                                            <li><strong>Mystical Clock:</strong> A themed timer and stopwatch.</li>
                                            <li><strong>Sleeping Dragon:</strong> A noise monitor. The dragon on screen wakes up if the class gets too loud!</li>
                                            <li><strong>The Runes of Destiny:</strong> A random student selector.</li>
                                            <li><strong>Find the Champion:</strong> A tool to randomly select a "Champion" from students who have volunteered. Great for calling on a student to answer for their team.</li>
                                            <li><strong>A Task from the Throne:</strong> An AI-powered generator for quick, fun, fantasy-themed classroom activities.</li>
                                            <li><strong>Group Guilder:</strong> Randomly sorts your students into groups.</li>
                                            <li><strong>The Royal Scribe:</strong> An AI-powered generator for grade-specific writing prompts.</li>
                                            <li><strong>Wheel of Fate:</strong> A customizable spinning wheel for random classroom events.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="data-tools">
                                    <AccordionTrigger className="text-lg">Data & Account Management</AccordionTrigger>
                                    <AccordionContent className="prose dark:prose-invert max-w-none">
                                         <ul>
                                            <li><strong>Message Center:</strong> Send and receive private messages with your students from the main Podium.</li>
                                            <li><strong>Data Migration Tool:</strong> A powerful tool for when a student who used a "Username" login (not an email) forgets their password. It allows you to transfer all their game progress to a newly created account.</li>
                                            <li><strong>Archived Heroes:</strong> View students who have been archived after a data migration. You can restore them from this page.</li>
                                            <li><strong>The Chronicler's Scroll (Game Log):</strong> A real-time log of all major events happening in your game, from logins to quest completions.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> Student-Facing Features</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="s-dashboard">
                                    <AccordionTrigger className="text-lg">The Student Dashboard</AccordionTrigger>
                                    <AccordionContent className="prose dark:prose-invert max-w-none">
                                        <p>This is the student's main screen. They can see their character, stats (HP, MP, Level, etc.), and access all other features.</p>
                                         <ul>
                                            <li><strong>Ready for Battle:</strong> Students click this to join a live Boss Battle you have started.</li>
                                            <li><strong>Embark on Your Quest:</strong> Takes them to the World Map to continue their quests.</li>
                                            <li><strong>Training Grounds:</strong> Opens a dialog where they can challenge other online students to a duel.</li>
                                             <li><strong>The Forge:</strong> A new screen where students can customize their 2D and 3D character appearance using items they own.</li>
                                             <li><strong>The Vault:</strong> The store where students can spend Gold on Rewards you've created.</li>
                                             <li><strong>My Inventory:</strong> A page to view and use the Rewards they have purchased.</li>
                                             <li><strong>Champion Status:</strong> A toggle on their stats card allows them to volunteer to be a "Champion," making them eligible for selection in the "Find the Champion" tool.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="s-powers">
                                    <AccordionTrigger className="text-lg">Class Powers</AccordionTrigger>
                                    <AccordionContent className="prose dark:prose-invert max-w-none">
                                        <p>Each class—Guardian, Healer, and Mage—has a unique set of 8 powers they unlock as they level up. These powers can be used during live Boss Battles to help the party.</p>
                                        <ul>
                                            <li><strong>Guardians (<Shield className="inline h-5 w-5 text-amber-500"/>):</strong> Focus on defense, protecting allies, and taking damage for others.</li>
                                            <li><strong>Healers (<Heart className="inline h-5 w-5 text-green-500"/>):</strong> Focus on restoring HP, reviving fallen allies, and providing utility like removing wrong answers.</li>
                                            <li><strong>Mages (<Wand2 className="inline h-5 w-5 text-blue-500"/>):</strong> Focus on dealing extra damage and restoring MP to their allies.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
}
