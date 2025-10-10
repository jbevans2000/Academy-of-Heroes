
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Dna, Check, Sparkles } from 'lucide-react';

// --- DATA DEFINITIONS ---

type Allele = 'S' | 's' | 'C' | 'c' | 'E' | 'e' | 'N' | 'n' | 'F' | 'f' | 'A' | 'a' | 'H' | 'h' | 'W' | 'w' | 'T' | 't' | 'M' | 'm' | 'B' | 'b';
type Trait = 'Spikes on tail' | 'Clawed wings' | 'Eye color' | 'Neck length' | 'Fire breathing' | 'Armored belly' | 'Horns' | 'Wing size' | 'Tail type' | 'Magic affinity' | 'Body color';

interface TraitInfo {
  dominant: string;
  recessive: string;
  dominantAllele: Allele;
  recessiveAllele: Allele;
}

const geneticsKey: Record<Trait, TraitInfo> = {
  'Spikes on tail': { dominant: 'Spikes', recessive: 'No Spikes', dominantAllele: 'S', recessiveAllele: 's' },
  'Clawed wings': { dominant: 'Clawed', recessive: 'Not Clawed', dominantAllele: 'C', recessiveAllele: 'c' },
  'Eye color': { dominant: 'Red Eyes', recessive: 'Blue Eyes', dominantAllele: 'E', recessiveAllele: 'e' },
  'Neck length': { dominant: 'Long Neck', recessive: 'Short Neck', dominantAllele: 'N', recessiveAllele: 'n' },
  'Fire breathing': { dominant: 'Fire Breather', recessive: 'No Fire', dominantAllele: 'F', recessiveAllele: 'f' },
  'Armored belly': { dominant: 'Armored', recessive: 'Smooth', dominantAllele: 'A', recessiveAllele: 'a' },
  'Horns': { dominant: 'Horns', recessive: 'No Horns', dominantAllele: 'H', recessiveAllele: 'h' },
  'Wing size': { dominant: 'Large Wings', recessive: 'Small Wings', dominantAllele: 'W', recessiveAllele: 'w' },
  'Tail type': { dominant: 'Mace Tail', recessive: 'Pointed Tail', dominantAllele: 'T', recessiveAllele: 't' },
  'Magic affinity': { dominant: 'Magical', recessive: 'Non-magical', dominantAllele: 'M', recessiveAllele: 'm' },
  'Body color': { dominant: 'Green', recessive: 'Gold', dominantAllele: 'B', recessiveAllele: 'b' },
};

const silvaria: Record<Trait, [Allele, Allele]> = {
  'Spikes on tail': ['S', 's'],
  'Clawed wings': ['C', 'C'],
  'Eye color': ['e', 'e'],
  'Neck length': ['N', 'n'],
  'Fire breathing': ['F', 'f'],
  'Armored belly': ['A', 'a'],
  'Horns': ['H', 'h'],
  'Wing size': ['W', 'w'],
  'Tail type': ['t', 't'],
  'Magic affinity': ['M', 'M'],
  'Body color': ['B', 'b'],
};

const aurelio: Record<Trait, [Allele, Allele]> = {
  'Spikes on tail': ['s', 's'],
  'Clawed wings': ['C', 'c'],
  'Eye color': ['E', 'e'],
  'Neck length': ['n', 'n'],
  'Fire breathing': ['F', 'F'],
  'Armored belly': ['a', 'a'],
  'Horns': ['H', 'h'],
  'Wing size': ['W', 'W'],
  'Tail type': ['T', 't'],
  'Magic affinity': ['M', 'm'],
  'Body color': ['B', 'B'],
};

// --- COMPONENTS ---

const PunnettSquare = ({ trait, onSelectQuadrant }: { trait: Trait, onSelectQuadrant: (genotype: [Allele, Allele]) => void }) => {
    const parent1 = silvaria[trait];
    const parent2 = aurelio[trait];
    
    const quadrants: [Allele, Allele][] = [
        [parent1[0], parent2[0]],
        [parent1[1], parent2[0]],
        [parent1[0], parent2[1]],
        [parent1[1], parent2[1]],
    ];

    return (
        <div className="grid grid-cols-[2rem_1fr_1fr] grid-rows-[2rem_1fr_1fr] gap-1 font-mono">
            <div />
            <div className="flex items-center justify-center border rounded-md">{parent1[0]}</div>
            <div className="flex items-center justify-center border rounded-md">{parent1[1]}</div>
            <div className="flex items-center justify-center border rounded-md">{parent2[0]}</div>
            {quadrants.map((quadrant, i) => (
                <div 
                    key={i} 
                    className="flex items-center justify-center p-4 border rounded-md cursor-pointer hover:bg-primary/20 transition-colors text-2xl"
                    onClick={() => onSelectQuadrant(quadrant)}
                >
                    {quadrant[0]}{quadrant[1]}
                </div>
            ))}
            <div className="flex items-center justify-center border rounded-md">{parent2[1]}</div>
        </div>
    );
};

