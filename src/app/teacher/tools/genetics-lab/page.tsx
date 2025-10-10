
'use client';

import { useState, useEffect, useRef } from 'react';
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
  { trait: 'Wing Color', dominantAllele: 'W', dominant: 'Black Wings', recessiveAllele: 'w', recessive: 'Colored Wings' },
];

const PunnettSquare = ({ traitName, squareIndex }: { traitName: string, squareIndex: number }) => {
    const [alleles, setAlleles] = useState({
        top1: '', top2: '',
        left1: '', left2: '',
        grid1: '', grid2: '',
        grid3: '', grid4: ''
    });

    const storageKey = `punnettSquare-${squareIndex}`;

    // Load state from localStorage on initial render
    useEffect(() => {
        try {
            const savedState = localStorage.getItem(storageKey);
            if (savedState) {
                setAlleles(JSON.parse(savedState));
            }
        } catch (error) {
            console.error(`Could not load state for Punnett Square ${squareIndex}:`, error);
        }
    }, [storageKey, squareIndex]);

    // Auto-fill grid when parental alleles change
    useEffect(() => {
        const newGrid1 = (alleles.top1 || '') + (alleles.left1 || '');
        const newGrid2 = (alleles.top2 || '') + (alleles.left1 || '');
        const newGrid3 = (alleles.top1 || '') + (alleles.left2 || '');
        const newGrid4 = (alleles.top2 || '') + (alleles.left2 || '');

        // Only update if something changed to prevent infinite loops
        if (newGrid1 !== alleles.grid1 || newGrid2 !== alleles.grid2 || newGrid3 !== alleles.grid3 || newGrid4 !== alleles.grid4) {
            const newAlleles = {
                ...alleles,
                grid1: newGrid1,
                grid2: newGrid2,
                grid3: newGrid3,
                grid4: newGrid4
            };
            setAlleles(newAlleles);
            try {
                localStorage.setItem(storageKey, JSON.stringify(newAlleles));
            } catch (error) {
                 console.error(`Could not save state for Punnett Square ${squareIndex}:`, error);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alleles.top1, alleles.top2, alleles.left1, alleles.left2, storageKey]);


    const handleChange = (field: keyof typeof alleles, value: string) => {
        const newAlleles = { ...alleles, [field]: value };
        setAlleles(newAlleles);
        // Save to localStorage immediately on any change to parent alleles
        if (field.startsWith('top') || field.startsWith('left')) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(newAlleles));
            } catch (error) {
                console.error(`Could not save state for Punnett Square ${squareIndex}:`, error);
            }
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{traitName}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-1 w-48 mx-auto">
                    {/* Top Row Headers */}
                    <div />
                    <Input className="text-center font-bold" value={alleles.top1} onChange={(e) => handleChange('top1', e.target.value)} maxLength={1} />
                    <Input className="text-center font-bold" value={alleles.top2} onChange={(e) => handleChange('top2', e.target.value)} maxLength={1} />

                    {/* First Row */}
                    <Input className="text-center font-bold" value={alleles.left1} onChange={(e) => handleChange('left1', e.target.value)} maxLength={1} />
                    <Input className="text-center" value={alleles.grid1} readOnly />
                    <Input className="text-center" value={alleles.grid2} readOnly />

                    {/* Second Row */}
                    <Input className="text-center font-bold" value={alleles.left2} onChange={(e) => handleChange('left2', e.target.value)} maxLength={1} />
                    <Input className="text-center" value={alleles.grid3} readOnly />
                    <Input className="text-center" value={alleles.grid4} readOnly />
                </div>
            </CardContent>
        </Card>
    );
};

