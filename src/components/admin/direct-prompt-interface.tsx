
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { directPrompt } from '@/ai/flows/direct-prompt';
import { useToast } from '@/hooks/use-toast';

export function DirectPromptInterface() {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!prompt.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Prompt cannot be empty.' });
            return;
        }
        setIsLoading(true);
        setResponse('');
        try {
            const result = await directPrompt(prompt);
            setResponse(result);
        } catch (error: any) {
            setResponse(`Error: ${error.message}`);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to get a response from the AI.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Direct Prompt Interface
                </CardTitle>
                <CardDescription>
                    Send a direct prompt to the Gemini model to test its responses and ensure the API connection is working.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="Enter your prompt here..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    disabled={isLoading}
                />
                <Button onClick={handleSubmit} disabled={isLoading || !prompt.trim()}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send Prompt
                </Button>
                {response && (
                    <Card className="mt-4 bg-secondary">
                        <CardHeader>
                            <CardTitle>Gemini Response</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="whitespace-pre-wrap font-sans text-sm">{response}</pre>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
        </Card>
    );
}
