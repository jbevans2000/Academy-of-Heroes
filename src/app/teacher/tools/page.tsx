
'use client';

import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Timer, Volume2, Users, Dices, Wrench, Swords, ScrollText, DatabaseZap, Sparkles, ImageIcon, Archive, Edit, Diamond, Box } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const tools = [
    {
        title: 'Mystical Clock',
        description: 'A fantasy-themed timer or stopwatch for classroom activities.',
        icon: <Timer className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/timer',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fmystical%20clock.jpg?alt=media&token=5374acb2-6f27-43fe-a9b8-036184f9c810',
    },
    {
        title: 'Sleeping Dragon',
        description: 'A tool to motivate quiet. Don\'t wake the sleeping dragon!',
        icon: <Volume2 className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/sleeping-dragon',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2FSleeping%20Dragon.jpg?alt=media&token=97f4f83a-f195-47ca-9a8f-bde50dfa5e48'
    },
    {
        title: 'The Runes of Destiny',
        description: 'Draw from the runes to summon a hero for a task.',
        icon: <Sparkles className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/random-student',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-01eb6e6f-c49f-49a6-8296-3b97d092a4c2.jpg?alt=media&token=6fe54bce-fef4-4ad1-92a2-fdef04425008',
    },
    {
        title: 'A Task from the Throne',
        description: 'Get fun, fantasy-themed activities for the class to do in real time.',
        icon: <Dices className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/random-activity',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-5eb79f48-b727-4971-a208-eb220e1a80f7.jpg?alt=media&token=4029ebc5-ca5f-4408-a498-20f0751c1853',
    },
    {
        title: 'Group Guilder',
        description: 'Randomly sort students into guilds for collaborative quests.',
        icon: <Swords className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/group-generator',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-9fea0033-c484-4895-89c9-96ebfc378536.jpg?alt=media&token=c79f89e7-5a39-4816-8ad2-a0a22ec316d4',
    },
    {
        title: 'The Royal Scribe',
        description: 'Generate grade-specific writing prompts for fiction and non-fiction.',
        icon: <ScrollText className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/the-royal-scribe',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-061eec79-9062-4e42-a63e-0458bee737cd.jpg?alt=media&token=6077d818-0966-4653-b533-1d97e6c33d31',
    },
    {
        title: 'The Wheel of Fate',
        description: 'Spin the wheel to get a random classroom event from your custom list.',
        icon: <Dices className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/wheel-of-fate',
        editPath: '/teacher/tools/wheel-of-fate/edit',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2FWheel%20of%20Fate%20Background.jpg?alt=media&token=b5fe255d-9897-495d-bbde-1ddcb2d05e49',
    }
];

const adminTools = [
     {
        title: 'Global 2D Forge',
        description: 'Create and manage all 2D cosmetic items like armor and hairstyles.',
        icon: <Diamond className="h-10 w-10 text-primary" />,
        path: '/admin/tools/global-forge',
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-a2624b42-7576-444f-8012-6188e7f1d441.jpg?alt=media&token=96357608-7264-4458-963d-b4b6006e8b7c'
    },
     {
        title: 'Global 3D Forge',
        description: 'Upload and manage all .glb 3D models for assets.',
        icon: <Box className="h-10 w-10 text-primary" />,
        path: '/admin/tools/global-3d-forge',
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-4f51e3c8-a9f8-4177-84f9-b88f3430541e.jpg?alt=media&token=3b3104e1-e129-4598-a3f2-8951214e217d'
    },
    {
        title: 'Hair Sizer',
        description: 'Position and scale hairstyles on different body types.',
        icon: <Wrench className="h-10 w-10 text-primary" />,
        path: '/admin/tools/hair-sizer',
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-e358b5a0-a029-450f-90e6-799c424d1668.jpg?alt=media&token=9ac606d2-31f4-41d6-8480-e889a7414704'
    },
    {
        title: 'Armor Sizer',
        description: 'Position and scale armor pieces on different body types.',
        icon: <Wrench className="h-10 w-10 text-primary" />,
        path: '/admin/tools/armor-sizer',
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-3b24f5a3-f094-4b55-83c9-04c94483a992.jpg?alt=media&token=81d227c8-89c0-432a-af94-d4b998a44d03'
    },
];

export default function ClassroomToolsPage() {
    const router = useRouter();

    const ToolCard = ({ tool }: { tool: (typeof tools[0] & { editPath?: string }) | typeof adminTools[0] & { disabled?: boolean } }) => (
        <Card className="relative flex flex-col justify-between h-64 p-6 rounded-lg overflow-hidden border shadow-sm bg-card transition-transform hover:scale-105 group">
            <div className="absolute inset-0">
                <Image
                    src={tool.bgImage}
                    alt={`${tool.title} background`}
                    fill
                    className="object-cover"
                    data-ai-hint="fantasy background"
                />
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-colors" />
            </div>
            <div className="relative z-10 flex flex-col h-full text-white">
                <div className="flex items-center gap-4 mb-2">
                    {tool.icon}
                    <h3 className="text-xl font-bold">{tool.title}</h3>
                </div>
                <p className="text-sm text-white/80 flex-grow">{tool.description}</p>
                <div className="mt-auto flex gap-2">
                    <Link href={tool.disabled ? '#' : tool.path} passHref className="flex-1">
                        <Button className="w-full" variant="secondary" disabled={tool.disabled}>
                            {tool.disabled ? "Coming Soon" : "Launch Tool"}
                        </Button>
                    </Link>
                    {'editPath' in tool && tool.editPath && (
                        <Link href={tool.editPath} passHref>
                            <Button variant="outline" size="icon">
                                <Edit className="h-4 w-4" />
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </Card>
    );

    return (
        <div className="relative min-h-screen w-full flex flex-col">
            <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-32456d61-e39a-4301-8c45-cd0f0ff33e52.jpg?alt=media&token=5ffefaa6-38e0-4661-8ae5-be3b004d855e')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.5,
                }}
            />
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')} className="bg-background/80 hover:bg-background/90">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dais
                    </Button>

                    <div className="p-6 rounded-lg bg-background/80 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <Wrench className="h-8 w-8 text-primary" />
                            <div>
                                <h1 className="text-3xl font-bold">The Guild Leader's Toolkit</h1>
                                <p className="text-black">A collection of useful utilities to help manage your classroom with a fantasy twist.</p>
                            </div>
                        </div>
                    </div>
                     <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {tools.map((tool, index) => (
                           <ToolCard key={index} tool={tool} />
                        ))}
                    </div>
                    
                    <div className="pt-8">
                         <div className="p-6 rounded-lg bg-red-900/80 backdrop-blur-sm text-white">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold">Master Admin Forges</h2>
                                    <p>Tools for creating and managing global game assets.</p>
                                </div>
                            </div>
                        </div>
                         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
                             {adminTools.map((tool, index) => (
                               <ToolCard key={index} tool={tool} />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
