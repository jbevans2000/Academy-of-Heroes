
'use client';

import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dna } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        <div className="bg-muted/40 min-h-screen">
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
                            <CardDescription className="text-center text-lg">
                                DRAGON TRAITS KEY <br/>
                                <span className="font-normal text-sm">Upper Case Letters = Dominant</span><br/>
                                <span className="font-normal text-sm">Lower Case Letters = Recessive</span>
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Dragon Traits Key</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-bold w-1/4">Trait</TableHead>
                                        <TableHead className="font-bold text-center">Dominant Allele</TableHead>
                                        <TableHead className="font-bold">Phenotype (Visible Trait)</TableHead>
                                        <TableHead className="font-bold text-center">Recessive Allele</TableHead>
                                        <TableHead className="font-bold">Phenotype (Visible Trait)</TableHead>
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Test Your Knowledge</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="q1">1. What letters are used to represent eye color?</Label>
                                <Input id="q1" placeholder="Type your answer here..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="q2">2. What letters are used to represent neck length?</Label>
                                <Input id="q2" placeholder="Type your answer here..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="q3">3. The letter "W" is used to represent what?</Label>
                                <Input id="q3" placeholder="Type your answer here..." />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="q4">4. The letter "b" is used to represent what?</Label>
                                <Input id="q4" placeholder="Type your answer here..." />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-4">
                            <p>An Upper Case, or Capital letter is used to represent a dominant trait. A Lower Case, or small letter, is used to represent a recessive trait. Dominant Traits Completely mask and/or suppress recessive traits. Refer to the Key, and answer the following questions:</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="q5">5. List 6 Dominant Traits Shown in the Key.</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input id="q5-1" placeholder="Trait 1" />
                                    <Input id="q5-2" placeholder="Trait 2" />
                                    <Input id="q5-3" placeholder="Trait 3" />
                                    <Input id="q5-4" placeholder="Trait 4" />
                                    <Input id="q5-5" placeholder="Trait 5" />
                                    <Input id="q5-6" placeholder="Trait 6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="q6">6. List 6 Recessive Traits Shown in the Key.</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input id="q6-1" placeholder="Trait 1" />
                                    <Input id="q6-2" placeholder="Trait 2" />
                                    <Input id="q6-3" placeholder="Trait 3" />
                                    <Input id="q6-4" placeholder="Trait 4" />
                                    <Input id="q6-5" placeholder="Trait 5" />
                                    <Input id="q6-6" placeholder="Trait 6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
