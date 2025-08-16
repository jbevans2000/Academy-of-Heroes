
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dices, RefreshCw, Loader2 } from 'lucide-react';
import { generateActivity, type Activity } from '@/ai/flows/activity-generator';


export default function RandomActivityPage() {
    const router = useRouter();
    const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateActivity = async () => {
        setIsLoading(true);
        setCurrentActivity(null);
        try {
            const activity = await generateActivity();
            setCurrentActivity(activity);
        } catch (error) {
            console.error("Error generating activity:", error);
            // Optionally, show a toast notification to the user
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="flex min-h-screen w-full flex-col"
            style={{
                backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Aug%2016%2C%202025%2C%2009_52_37%20PM.png?alt=media&token=c138d6cf-3580-4161-9f93-1678122d25d1')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/tools')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Tools
                    </Button>
                    <Card className="shadow-2xl text-center bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex justify-center mb-2">
                                <Dices className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle className="text-3xl text-black">A Task from the Throne</CardTitle>
                            <CardDescription className="text-black">Click the button below to get a new fun, fantasy-themed activity for your class!</CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-[200px] flex items-center justify-center">
                            {isLoading ? (
                                 <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            ) : currentActivity ? (
                                <div className="p-6 border-2 border-dashed border-primary rounded-lg bg-background animate-in fade-in-50">
                                    <h3 className="text-2xl font-bold font-headline text-black">{currentActivity.title}</h3>
                                    <p className="text-black mt-2">{currentActivity.description}</p>
                                </div>
                            ) : (
                                <p className="text-black">Click the button to generate an activity!</p>
                            )}
                        </CardContent>
                    </Card>
                     <Button size="lg" className="w-full text-xl py-8" onClick={handleGenerateActivity} disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="mr-4 h-6 w-6 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-4 h-6 w-6" />
                        )}
                        Generate New Activity!
                    </Button>
                </div>
            </main>
        </div>
    );
}