export default function GeneticsLabPage() {
    const router = useRouter();
    const [selectedTrait, setSelectedTrait] = useState<Trait>('Spikes on tail');
    const [hatchlingGenotype, setHatchlingGenotype] = useState<Partial<Record<Trait, [Allele, Allele]>>>({});

    const getPhenotype = (trait: Trait, alleles: [Allele, Allele]) => {
        const info = geneticsKey[trait];
        return alleles.includes(info.dominantAllele) ? info.dominant : info.recessive;
    };
    
    const allTraitsSelected = useMemo(() => {
        return Object.keys(geneticsKey).length === Object.keys(hatchlingGenotype).length;
    }, [hatchlingGenotype]);

    const handleSelectQuadrant = (genotype: [Allele, Allele]) => {
        setHatchlingGenotype(prev => ({
            ...prev,
            [selectedTrait]: genotype,
        }));
    };

    return (
        <div className="bg-muted/40">
            <TeacherHeader />
            <main className="p-4 md:p-6 lg:p-8">
                 <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
                    <p className="font-bold">Instructions for the Activity</p>
                    <pre className="whitespace-pre-wrap font-sans">
                        {`
Dragon Genetics is a fun and interactive way to learn about dominant and recessive traits. In this activity, you will play the role of a dragon geneticist, tasked with determining the traits of a new hatchling based on the genetic information of its parents, Silvaria and Aurelio.

    1. Choose a Trait: Start by selecting a genetic trait from the list provided. Each trait is controlled by a pair of alleles (letters), one inherited from each parent.
    
    2. Analyze the Punnett Square: For your chosen trait, the Punnett Square shows the possible allele combinations for the offspring. Silvaria's alleles are at the top, and Aurelio's are on the side.
    
    3. Determine the Hatchling's Trait: Click on one of the four quadrants in the Punnett Square. This will be your hatchling's genotype (the combination of alleles) for that trait.
    
    4. Repeat for All Traits: Continue this process for all the available traits. As you make your selections, your hatchling's characteristics will be revealed below.
    
    5. Reveal Your Dragon: Once you have determined all the traits, you will see a complete description of your unique dragon hatchling!
                        `}
                    </pre>
                </div>
                <Button variant="outline" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <div className="max-w-6xl mx-auto space-y-6">
                    <Card className="text-center">
                        <CardHeader>
                            <CardTitle className="text-3xl font-headline flex items-center justify-center gap-4"><Dna className="h-8 w-8 text-primary"/>Dragon Genetics</CardTitle>
                            <CardDescription className="text-center font-bold">
                                DRAGON TRAITS KEY <br />
                                Upper Case Letters = Dominant <br />
                                Lower Case Letters = Recessive
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Punnett Square Predictions</CardTitle>
                            <CardDescription>Select a trait, then click a quadrant in the Punnett Square to assign that genotype to your hatchling.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            <div>
                                <h3 className="font-semibold mb-2">1. Select a Trait to Analyze:</h3>
                                <div className="grid grid-cols-2 gap-2">
                                {Object.keys(geneticsKey).map(trait => (
                                    <Button 
                                        key={trait} 
                                        variant={selectedTrait === trait ? 'default' : 'outline'}
                                        onClick={() => setSelectedTrait(trait as Trait)}
                                        className="relative"
                                    >
                                        {trait}
                                        {hatchlingGenotype[trait as Trait] && <Check className="h-5 w-5 text-green-500 absolute top-1 right-1" />}
                                    </Button>
                                ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">2. Choose the Outcome for "{selectedTrait}":</h3>
                                <PunnettSquare trait={selectedTrait} onSelectQuadrant={handleSelectQuadrant} />
                                <div className="mt-4 text-sm space-y-1 text-center bg-background p-2 rounded-md">
                                    <p><span className="font-bold">{geneticsKey[selectedTrait].dominantAllele}:</span> {geneticsKey[selectedTrait].dominant}</p>
                                    <p><span className="font-bold">{geneticsKey[selectedTrait].recessiveAllele}:</span> {geneticsKey[selectedTrait].recessive}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Sparkles className="text-yellow-400" />The Hatchling</CardTitle>
                            <CardDescription>Based on your selections, here are the traits of your new dragon.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!allTraitsSelected ? (
                                <p className="text-center text-muted-foreground py-8">Select a genotype for all traits to reveal your hatchling!</p>
                            ) : (
                                <div className="p-4 bg-secondary rounded-lg animate-in fade-in-50">
                                    <h3 className="text-xl font-bold text-center mb-4">Hatchling's Traits</h3>
                                    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                                        {Object.entries(hatchlingGenotype).map(([trait, alleles]) => (
                                            <div key={trait} className="border-b pb-2">
                                                <dt className="font-semibold text-sm text-muted-foreground">{trait}</dt>
                                                <dd className="font-bold text-lg">{getPhenotype(trait as Trait, alleles)}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
