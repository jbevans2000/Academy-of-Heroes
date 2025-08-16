
'use client';

import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Timer, Volume2, Users, Dices, Wrench, Swords, ScrollText, DatabaseZap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
        title: 'Call to Duty',
        description: 'Randomly select a student to answer a question or complete a task.',
        icon: <Users className="h-10 w-10 text-primary" />,
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
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2FGroup%20Guilder.jpg?alt=media&token=8e9b015e-8a29-4f7f-8591-62d98d898a33',
    },
    {
        title: 'The Royal Scribe',
        description: 'Generate grade-specific writing prompts for fiction and non-fiction.',
        icon: <ScrollText className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/the-royal-scribe',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-4f51950d-83b5-4b55-8664-8178a9c277f0.jpg?alt=media&token=c2c101cb-e71e-42c2-b5e1-85b6727a8581',
    },
    {
        title: 'Database Migration',
        description: 'One-time tool to move collections to their correct location.',
        icon: <DatabaseZap className="h-10 w-10 text-destructive" />,
        path: '/teacher/tools/migration',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Classroom%20Tools%20Images%2Fenvato-labs-ai-7e04f981-d101-449e-b816-f3316bca8b6f.jpg?alt=media&token=0ac161be-a083-42e7-8b01-f51c72ea8c80',
    }
]

export default function ClassroomToolsPage() {
    const router = useRouter();

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
                        Back to Dashboard
                    </Button>
                    <div className="p-6 rounded-lg bg-background/80 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <Wrench className="h-8 w-8 text-primary" />
                            <div>
                                <h1 className="text-3xl font-bold">Classroom Tools</h1>
                                <p className="text-black">A collection of useful utilities to help manage your classroom with a fantasy twist.</p>
                            </div>
                        </div>
                    </div>
                     <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {tools.map((tool, index) => (
                             <Link href={tool.disabled ? '#' : tool.path} key={index} className={cn("group", tool.disabled && "pointer-events-none")}>
                                <div className="relative flex flex-col justify-between h-64 p-6 rounded-lg overflow-hidden border shadow-sm transition-transform hover:scale-105 bg-card">
                                    <div className="absolute inset-0">
                                        <Image
                                            src={tool.bgImage}
                                            alt={`${tool.title} background`}
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-colors" />
                                    </div>
                                    <div className="relative z-10 flex flex-col h-full text-white">
                                        <div className="flex items-center gap-4 mb-2">
                                            {tool.icon}
                                            <h3 className="text-xl font-bold">{tool.title}</h3>
                                        </div>
                                        <p className="text-sm text-white/80">{tool.description}</p>
                                        <div className="mt-auto">
                                            <Button className="w-full" variant={tool.title === 'Database Migration' ? 'destructive' : 'secondary'} disabled={tool.disabled}>
                                                {tool.disabled ? "Coming Soon" : "Launch Tool"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
