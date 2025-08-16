
'use client';

import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Timer, Volume2, Users, Dices, Wrench } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const tools = [
    {
        title: 'Fantasy Timer',
        description: 'A fantasy-themed timer or stopwatch for classroom activities.',
        icon: <Timer className="h-10 w-10 text-primary" />,
        path: '/teacher/tools/timer',
        disabled: true,
        bgImage: '',
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
        bgImage: '',
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
                <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                    <Card className="shadow-lg">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Wrench className="h-8 w-8 text-primary" />
                                <div>
                                    <CardTitle className="text-3xl">Classroom Tools</CardTitle>
                                    <CardDescription>A collection of useful utilities to help manage your classroom with a fantasy twist.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6 md:grid-cols-2">
                                {tools.map((tool, index) => (
                                    <Card key={index} className="flex flex-col relative overflow-hidden">
                                        {tool.bgImage && (
                                            <>
                                                <Image 
                                                    src={tool.bgImage}
                                                    alt={tool.title}
                                                    fill
                                                    className="object-cover opacity-10"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/50" />
                                            </>
                                        )}
                                        <div className="relative z-10 flex flex-col flex-grow">
                                            <CardHeader className="flex flex-row items-center gap-4">
                                                {tool.icon}
                                                <div>
                                                    <CardTitle>{tool.title}</CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                <p className="text-muted-foreground">{tool.description}</p>
                                            </CardContent>
                                            <div className="p-6 pt-0">
                                                <Button className="w-full" onClick={() => router.push(tool.path)} disabled={tool.disabled}>
                                                    {tool.disabled ? "Coming Soon" : "Launch Tool"}
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
