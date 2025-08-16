
'use client';

import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Timer, Volume2, Users, Dices, Wrench } from 'lucide-react';
import Link from 'next/link';

const tools = [
    {
        title: 'Mystical Clock',
        description: 'A fantasy-themed timer or stopwatch for classroom activities.',
        icon: <Timer className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/timer',
        disabled: true,
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
        title: 'Random Student Picker',
        description: 'Randomly select a student to answer a question or complete a task.',
        icon: <Users className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/random-student',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Aug%2016%2C%202025%2C%2009_52_37%20PM.png?alt=media&token=c138d6cf-3580-4161-9f93-1678122d25d1',
    },
    {
        title: 'Random Activity Generator',
        description: 'Get fun, fantasy-themed activities for the class to do in real time.',
        icon: <Dices className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/random-activity',
        disabled: false,
        bgImage: 'https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Aug%2016%2C%202025%2C%2009_52_37%20PM.png?alt=media&token=c138d6cf-3580-4161-9f93-1678122d25d1',
    }
]

export default function ClassroomToolsPage() {
    const router = useRouter();

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                    <div className="flex items-center gap-4">
                        <Wrench className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold">Classroom Tools</h1>
                            <p className="text-muted-foreground">A collection of useful utilities to help manage your classroom with a fantasy twist.</p>
                        </div>
                    </div>
                     <div className="grid gap-6 md:grid-cols-2">
                        {tools.map((tool, index) => (
                             <Link href={tool.disabled ? '#' : tool.path} key={index} className="group">
                                <div
                                    className="relative flex flex-col justify-between h-64 p-6 rounded-lg overflow-hidden border shadow-sm transition-transform hover:scale-105 bg-cover bg-center"
                                    style={{ backgroundImage: tool.bgImage ? `url(${tool.bgImage})` : 'none', backgroundColor: !tool.bgImage ? 'hsl(var(--card))' : '' }}
                                >
                                    <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-colors"></div>
                                    
                                    <div className="relative z-10 text-white">
                                        <div className="flex items-center gap-4 mb-2">
                                            {tool.icon}
                                            <h3 className="text-xl font-bold">{tool.title}</h3>
                                        </div>
                                        <p className="text-sm text-white/80">{tool.description}</p>
                                    </div>

                                    <div className="relative z-10">
                                        <Button className="w-full" variant="secondary" disabled={tool.disabled}>
                                            {tool.disabled ? "Coming Soon" : "Launch Tool"}
                                        </Button>
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