const HatchlingTable = ({ title, tableIndex }: { title: string; tableIndex: number }) => {
    const initialGrid = Array.from({ length: 4 }, () => Array(4).fill(''));
    const [grid, setGrid] = useState<string[][]>(initialGrid);
    const storageKey = `hatchlingTable-${tableIndex}`;

    useEffect(() => {
        try {
            const savedGrid = localStorage.getItem(storageKey);
            if (savedGrid) {
                setGrid(JSON.parse(savedGrid));
            }
        } catch (error) {
            console.error(`Could not load state for ${title}:`, error);
        }
    }, [storageKey, title]);

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newGrid = grid.map((row, rIdx) => 
            rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell)) : row
        );
        setGrid(newGrid);
        try {
            localStorage.setItem(storageKey, JSON.stringify(newGrid));
        } catch (error) {
            console.error(`Could not save state for ${title}:`, error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {grid.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {row.map((cell, colIndex) => (
                                    <TableCell key={colIndex}>
                                        <Input 
                                            value={cell} 
                                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                            className="w-full"
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default function GeneticsLabPage() {
    const router = useRouter();
    
    const [ovalTexts, setOvalTexts] = useState<string[]>(Array(6).fill(''));
    const [aureliosOvalTexts, setAureliosOvalTexts] = useState<string[]>(Array(6).fill(''));

    // Load from localStorage on initial render for Silvaria
    useEffect(() => {
        try {
            const loadedTexts = Array(6).fill('').map((_, i) => 
                localStorage.getItem(`geneticsLabOval${i + 1}`) || ''
            );
            setOvalTexts(loadedTexts);
        } catch (error) {
            console.error("Could not access localStorage for Silvaria:", error);
        }
    }, []);

    // Load from localStorage on initial render for Aurelios
    useEffect(() => {
        try {
            const loadedTexts = Array(6).fill('').map((_, i) => 
                localStorage.getItem(`aureliosGeneticsLabOval${i + 1}`) || ''
            );
            setAureliosOvalTexts(loadedTexts);
        } catch (error) {
            console.error("Could not access localStorage for Aurelios:", error);
        }
    }, []);

    const handleTextChange = (index: number, value: string) => {
        const newTexts = [...ovalTexts];
        newTexts[index] = value;
        setOvalTexts(newTexts);
        try {
            localStorage.setItem(`geneticsLabOval${index + 1}`, value);
        } catch (error) {
            console.error("Could not write to localStorage for Silvaria:", error);
        }
    };
    
    const handleAureliosTextChange = (index: number, value: string) => {
        const newTexts = [...aureliosOvalTexts];
        newTexts[index] = value;
        setAureliosOvalTexts(newTexts);
        try {
            localStorage.setItem(`aureliosGeneticsLabOval${index + 1}`, value);
        } catch (error) {
            console.error("Could not write to localStorage for Aurelios:", error);
        }
    };
    
    const pastelColors = [
        'bg-red-100',
        'bg-yellow-100',
        'bg-green-100',
        'bg-blue-100',
        'bg-purple-100',
        'bg-pink-100',
    ];

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
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle>DRAGON TRAITS KEY</CardTitle>
                            <CardDescription>
                                Upper Case Letters = Dominant <br/> Lower Case Letters = Recessive
                            </CardDescription>
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
                            <CardTitle>An Upper Case, or Capital letter is used to represent a dominant trait. A Lower Case, or small letter, is used to represent a recessive trait. Dominant Traits Completely mask and/or suppress recessive traits. Refer to the Key, and answer the following questions:</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Question 5</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="q5">List 6 Dominant Traits Shown in the Key.</Label>
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
                        <CardHeader>
                            <CardTitle>Question 6</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="q6">List 6 Recessive Traits Shown in the Key.</Label>
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
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-headline font-['Cinzel']">Silvaria's Chromosomes</CardTitle>
                        </CardHeader>
                        <CardContent className="prose max-w-none text-center">
                            <p>Below, four of Silvaria’s (Mother’s) Chromosomes are listed.  There are a specific number of genes located on each chromosome. Determine if Silvaria is homozygous or heterozygous for each trait. Some MUST be homozygous to be expressed….others COULD be heterozygous.</p>
                            
                            <h4>Example 1:  Spikes on Tail</h4>
                            <p>You can see that Silvaria has spikes on her tail.  According to the KEY, Spikes on the Tail is a DOMINANT trait, and is represented by capital letter <strong>S</strong>.<br/>
                            So….Silvaria could be either homozygous DOMINANT (<strong>SS</strong>) OR Heterozygous (<strong>Ss</strong>).  Since Spikes on the tail is DOMINANT, she could be carrying the recessive gene, but it would not be expressed.</p>
                            
                            <h4>Example 2:  Claws on Wings</h4>
                            <p>You can see that Silvaria does NOT have claws on her wings. This is a recessive trait, and It is represented in the KEY by small letter “<strong>c</strong>”<br/>
                            So…. Since Claws on Wings is a DOMINANT trait, the only way Silvaria could NOT have claws, is if she did not have the gene for it at all. So for this trait,  she MUST be homozygous recessive (<strong>cc</strong>).</p>

                            <p>Determine Silvaria’s alleles for each trait listed in the illustrations below.  Remember, she could be heterozygous for dominant traits (that’s up to you)…..but if a trait is recessive, she MUST be heterozygous recessive.</p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {ovalTexts.map((text, i) => (
                                    <textarea
                                        key={`silvaria-${i}`}
                                        placeholder={`Trait ${i + 1}`}
                                        value={text}
                                        onChange={(e) => handleTextChange(i, e.target.value)}
                                        className={`w-full h-48 rounded-[50%/50%] p-4 text-center text-lg font-semibold ${pastelColors[i]} focus:outline-none focus:ring-2 focus:ring-primary`}
                                        style={{ height: '12rem' }}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-headline">Aurelios' Chromosomes</CardTitle>
                        </CardHeader>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {aureliosOvalTexts.map((text, i) => (
                                    <textarea
                                        key={`aurelios-${i}`}
                                        placeholder={`Trait ${i + 1}`}
                                        value={text}
                                        onChange={(e) => handleAureliosTextChange(i, e.target.value)}
                                        className={`w-full h-48 rounded-[50%/50%] p-4 text-center text-lg font-semibold ${pastelColors[i]} focus:outline-none focus:ring-2 focus:ring-primary`}
                                        style={{ height: '12rem' }}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-headline">Punnett Squares</CardTitle>
                        </CardHeader>
                        <CardContent className="prose max-w-none text-center">
                            <p>Do Punnett Square Crosses for the 11 Traits!</p>
                            <p>Silvaria’s Alleles on the Top Row</p>
                            <p>Aurelio’s Traits on the Left Side</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {geneticsKey.map((trait, index) => (
                                <PunnettSquare key={trait.trait} traitName={`Trait ${index + 1}: ${trait.trait}`} squareIndex={index} />
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-headline">The Hatchling</CardTitle>
                        </CardHeader>
                        <CardContent className="prose max-w-none text-center">
                            <p>Pick ONE QUADRANT from the Parental Punnett Squares. Put together the GENOTYPES and PHENOTYPES of the Hatchling!</p>
                        </CardContent>
                    </Card>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <HatchlingTable title="Chromosomes 1" tableIndex={1} />
                        <HatchlingTable title="Chromosomes 2" tableIndex={2} />
                        <HatchlingTable title="Chromosomes 3" tableIndex={3} />
                        <HatchlingTable title="Chromosomes 4" tableIndex={4} />
                    </div>

                </div>
            </main>
        </div>
    );
}

    