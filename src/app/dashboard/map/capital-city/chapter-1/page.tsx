
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from "lucide-react";
import Image from 'next/image';
import { Separator } from "@/components/ui/separator";

export default function Chapter1Page() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-start bg-background p-2 md:p-4">
            <div className="w-full max-w-4xl space-y-4">
                <Card className="shadow-2xl">
                    <CardHeader className="text-center">
                        <p className="text-lg font-semibold text-primary">Chapter 1</p>
                        <CardTitle className="text-4xl font-bold">A Summons from the Throne</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-lg leading-relaxed">
                        <div className="flex justify-center">
                            <Image
                                src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Chapter%20Images%2F699033fa-5147-43c3-848f-182414887097_orig%5B1%5D.png?alt=media&token=363e71c9-5df5-4102-9138-120577b26b08"
                                alt="A grand throne room"
                                width={800}
                                height={400}
                                className="rounded-lg shadow-lg border"
                                data-ai-hint="throne room fantasy"
                                priority
                            />
                        </div>
                        <Separator />
                        <div className="flex justify-center">
                            <iframe 
                                width="800" 
                                height="400" 
                                src="https://www.youtube.com/embed/6agugBXAKqc" 
                                title="YouTube video player" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen
                                className="rounded-lg shadow-lg border">
                            </iframe>
                        </div>
                        <Separator />
                        <p className="px-4">
                            The crisp winter air bites at your cheeks as you make your way through the bustling streets of the Capitol. A messenger bearing the royal seal found you this morning, handing you a scroll with a simple, urgent message: "Your presence is requested at the Citadel. The King wishes to speak with you."
                        </p>
                        <p className="px-4">
                            Navigating through the crowds of merchants and nobles, you can't help but wonder what the summons could be about. It has been years since you were last called to the palace. As you approach the towering gates of the Citadel, the guards recognize you and grant you immediate entry. The grand halls echo with the quiet footsteps of courtiers, their whispers ceasing as you pass. Finally, you stand before the great oaken doors of the throne room. Taking a deep breath, you push them open and step inside.
                        </p>
                    </CardContent>
                </Card>
                <div className="flex justify-center">
                    <Button 
                        onClick={() => router.push('/dashboard/map/capital-city')} 
                        variant="outline"
                        size="lg"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Return to Quest Map
                    </Button>
                </div>
            </div>
        </div>
    );
}
