
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dna, Sparkles, Loader2, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { generateHatchling, type HatchlingTraitInput } from '@/ai/flows/hatchling-generator';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import jsPDF from 'jspdf';
import { Textarea } from '@/components/ui/textarea';

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

const HatchlingTable = ({ title, tableIndex, placeholders }: { title: string; tableIndex: number; placeholders?: string[][] }) => {
    const initialGrid = Array.from({ length: 4 }, () => Array(4).fill(''));
    const [grid, setGrid] = useState<string[][]>(initialGrid);
    const storageKey = `hatchlingTable-${tableIndex}`;

    useEffect(() => {
        try {
            const savedGrid = localStorage.getItem(storageKey);
            if (savedGrid) {
                const parsedGrid = JSON.parse(savedGrid);
                if (Array.isArray(parsedGrid) && parsedGrid.length === 4) {
                    setGrid(parsedGrid);
                }
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
                <CardTitle>Chromosome {tableIndex}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {["Trait", "Genotype", "Phenotype", "Het/Hom"].map(header => (
                                <TableHead key={header} className="font-bold border text-center bg-gray-200">{header}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {grid.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {row.map((cell, colIndex) => (
                                    <TableCell key={colIndex} className="p-1">
                                        <Input
                                            value={cell}
                                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                            placeholder={placeholders?.[rowIndex]?.[colIndex] || ''}
                                            className="w-full text-center text-xs h-10"
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

interface TraitSelection {
    genotype: string;
    phenotype: 'dominant' | 'recessive' | '';
}

const HatchlingTraitSelector = ({ onDataChange }: { onDataChange: (data: Record<string, TraitSelection>) => void }) => {
    const [traitData, setTraitData] = useState<Record<string, TraitSelection>>({});
    const storageKey = 'hatchlingTraitSelections';

    useEffect(() => {
        try {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                setTraitData(parsedData);
                onDataChange(parsedData);
            }
        } catch (error) {
            console.error("Could not load trait selections:", error);
        }
    }, [onDataChange]);

    const handleTraitChange = (traitName: string, field: 'genotype' | 'phenotype', value: string) => {
        const newData = {
            ...traitData,
            [traitName]: {
                ...traitData[traitName],
                [field]: value,
            },
        };
        setTraitData(newData);
        onDataChange(newData); // Notify parent of the change
        try {
            localStorage.setItem(storageKey, JSON.stringify(newData));
        } catch (error) {
            console.error("Could not save trait selections:", error);
        }
    };

    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-headline">Hatchling's Final Traits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {geneticsKey.map((traitInfo) => (
                    <Card key={traitInfo.trait} className="p-4 bg-secondary/50">
                        <CardTitle className="text-lg mb-2">{traitInfo.trait}</CardTitle>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <div className="md:col-span-1">
                                <Label htmlFor={`genotype-${traitInfo.trait}`}>Genotype</Label>
                                <Input
                                    id={`genotype-${traitInfo.trait}`}
                                    placeholder="e.g., Nn"
                                    value={traitData[traitInfo.trait]?.genotype || ''}
                                    onChange={(e) => handleTraitChange(traitInfo.trait, 'genotype', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Phenotype (Expressed Trait)</Label>
                                <RadioGroup
                                    value={traitData[traitInfo.trait]?.phenotype || ''}
                                    onValueChange={(value) => handleTraitChange(traitInfo.trait, 'phenotype', value)}
                                    className="mt-2 flex flex-col sm:flex-row gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="dominant" id={`pheno-dom-${traitInfo.trait}`} />
                                        <Label htmlFor={`pheno-dom-${traitInfo.trait}`}>{traitInfo.dominant} ({traitInfo.dominantAllele})</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="recessive" id={`pheno-rec-${traitInfo.trait}`} />
                                        <Label htmlFor={`pheno-rec-${traitInfo.trait}`}>{traitInfo.recessive} ({traitInfo.recessiveAllele})</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                    </Card>
                ))}
            </CardContent>
        </Card>
    );
};

function GeneticsLabContent() {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const isEmbed = searchParams.get('embed') === 'true';

    const [ovalTexts, setOvalTexts] = useState<string[]>([]);
    const [aureliosOvalTexts, setAureliosOvalTexts] = useState<string[]>([]);
    const [traitSelections, setTraitSelections] = useState<Record<string, TraitSelection> | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const imageStorageKey = 'hatchlingGeneratedImage';

    useEffect(() => {
        try {
            const defaultSilvariaOvals = [
                `Chromosome #1\n\nEye Color - ee\nSpikes - ss\nHorns - Hh`,
                `Chromosome #2\n\nTail Length\nArmored Belly\nClawed Wings`,
                `Chromosome #3\n\nBody Color\nFire Breathing\nNeck Length`,
                `Chromosome #4\n\nWing Style\nNumber of Toes`,
                `Intentionally\nLeft Blank`,
                `Intentionally\nLeft Blank`
            ];
            const loadedTexts = defaultSilvariaOvals.map((defaultValue, i) =>
                localStorage.getItem(`geneticsLabOval${i + 1}`) ?? defaultValue
            );
            setOvalTexts(loadedTexts);

            const defaultAureliosOvals = [
                `Chromosome #1\n\nEye Color - Ee\nSpikes - SS\nHorns - hh`,
                `Chromosome #2\n\nTail Length\nArmored Belly\nClawed Wings`,
                `Chromosome #3\n\nBody Color\nFire Breathing\nNeck Length`,
                `Chromosome #4\n\nWing Style\nNumber of Toes`,
                `Intentionally\nLeft Blank`,
                `Intentionally\nLeft Blank`
            ];
            const aureliosLoadedTexts = defaultAureliosOvals.map((defaultValue, i) => 
                localStorage.getItem(`aureliosGeneticsLabOval${i + 1}`) ?? defaultValue
            );
            setAureliosOvalTexts(aureliosLoadedTexts);
            
            const savedImage = localStorage.getItem(imageStorageKey);
            if (savedImage) {
                setGeneratedImageUrl(savedImage);
            }
        } catch (error) {
            console.error("Could not access localStorage:", error);
        }
    }, []);

    const handleDownloadPdf = () => {
        setIsDownloading(true);
        // We can just use the browser's print functionality which is more reliable
        window.print();
        // A small delay to allow the print dialog to appear before resetting state
        setTimeout(() => setIsDownloading(false), 1000);
    };

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

    const handleGenerateHatchling = async () => {
        if (!traitSelections) {
            toast({ variant: 'destructive', title: 'Missing Traits', description: "Please select the phenotypes for your hatchling first." });
            return;
        }

        const input: Partial<HatchlingTraitInput> = {};
        let allTraitsDefined = true;

        for (const key of geneticsKey) {
            const selection = traitSelections[key.trait];
            if (selection && selection.phenotype) {
                input[key.trait as keyof HatchlingTraitInput] = selection.phenotype === 'dominant' ? key.dominant : key.recessive;
            } else {
                allTraitsDefined = false;
                break;
            }
        }
        
        if (!allTraitsDefined) {
             toast({ variant: 'destructive', title: 'Incomplete Traits', description: "Please define a phenotype for all 11 traits before generating." });
            return;
        }

        setIsGenerating(true);
        setGeneratedImageUrl(null);

        try {
            const imageUrl = await generateHatchling(input as HatchlingTraitInput);
            setGeneratedImageUrl(imageUrl);
            localStorage.setItem(imageStorageKey, imageUrl);
        } catch (error) {
            console.error("Hatchling generation failed:", error);
            toast({ variant: 'destructive', title: 'Generation Failed', description: "The AI artist was unable to create a portrait. Please try again." });
        } finally {
            setIsGenerating(false);
        }
    }
    
    const pastelColors = [
        'bg-red-100',
        'bg-yellow-100',
        'bg-green-100',
        'bg-blue-100',
        'bg-purple-100',
        'bg-pink-100',
    ];

    const placeholdersForTable1 = [
        ["Neck Length", "Nn", "Long Neck", "Het"],
        ["Tail Spikes", "ss", "No Spikes", "Hom"],
        ["Wing Claws", "cc", "No Claws", "Hom"],
        ["", "", "", ""],
    ];

    const mainContent = (
        <div ref={contentRef} className="max-w-6xl mx-auto space-y-6 bg-white p-8">
            {!isEmbed && (
                 <Button variant="outline" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            )}
            <Card className="text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline flex items-center justify-center gap-4"><Dna className="h-8 w-8 text-primary"/>Dragon Genetics</CardTitle>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-center">Sylvaria and Aurelio</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video">
                        <iframe
                            className="w-full h-full rounded-lg shadow-lg"
                            src="https://www.youtube.com/embed/Bp9Eaa7Squ8"
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        ></iframe>
                    </div>
                </CardContent>
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
                    <CardTitle>Dominant Traits</CardTitle>
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
                    <CardTitle>Recessive Traits</CardTitle>
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
                 <CardContent className="md:flex md:gap-6 md:items-start p-6">
                    <div className="prose max-w-none md:w-1/2">
                        <p>Below, four of Silvaria’s (Mother’s) Chromosomes are listed. There are a specific number of genes located on each chromosome. Determine if Silvaria is homozygous or heterozygous for each trait. Some MUST be homozygous to be expressed….others COULD be heterozygous.</p>
                        
                        <h4><strong>Example 1: Spikes on Tail</strong></h4>
                        <p>You can see that Silvaria has spikes on her tail. According to the KEY, Spikes on the Tail is a DOMINANT trait, and is represented by capital letter <strong>S</strong>.<br/>
                        So….Silvaria could be either homozygous DOMINANT (<strong>SS</strong>) OR Heterozygous (<strong>Ss</strong>). Since Spikes on the tail is DOMINANT, she could be carrying the recessive gene, but it would not be expressed.</p>
                        
                        <h4><strong>Example 2: Claws on Wings</strong></h4>
                        <p>You can see that Silvaria does NOT have claws on her wings. This is a recessive trait, and It is represented in the KEY by small letter “<strong>c</strong>”<br/>
                        So…. Since Claws on Wings is a DOMINANT trait, the only way Silvaria could NOT have claws, is if she did not have the gene for it at all. So for this trait, she MUST be homozygous recessive (<strong>cc</strong>).</p>

                        <p>Determine Silvaria’s alleles for each trait listed in the illustrations below. Remember, she could be heterozygous for dominant traits (that’s up to you)…..but if a trait is recessive, she MUST be heterozygous recessive.</p>
                    </div>
                    <div className="md:w-1/2 mt-6 md:mt-0 flex-shrink-0">
                        <Image 
                            src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/quest-images%2FICKWJ5MQl0SHFzzaSXqPuGS3NHr2%2F74245b3c-3c7f-437e-9ff8-87cc7a99a208?alt=media&token=04773da5-78c9-402a-86f6-953f8cac2ee8" 
                            alt="Silvaria the Dragon" 
                            width={500} 
                            height={500} 
                            className="rounded-lg shadow-lg w-full h-auto" 
                        />
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {ovalTexts.map((text, i) => (
                            <textarea
                                key={`silvaria-${i}`}
                                defaultValue={text}
                                onChange={(e) => handleTextChange(i, e.target.value)}
                                className={`w-full h-48 rounded-[50%/50%] p-4 text-center text-sm font-semibold ${pastelColors[i]} focus:outline-none focus:ring-2 focus:ring-primary`}
                                style={{ height: '12rem', whiteSpace: 'pre-wrap' }}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline font-['Cinzel']">Aurelio's Chromosomes</CardTitle>
                </CardHeader>
                <CardContent className="md:flex md:gap-6 md:items-center p-6">
                    <div className="md:w-1/2 flex items-center justify-center">
                        <p className="text-2xl font-semibold text-center">Now, fill in the Information for Aurelio's Chromosomes!</p>
                    </div>
                    <div className="md:w-1/2 mt-6 md:mt-0 flex-shrink-0">
                        <Image 
                            src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/quest-images%2FICKWJ5MQl0SHFzzaSXqPuGS3NHr2%2F994eb181-2c90-4f2e-8125-e13e0ccaae43?alt=media&token=f0dfb5dd-2c1e-4178-864a-547a994dac1b" 
                            alt="Aurelio the Dragon" 
                            width={500} 
                            height={500} 
                            className="rounded-lg shadow-lg w-full h-auto" 
                        />
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                 <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {aureliosOvalTexts.map((text, i) => (
                            <textarea
                                key={`aurelios-${i}`}
                                placeholder={`Trait ${i + 1}`}
                                defaultValue={text}
                                onChange={(e) => handleAureliosTextChange(i, e.target.value)}
                                className={`w-full h-48 rounded-[50%/50%] p-4 text-center text-sm font-semibold ${pastelColors[i]} focus:outline-none focus:ring-2 focus:ring-primary`}
                                style={{ height: '12rem', whiteSpace: 'pre-wrap' }}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline">Punnett Squares</CardTitle>
                     <CardContent className="prose max-w-none text-center">
                        <p>Do Punnett Square Crosses for the 11 Traits!</p>
                        <p>Silvaria’s Alleles on the Top Row</p>
                        <p>Aurelio’s Traits on the Left Side</p>
                    </CardContent>
                </CardHeader>
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
                <HatchlingTable title="Chromosome" tableIndex={1} placeholders={placeholdersForTable1} />
                <HatchlingTable title="Chromosome" tableIndex={2} />
                <HatchlingTable title="Chromosome" tableIndex={3} />
                <HatchlingTable title="Chromosome" tableIndex={4} />
            </div>

            <HatchlingTraitSelector onDataChange={setTraitSelections} />

            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline">Hatchling Portrait</CardTitle>
                    <CardDescription>Use the Academy's magical artist to generate a portrait of your unique dragon hatchling based on the traits you've selected above.</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <Button onClick={handleGenerateHatchling} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                        Generate Portrait
                    </Button>
                    {isGenerating && <p className="text-muted-foreground">The artist is sketching... this may take a moment.</p>}
                    {generatedImageUrl && (
                        <div className="mt-4 p-4 border rounded-lg bg-secondary/30 max-w-lg mx-auto">
                            <Image src={generatedImageUrl} alt="Generated hatchling portrait" width={512} height={512} className="rounded-md mx-auto" />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-center text-3xl font-headline">Final Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="q1">Based on your Punnett Square for the eye color, what are the chances that the hatchling's eyes will be red?</Label>
                        <Textarea id="q1" placeholder="Your answer..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="q2">Based on your Punnett square for wing color, what are the chances that the hatchling will have black wings?</Label>
                        <Textarea id="q2" placeholder="Your answer..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="q3">Based on your Punnett Square for Fire Breathing, what are the odds that the hatchling will be able to breath fire?</Label>
                        <Textarea id="q3" placeholder="Your answer..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="q4">Based on what you put for the traits and alleles on chromosome 1, explain if the hatchling is homozygous dominant, homozygous recessive, or heterozygous.</Label>
                        <Textarea id="q4" placeholder="Your answer..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="q5">If body color expressed co-dominance, what would the hatchling body color be?</Label>
                        <Textarea id="q5" placeholder="Your answer..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="q6">If Eye color expressed incomplete dominance, explain what the hatchlings eye's might look like.</Label>
                        <Textarea id="q6" placeholder="Your answer..." />
                    </div>
                </CardContent>
            </Card>

            <div className="text-center mt-8">
                <Button size="lg" onClick={handleDownloadPdf} disabled={isDownloading}>
                    {isDownloading ? <Loader2 className="mr-2 h-6 w-6 animate-spin"/> : <Download className="mr-2 h-6 w-6"/>}
                    Download as PDF
                </Button>
            </div>
        </div>
    );

    return (
        <div className={isEmbed ? "" : "bg-muted/40 min-h-screen"}>
            {!isEmbed && <TeacherHeader />}
            <main className={isEmbed ? "" : "p-4 md:p-6 lg:p-8"}>
                {mainContent}
            </main>
        </div>
    )
}

export default function GeneticsLabPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GeneticsLabContent />
        </Suspense>
    )
}

    

    