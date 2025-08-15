
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from "lucide-react";

export default function WorldMapPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center text-primary">World Map</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">The world map image will be displayed here.</p>
                    </div>
                </CardContent>
            </Card>
             <Button 
                onClick={() => router.back()} 
                className="mt-6"
                variant="outline"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
            </Button>
        </div>
    );
}
