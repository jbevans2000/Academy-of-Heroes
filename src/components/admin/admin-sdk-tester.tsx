'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TestTube2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { testAdminSdkInitialization } from '@/ai/flows/test-admin-sdk';
import { Textarea } from '../ui/textarea';

interface TestResult {
    success: boolean;
    message: string;
    projectId?: string | null;
    error?: string;
}

export function AdminSdkTester() {
    const [result, setResult] = useState<TestResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleTest = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const testResult = await testAdminSdkInitialization();
            setResult(testResult);
            if (testResult.success) {
                toast({
                    title: 'Test Succeeded',
                    description: 'The Admin SDK is correctly configured.',
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Test Failed',
                    description: 'The Admin SDK is not initializing correctly. Check results for details.',
                });
            }
        } catch (error: any) {
            const errorResult = {
                success: false,
                message: "A critical error occurred while running the test function.",
                error: error.message,
            };
            setResult(errorResult);
            toast({ variant: 'destructive', title: 'Test Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TestTube2 className="h-6 w-6 text-primary" />
                    Admin SDK Initialization Test
                </CardTitle>
                <CardDescription>
                    Click the button to test if the server-side Firebase Admin SDK is initializing correctly.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleTest} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Run Initialization Test
                </Button>
                {result && (
                    <div className="mt-4 p-4 border rounded-md bg-secondary">
                        <h4 className="font-bold">Test Results:</h4>
                        <Textarea
                            readOnly
                            value={JSON.stringify(result, null, 2)}
                            className="mt-2 font-mono text-xs h-64 bg-background"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
