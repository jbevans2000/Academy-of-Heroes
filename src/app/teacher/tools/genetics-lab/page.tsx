
'use client';

import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dna, Sparkles, Check } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const geneticsKey = [
  { trait: 'Neck Length', dominantAllele: 'N', dominant: 'Long Neck', recessiveAllele: 'n', recessive: 'Short Neck' },
  { trait: 'Eye Color', dominantAllele: 'E', dominant: 'Red Eyes', recessiveAllele: 'e', recessive: 'White Eyes' },
  { trait: 'Horns', dominantAllele: 'H', dominant: 'Multiple Horns', recessiveAllele: 'h', recessive: 'Only 2 Horns' },
  { trait: 'Wing Claws', dominantAllele: 'C', dominant: 'Clawed Wings', recessiveAllele: 'c', recessive: 'No Claws on Wings' },
  { trait: 'Body Color', dominantAllele: 'B', dominant: 'Silver Body', recessiveAllele: 'b', recessive: 'Gold Body' },
  { trait: 'Belly', dominantAllele: 'A', dominant: 'Armored Belly', recessiveAllele: 'a', recessive: 'No armor on belly' },
  { trait: 'Tail', dominantAllele: 'S', dominant: 'Spikes on Tail', recessiveAllele: 's', recessive: 'No Spikes on Tail' },
  { trait: 'Back', dominantAllele: 'K', dominant: 'Freckled Back', recessiveAllele: 'k', recessive: 'No freckles on back' },
  { trait: 'Breath', dominantAllele: 'F', dominant: 'Fire Breathing', recessiveAllele: 'f', recessive: 'No Fire Breathing' },
  { trait: 'Toes', dominantAllele: 'T', dominant: 'Three Toes', recessiveAllele: 't', recessive: 'Four Toes' },
];

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
                        </CardHeader>
                        <CardContent>
                             <CardDescription className="text-center font-bold">
                                DRAGON TRAITS KEY <br />
                                Upper Case Letters = Dominant <br />
                                Lower Case Letters = Recessive
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Genetics Key</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-bold">Trait</TableHead>
                                        <TableHead className="font-bold text-center">Dominant Allele</TableHead>
                                        <TableHead className="font-bold">Dominant Phenotype</TableHead>
                                        <TableHead className="font-bold text-center">Recessive Allele</TableHead>
                                        <TableHead className="font-bold">Recessive Phenotype</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {geneticsKey.map((item) => (
                                        <TableRow key={item.trait}>
                                            <TableCell className="font-semibold">{item.trait}</TableCell>
                                            <TableCell className="font-mono font-bold text-center text-lg">{item.dominantAllele}</TableCell>
                                            <TableCell>{item.dominant}</TableCell>
                                            <TableCell className="font-mono font-bold text-center text-lg">{item.recessiveAllele}</TableCell>
                                            <TableCell>{item.recessive}</TableCell>
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
