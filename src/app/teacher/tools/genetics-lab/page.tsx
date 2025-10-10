
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Dna } from 'lucide-react';

type Allele = 'S' | 's' | 'C' | 'c' | 'E' | 'e' | 'N' | 'n' | 'F' | 'f' | 'A' | 'a' | 'H' | 'h' | 'W' | 'w' | 'T' | 't' | 'M' | 'm' | 'B' | 'b' | 'K' | 'k';
type Trait = 'Spikes on tail' | 'Clawed wings' | 'Eye color' | 'Neck length' | 'Fire breathing' | 'Armored belly' | 'Horns' | 'Toes' | 'Body color' | 'Back';

interface TraitInfo {
  dominant: string;
  recessive: string;
}

const geneticsKey: Record<string, TraitInfo> = {
  'N/n': { dominant: 'Long Neck', recessive: 'Short Neck' },
  'E/e': { dominant: 'Red Eyes', recessive: 'White Eyes' },
  'H/h': { dominant: 'Multiple Horns', recessive: 'Only 2 Horns' },
  'C/c': { dominant: 'Clawed Wings', recessive: 'No Claws on Wings' },
  'B/b': { dominant: 'Silver Body', recessive: 'Gold Body' },
  'A/a': { dominant: 'Armored Belly', recessive: 'No armor on belly' },
  'S/s': { dominant: 'Spikes on Tail', recessive: 'No Spikes on Tail' },
  'K/k': { dominant: 'Freckled Back', recessive: 'No freckles on back' },
  'F/f': { dominant: 'Fire Breathing', recessive: 'No Fire Breathing' },
  'T/t': { dominant: 'Three Toes', recessive: 'Four Toes' },
};


export default function GeneticsLabPage() {
    const router = useRouter();
    
    return (
        <div className="bg-muted/40">
            <TeacherHeader />
            <main className="p-4 md:p-6 lg:p-8">
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
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Alleles</TableHead>
                                        <TableHead>Dominant Trait</TableHead>
                                        <TableHead>Recessive Trait</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(geneticsKey).map(([alleles, traits]) => (
                                        <TableRow key={alleles}>
                                            <TableCell className="font-mono font-semibold">{alleles}</TableCell>
                                            <TableCell>{traits.dominant}</TableCell>
                                            <TableCell>{traits.recessive}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
