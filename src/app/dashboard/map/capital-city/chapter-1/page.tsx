
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
                            You sit at a long oak table, reviewing notes on the aether-blooming fungi, a species known for its unique ability to thrive on both magical and biological energy. The delicate balance of its growth fascinates you—the way it mutates based on its surroundings, shifting between nourishment and toxin. You make a note in the margin of your journal when suddenly-- A shadow falls across your work.
                        </p>
                        <p className="px-4">
                            Looking up, you see a short, balding man draped in the unmistakable crimson robes of a Royal Herald. His presence is striking—not because of his stature, but because of the silence that follows him. Conversations dull to murmurs. Scholars avert their gazes. Without a word, he places a scroll of yellowed vellum onto the table in front of you. The wax seal is unmistakable--a phoenix entwined with a double helix of golden serpents—the emblem of the Emperor and Empress themselves.
                        </p>
                        <p className="px-4">
                            Then, in a voice that is calm, measured, and absolute, he speaks: "You are hereby summoned to the Royal Court of the Emperor and Empress to continue your studies in the field. This matter is of utmost importance, as you have been identified as an individual who is vital to the future security of the Realm." And just like that--he turns and leaves.
                        </p>
                         <p className="px-4">
                            You stare at the scroll. It almost doesn’t feel real. Your first thought is that it must be a joke. A prank, perhaps, from one of your fellow scholars. But the weight of the parchment in your hands says otherwise. It is thick, official, with golden veins running through the vellum, shimmering under the library’s candlelight. No forger would go to such lengths.
                        </p>
                        <p className="px-4">
                            Your second thought is far more unsettling--are you in trouble? Your studies in the Biological Arts have been respectable, but hardly exceptional. You are no prodigy in Symbiotic Mysteries, nor a pioneer in Metamorphic Studies of Transmutative Anatomy. You are a student. Nothing more. So why summon you?
                        </p>
                        <p className="px-4">
                            You unroll the scroll and read the words that confirm the impossible. Ten days hence, when the Winter Sun hangs lowest in the sky, you are to present yourself at the Royal Court. A summons from the Emperor and Empress. A summons that cannot be ignored.
                        </p>
                        <Separator />
                        <div className="flex justify-center">
                            <Image
                                src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Chapter%20Images%2Fdcdd4586-fb9e-40d3-b8ca-82fa382c132e_orig%5B1%5D.png?alt=media&token=72ea2558-c5bd-47f5-a4b1-92b635fa92dc"
                                alt="A mysterious scroll"
                                width={800}
                                height={400}
                                className="rounded-lg shadow-lg border"
                                data-ai-hint="scroll letter"
                            />
                        </div>
                        <Separator />
                        <p className="px-4">
                            In the hours that follow, you prepare for your journey, but something feels wrong. At first, it’s just hushed voices in the library. Conversations that end the moment you step too close. Nervous glances. Concerned whispers among your fellow scholars.
                        </p>
                        <p className="px-4">
                            Then, you begin hearing the rumors. "Did you hear? The livestock in the southern farms are aging too fast. A calf was born last week, and by the third day, it had fully matured—then collapsed, as if its body couldn’t sustain itself."
                        </p>
                         <p className="px-4">
                            "It’s not just animals. The royal gardens had to be burned last night. The plants… changed. Their roots fused together, moving like they were searching for something. As if they were alive."
                        </p>
                        <p className="px-4">
                            "A scholar from the Western Academy collapsed yesterday. His hands—covered in lesions. The healers examined him, and they said his tissue was… mutating. As if something was rewriting him on a cellular level."
                        </p>
                        <p className="px-4">
                            Your pulse quickens. Biology does not work like this. Organisms do not age overnight, plants do not merge into abominations, and people do not mutate for no reason. Something is happening to Luminaria. And whatever it is--it’s the reason you were summoned.
                        </p>
                        <p className="px-4">
                            When the following morning arrives, you leave the library behind. The path before you leads straight to the Royal Court. But you no longer feel like a student. You feel like a scientist searching for answers. Because if the rumors are true, then life itself is unraveling. And you are walking straight into the heart of it.
                        </p>
                        <Separator />
                        <div className="flex justify-center">
                            <Image
                                src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Chapter%20Images%2Ftwig-with-leaves-curved-wavy-free-vector%5B1%5D.jpg?alt=media&token=9958448c-9456-4279-9433-e8a00cb638e5"
                                alt="A decorative twig"
                                width={200}
                                height={100}
                                className="rounded-lg"
                                data-ai-hint="twig decoration"
                            />
                        </div>
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
