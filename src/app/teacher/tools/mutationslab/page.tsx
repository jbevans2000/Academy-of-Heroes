
'use client';

import { useRouter } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dna, ArrowDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";


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
                            <div className="prose max-w-none">
                                
                                <hr className="my-6" />
                                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                  <p>By the end of this inquiry, you will be able to…</p>
                                </div>
                                <hr className="my-6" />

                                <div className="space-y-4 not-prose mt-6">
                                    <div className="text-left">
                                      <p className="font-semibold">What happens with the gene</p>
                                    </div>
                                    <Textarea placeholder="Your observations for the first box..." />

                                    <div className="flex flex-col items-center py-2">
                                        <p className="font-semibold text-sm text-muted-foreground">cause</p>
                                        <ArrowDown className="h-8 w-8 text-primary my-1" />
                                        <p className="font-semibold text-sm text-muted-foreground">effect</p>
                                    </div>

                                    <div className="text-left">
                                      <p className="font-semibold">What happens with the protein</p>
                                    </div>
                                    <Textarea placeholder="Your observations for the second box..." />

                                     <div className="flex flex-col items-center py-2">
                                        <p className="font-semibold text-sm text-muted-foreground">cause</p>
                                        <ArrowDown className="h-8 w-8 text-primary my-1" />
                                        <p className="font-semibold text-sm text-muted-foreground">effect</p>
                                    </div>

                                    <div className="text-left">
                                      <p className="font-semibold">What happens in the cells</p>
                                    </div>
                                    <Textarea placeholder="Your observations for the third box..." />

                                     <div className="flex flex-col items-center py-2">
                                        <p className="font-semibold text-sm text-muted-foreground">cause</p>
                                        <ArrowDown className="h-8 w-8 text-primary my-1" />
                                        <p className="font-semibold text-sm text-muted-foreground">effect</p>
                                    </div>

                                    <div className="text-left">
                                      <p className="font-semibold">What happens to the person</p>
                                    </div>
                                    <Textarea placeholder="Your observations for the fourth box..." />
                                </div>
                                <hr className="my-6" />
                                
                                <h3 className="text-2xl font-bold text-center">Investigation – Part I</h3>
                                <h4 className="text-xl font-semibold text-center">Why do some mutations cause Galactosemia, and others do not?</h4>

                                <p className="indent-8">The Empress’s Royal Academy has charged you with uncovering why certain alterations in the GALT gene lead to the illness known as Galactosemia, while others leave the bearer unharmed.</p>
                                <p className="indent-8">Within every living cell of Luminaria lies the code of life, a sequence of mystical runes known to scholars as nucleotides. When read by the cell’s machinery, these runes form codons — groups of three symbols that instruct the cell which amino acids to join together in the crafting of a protein.</p>
                                <p className="indent-8">Each codon serves as a command. For instance, the rune CTG directs the cell to add the amino acid leucine to the growing chain. The full set of such instructions is called the Genetic Code, a universal lexicon shared by all creatures of the realm.</p>
                                <p className="indent-8">When a mutation alters a codon, the message may change — and the cell may place the wrong amino acid in the sequence. Since each amino acid possesses unique chemical properties, even a single misplaced one can reshape the entire protein, twisting its form and disrupting its function. Thus, a single change in the life-script can determine whether a protein performs its duty… or fails, bringing illness.</p>
                                <p className="indent-8">In the case of Galactosemia, scholars of the Academy have discovered that certain changes within the GALT gene cause the disorder, while others do not. Eight such mutations have been recorded in the Royal Archives and are presented in Table 1 below. This table lists the codon change caused by each mutation and indicates whether it is known to bring about the affliction.</p>
                                <p className="indent-8">Your charge from the Empress is to complete the missing sections of Table 1 by deciphering how each mutation alters the GALT protein’s structure and behavior.</p>

                                <h3 className="font-bold">Royal Research Procedure</h3>
                                <ol className="list-decimal list-inside space-y-2 indent-8">
                                    <li>Consult Table 2 – The Codon Chart of Luminaria (provided by your instructor) to determine the amino acid change created by each mutation in Table 1.</li>
                                    <li>Use Table 3 – The Properties of Amino Acids (also provided) to identify the effect that each amino-acid change has on the protein’s shape and stability.</li>
                                    <li>Record your findings within Table 1, then proceed to answer the Part I Follow-Up Questions in your Royal Ledger.</li>
                                </ol>

                                <div className="my-6">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-bold"></TableHead>
                                                <TableHead className="font-bold">Description of Mutation</TableHead>
                                                <TableHead className="font-bold">Codon Change</TableHead>
                                                <TableHead className="font-bold">Amino Acid Change</TableHead>
                                                <TableHead className="font-bold">Effect of Amino Acid Change</TableHead>
                                                <TableHead className="font-bold">Causes Galactosemia?</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>1</TableCell>
                                                <TableCell>C replaced with A at position 184</TableCell>
                                                <TableCell>CTG → ATG</TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>2</TableCell>
                                                <TableCell>C replaced with T at position 404</TableCell>
                                                <TableCell>TCG  → TTG</TableCell>
                                                <TableCell><div className="flex items-center gap-2">S →<Input className="w-12" maxLength={1} /></div></TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>3</TableCell>
                                                <TableCell>T replaced with A at position 498</TableCell>
                                                <TableCell>CCT → CCA</TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>4</TableCell>
                                                <TableCell>A replaced with G at position 563</TableCell>
                                                <TableCell>CAG → CGG</TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>5</TableCell>
                                                <TableCell>C replaced with G at position 700</TableCell>
                                                <TableCell>CTA → GTA</TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>6</TableCell>
                                                <TableCell>G replaced with T at position 855</TableCell>
                                                <TableCell>AAG → AAT</TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>7</TableCell>
                                                <TableCell>G replaced with A at position 876</TableCell>
                                                <TableCell>ACG → ACA</TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                                <TableCell><Input /></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
