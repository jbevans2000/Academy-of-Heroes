
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { migrateData } from './actions';

export default function MigrateDataPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isFinished, setIsFinished] = useState(false);

    const handleStartMigration = async () => {
        setIsLoading(true);
        setIsFinished(false);
        setLogs([]);

        try {
            const result = await migrateData();
            setLogs(result.logs);

            if(result.success) {
                toast({
                    title: "Migration Complete!",
                    description: "All data has been successfully moved.",
                });
                setIsFinished(true);
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Migration Failed',
                    description: result.error,
                });
            }

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'An Unexpected Error Occurred',
                description: error.message || 'Please check the console for details.',
            });
             setLogs(prev => [...prev, `FATAL ERROR: ${error.message}`]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl">Firestore Data Migration Tool</CardTitle>
                            <CardDescription>
                                This tool will restructure your database to support multiple teachers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 border-l-4 border-yellow-500 bg-yellow-500/10 text-yellow-700 rounded-r-lg">
                                <div className="flex items-start">
                                    <AlertTriangle className="h-6 w-6 mr-3 text-yellow-500"/>
                                    <div>
                                        <h3 className="font-bold">Warning!</h3>
                                        <p>This is a one-time operation. Do not run this more than once. Running this tool will move all your top-level collections into a new structure. Please back up your data before proceeding if you have critical information.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full text-center">
                                <Button
                                    size="lg"
                                    onClick={handleStartMigration}
                                    disabled={isLoading || isFinished}
                                >
                                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    {isFinished ? 'Migration Complete' : 'Start Data Migration'}
                                </Button>
                            </div>

                            {(isLoading || logs.length > 0) && (
                                <div className="mt-4 p-4 border rounded-md bg-secondary h-64 overflow-y-auto font-mono text-sm">
                                    <p className="font-bold mb-2">Execution Log:</p>
                                    {logs.map((log, index) => (
                                        <p key={index} className="flex items-center">
                                            <span className="text-muted-foreground mr-2">{`[${index + 1}]`}</span>
                                            {log}
                                        </p>
                                    ))}
                                    {isFinished && (
                                        <p className="flex items-center text-green-600 font-bold mt-2">
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Successfully finished migration.
                                        </p>
                                    )}
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
