
'use client';

import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dna } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

export default function MutationsLabPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Card className="shadow-lg">
                        <CardHeader className="text-center">
                            <Dna className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="text-2xl font-bold mt-2">Royal Commission Activity Guide</CardTitle>
                            <CardDescription className="text-lg font-headline">The Empress’s Scientific Inquiry: Mutations Across Luminaria</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <h2 className="text-xl font-semibold text-center">Why do some mutations lead to genetic disorders?</h2>

                            <div className="prose max-w-none">
                                <h3>The Challenge</h3>
                                <p>You have been summoned by decree of Her Radiant Majesty, the Empress of Luminaria, to assist the Royal Academy of Biological Sciences in a matter of grave importance. Strange ailments have begun to appear among the citizens of the realm — not curses of Mortarian’s dark magic, but afflictions written within the very code of life itself.</p>
                                <p>Imagine learning that your own life-codem the DNA — the sequences of your lineage — contain a subtle mutation that could one day bring illness. Yet imagine also that, by uncovering such mutations early, the Royal Healers could intervene and prevent the malady from taking hold.</p>
                                <p>Throughout the realm, scholars have found that certain genetic disorders — illnesses caused by small errors in the code of life — can be detected early enough to protect and even save lives.</p>
                                <p>In this investigation, you will examine one such condition known in the royal medical records as Galactosemia. Guided by real genetic data preserved in the archives, you will uncover why some mutations within the GALT gene cause this disorder, while others do not. You will also step into the role of a Royal Physician, tasked with screening newborn citizens of Luminaria for signs of this condition.</p>
                                
                                <h4>By the end of this inquiry, you will be able to…</h4>
                                <ul>
                                    <li>Explain why some mutations cause genetic disorders while others do not.</li>
                                    <li>Communicate why early detection of mutations can help improve and enhance life throughout the realm.</li>
                                </ul>

                                <h3>Setting the Stage</h3>
                                <p>Galactosemia is a genetic disorder that prevents the body from properly breaking down a common sugar called galactose, one of the basic energy sources found in many foods across the world. When this process fails, galactose accumulates in the bloodstream, causing severe illness and, if untreated, even death.</p>
                                <p>Healers of the Royal Academy have discovered that those afflicted with galactosemia can lessen the disorder’s effects by following a low-galactose diet, thereby reducing the buildup of the sugar in their bodies.</p>
                                <p>Through study of the GALT gene, scholars have determined that this segment of life-code produces the GALT protein, an enzyme responsible for breaking down galactose. When mutations alter the GALT gene, the protein’s structure changes, preventing it from performing its vital task. As a result, the body can no longer process galactose correctly.</p>
                            </div>

                            <Card className="bg-secondary">
                                <CardHeader>
                                    <CardTitle>Royal Research Task:</CardTitle>
                                    <CardDescription>Complete the chart below to describe the cause-and-effect relationship between the GALT gene, the GALT protein, and the cells of an individual with galactosemia. Record your observations in the Empress’s Scientific Ledger.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-1/3">Component</TableHead>
                                                <TableHead>Normal Function (Cause)</TableHead>
                                                <TableHead>Effect in Galactosemia (Effect)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-semibold">GALT Gene</TableCell>
                                                <TableCell><Textarea placeholder="Describe the normal role of the GALT gene..." /></TableCell>
                                                <TableCell><Textarea placeholder="Describe what happens to the GALT gene..." /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-semibold">GALT Protein</TableCell>
                                                <TableCell><Textarea placeholder="Describe the protein's normal function..." /></TableCell>
                                                <TableCell><Textarea placeholder="Describe how the protein is affected..." /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-semibold">Cells</TableCell>
                                                <TableCell><Textarea placeholder="Describe how cells normally process galactose..." /></TableCell>
                                                <TableCell><Textarea placeholder="Describe the effect on the cells..." /></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
