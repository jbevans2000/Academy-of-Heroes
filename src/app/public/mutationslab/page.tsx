
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, ArrowDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Image from 'next/image';

export default function MutationsLabPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Card className="shadow-lg">
                        <CardHeader className="text-center">
                            
                            <CardTitle className="text-2xl font-bold mt-2">Royal Commission Activity Guide</CardTitle>
                            <CardDescription className="text-lg font-headline">The Empress’s Scientific Inquiry: Mutations Across Luminaria</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="prose max-w-none">
                                
                                <h3 className="text-2xl font-bold text-center">The Challenge</h3>
                                <p>&nbsp;</p>
                                <p className="indent-8">You have been summoned by decree of Her Radiant Majesty, the Empress of Luminaria, to assist the Royal Academy of Biological Sciences in a matter of grave importance. Strange ailments have begun to appear among the citizens of the realm — not curses of Mortarian’s dark magic, but afflictions written within the very code of life itself.</p>
                                <p className="indent-8">Imagine learning that your own life-codem the DNA — the sequences of your lineage — contain a subtle mutation that could one day bring illness. Yet imagine also that, by uncovering such mutations early, the Royal Healers could intervene and prevent the malady from taking hold.</p>
                                <p className="indent-8">Throughout the realm, scholars have found that certain genetic disorders — illnesses caused by small errors in the code of life — can be detected early enough to protect and even save lives.</p>
                                <p className="indent-8">In this investigation, you will examine one such condition known in the royal medical records as Galactosemia. Guided by real genetic data preserved in the archives, you will uncover why some mutations within the GALT gene cause this disorder, while others do not. You will also step into the role of a Royal Physician, tasked with screening newborn citizens of Luminaria for signs of this condition.</p>
                                
                                <hr className="my-6" />
                                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                  <p>By the end of this inquiry, you will be able to…</p>
                                  <p className="text-base font-normal">Explain why some mutations cause genetic disorders while others do not.</p>
                                  <p className="text-base font-normal">Communicate why early detection of mutations can help improve and enhance life throughout the realm.</p>
                                </div>
                                <hr className="my-6" />
                                
                                <h3 className="text-xl font-semibold">Setting the Stage</h3>
                                <p className="indent-8">Galactosemia is a genetic disorder that prevents the body from properly breaking down a common sugar called galactose, one of the basic energy sources found in many foods across the world. When this process fails, galactose accumulates in the bloodstream, causing severe illness and, if untreated, even death.</p>
                                <p className="indent-8">Healers of the Royal Academy have discovered that those afflicted with galactosemia can lessen the disorder’s effects by following a low-galactose diet, thereby reducing the buildup of the sugar in their bodies.</p>
                                <p className="indent-8">In the study of the GALT gene, scholars have determined that this segment of life-code produces the GALT protein, an enzyme responsible for breaking down galactose. When mutations alter the GALT gene, the protein’s structure changes, preventing it from performing its vital task. As a result, the body can no longer process galactose correctly.</p>
                                <p>&nbsp;</p>
                                <h3 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>Your Commissioned Task</h3>
                                <p>&nbsp;</p>
                                <p className="indent-8">Complete the chart below to describe the cause-and-effect relationship between the GALT gene, the GALT protein, and the cells of an individual with galactosemia. Record your observations in the Empress’s Scientific Ledger.</p>

                                <div className="space-y-4 not-prose mt-6">
                                    <div className="text-left">
                                      <p className="font-semibold">What happens with the gene</p>
                                    </div>
                                    <div className="p-2 border rounded-md font-bold text-center text-lg">Mutation in the GALT gene</div>

                                    <div className="flex flex-col items-center py-2">
                                        <p className="font-semibold text-sm text-muted-foreground">cause</p>
                                        <ArrowDown className="h-8 w-8 text-primary my-1" />
                                        <p className="font-semibold text-sm text-muted-foreground">effect</p>
                                    </div>

                                    <div className="text-left">
                                      <p className="font-semibold">What happens with the protein</p>
                                    </div>
                                    <Textarea placeholder="Your answer for the second box..." />

                                     <div className="flex flex-col items-center py-2">
                                        <p className="font-semibold text-sm text-muted-foreground">cause</p>
                                        <ArrowDown className="h-8 w-8 text-primary my-1" />
                                        <p className="font-semibold text-sm text-muted-foreground">effect</p>
                                    </div>

                                    <div className="text-left">
                                      <p className="font-semibold">What happens in the cells</p>
                                    </div>
                                    <Textarea placeholder="Your answer for the third box..." />

                                     <div className="flex flex-col items-center py-2">
                                        <p className="font-semibold text-sm text-muted-foreground">cause</p>
                                        <ArrowDown className="h-8 w-8 text-primary my-1" />
                                        <p className="font-semibold text-sm text-muted-foreground">effect</p>
                                    </div>

                                    <div className="text-left">
                                      <p className="font-semibold">What happens to the person</p>
                                    </div>
                                    <Textarea placeholder="Your answer for the fourth box..." />
                                </div>
                                <hr className="my-6" />
                                
                                <h3 className="text-2xl font-bold text-center">Investigation – Part I</h3>
                                <p>&nbsp;</p>
                                <h4 className="text-xl font-semibold text-center">Why do some mutations cause Galactosemia, and others do not?</h4>
                                <p>&nbsp;</p>
                                <p className="indent-8">The Empress’s Royal Academy has charged you with uncovering why certain alterations in the GALT gene lead to the illness known as Galactosemia, while others leave the bearer unharmed.</p>
                                <p className="indent-8">Within every living cell lies the code of life, a sequence of chemical bases known to scholars as nucleotides. When read by the cell’s machinery, these nucleotides form codons — groups of three symbols that instruct the cell which amino acids to join together in the crafting of a protein.</p>
                                <p className="indent-8">Each codon serves as a command. For instance, the codon CTG directs the cell to add the amino acid leucine to the growing chain. The full set of such instructions is called the Genetic Code, a universal lexicon shared by all creatures of the realm.</p>
                                <p className="indent-8">When a mutation alters a codon, the message may change — and the cell may place the wrong amino acid in the sequence. Since each amino acid possesses unique chemical properties, even a single misplaced one can reshape the entire protein, twisting its form and disrupting its function. Thus, a single change in the life-script can determine whether a protein performs its duty… or fails, bringing illness.</p>
                                <p className="indent-8">In the case of Galactosemia, scholars of the Academy have discovered that certain changes within the GALT gene cause the disorder, while others do not. Seven such mutations have been recorded in the Royal Archives and are presented in Table 1 below. This table lists the codon change caused by each mutation and indicates whether it is known to bring about the affliction.</p>
                                <p>&nbsp;</p>
                                <h3 style={{ textAlign: 'center', fontSize: '1.5rem' }} className="font-bold">Royal Research Procedure</h3>
                                <p>&nbsp;</p>
                                <ol className="list-decimal list-inside space-y-2 indent-8">
                                    <li>Consult the Codon Chart shown below to determine the amino acid change created by each mutation in Table 1. (Table 1 is located below the codon chart)</li>
                                    <li>Record your findings within Table 1, then proceed to answer the Part I Follow-Up Questions in the spaces below the table.</li>
                                </ol>
                                
                                <div className="my-6">
                                  <Image src="https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/2025-09-07T03%3A35%3A07_84193%2FGenetic-Code-01-1-1024x906.png?alt=media&token=cc08dbec-2d8f-4440-8940-4a99a095c8cc" alt="Genetic Code" width={1024} height={906} className="w-full h-auto" />
                                  <p className="text-sm text-center text-muted-foreground">Table 1. The Recorded Mutations of the GALT Gene</p>
                                </div>

                                <div className="my-6 overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-bold w-[5%]"></TableHead>
                                                <TableHead className="font-bold w-[20%]">Description of Mutation</TableHead>
                                                <TableHead className="font-bold w-[15%]">Codon Change</TableHead>
                                                <TableHead className="font-bold w-[10%]">Amino Acid Change</TableHead>
                                                <TableHead className="font-bold w-[20%]">Effect of Amino Acid Change</TableHead>
                                                <TableHead className="font-bold w-[5%]">Causes Galactosemia?</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>1</TableCell>
                                                <TableCell>C replaced with A at position 184</TableCell>
                                                <TableCell>CTG → ATG</TableCell>
                                                <TableCell>L → M</TableCell>
                                                <TableCell><Textarea /></TableCell>
                                                <TableCell>No</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>2</TableCell>
                                                <TableCell>C replaced with T at position 404</TableCell>
                                                <TableCell>TCG → TTG</TableCell>
                                                <TableCell className="flex items-center gap-1">S → <Input className="w-12 h-8 text-center" maxLength={1} /></TableCell>
                                                <TableCell><Textarea /></TableCell>
                                                <TableCell>Yes</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>3</TableCell>
                                                <TableCell>T replaced with A at position 498</TableCell>
                                                <TableCell>CCT → CCA</TableCell>
                                                <TableCell className="flex items-center gap-1">P → <Input className="w-12 h-8 text-center" maxLength={1} /></TableCell>
                                                <TableCell><Textarea /></TableCell>
                                                <TableCell>No</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>4</TableCell>
                                                <TableCell>A replaced with G at position 563</TableCell>
                                                <TableCell>CAG → CGG</TableCell>
                                                <TableCell className="flex items-center gap-1">Q → <Input className="w-12 h-8 text-center" maxLength={1} /></TableCell>
                                                <TableCell><Textarea /></TableCell>
                                                <TableCell>Yes</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>5</TableCell>
                                                <TableCell>C replaced with G at position 700</TableCell>
                                                <TableCell>CTA → GTA</TableCell>
                                                <TableCell className="flex items-center gap-1">L → <Input className="w-12 h-8 text-center" maxLength={1} /></TableCell>
                                                <TableCell><Textarea /></TableCell>
                                                <TableCell>No</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>6</TableCell>
                                                <TableCell>G replaced with T at position 855</TableCell>
                                                <TableCell>AAG → AAT</TableCell>
                                                <TableCell className="flex items-center gap-1">K → <Input className="w-12 h-8 text-center" maxLength={1} /></TableCell>
                                                <TableCell><Textarea /></TableCell>
                                                <TableCell>Yes</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>7</TableCell>
                                                <TableCell>G replaced with A at position 876</TableCell>
                                                <TableCell>ACG → ACA</TableCell>
                                                <TableCell className="flex items-center gap-1">T → <Input className="w-12 h-8 text-center" maxLength={1} /></TableCell>
                                                <TableCell><Textarea /></TableCell>
                                                <TableCell>No</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>

                                <h3 className="text-2xl font-bold text-center">Part 1 - Questions</h3>
                                <p>&nbsp;</p>
                                <ol className="list-decimal list-inside space-y-4">
                                    <li>
                                        What do the mutations that cause galactosemia have in common?
                                        <Textarea placeholder="Your answer here..." className="mt-2" />
                                    </li>
                                    <li>
                                        There are two different types of mutations in the table that do not result in galactosemia. Describe these types. How are they similar, and how are they different?
                                        <Textarea placeholder="Your answer here..." className="mt-2" />
                                    </li>
                                    <li>
                                        Explain in your own words why only certain mutations in the GALT gene cause galactosemia. Be sure to include information about how different mutations affect the function of the GALT protein.
                                        <Textarea placeholder="Your answer here..." className="mt-2" />
                                    </li>
                                </ol>
                                <hr className="my-6" />

                                <h3 className="text-2xl font-bold text-center">Investigation – Part II</h3>
                                <p>&nbsp;</p>
                                <h4 className="text-xl font-semibold text-center">Which citizens of Luminaria are afflicted with Galactosemia?</h4>
                                <p>&nbsp;</p>
                                <p className="indent-8">Throughout the Kingdom of Luminaria, the Royal Healers’ Guild performs a duty known as a Newborn Genetic Screening — a life-saving procedure conducted upon every child born under the Empress’s light. Within the first days of life, a few drops of blood are drawn from the infant’s heel and analyzed within the laboratories of the Royal Academy of Biological Sciences.</p>
                                <p className="indent-8">The purpose of this test is to search for hidden flaws within the DNA Code — mutations that may one day bring sickness if left undiscovered. The healers look for results that deviate from the realm’s normal ranges, and when such irregularities appear, further tests and treatments are quickly arranged.</p>
                                <p className="indent-8">To detect Galactosemia, the healers measure two vital signs within the blood:</p>
                                <ul className="list-disc list-inside indent-8">
                                    <li>The activity of the GALT protein, which governs the breakdown of galactose, and</li>
                                    <li>The level of galactose itself.</li>
                                </ul>
                                <p className="indent-8">Low GALT activity combined with high galactose concentration suggests that the child may carry the disorder. When such results arise, healers consult the genetic scrolls — performing a deeper test of the baby’s DNA sequences to search for mutations in the GALT gene. If confirmed, the family is counseled to begin a strict low-galactose diet, preventing the sugar from accumulating and causing harm.</p>
                                <p>&nbsp;</p>
                                <h3 style={{ textAlign: 'center', fontSize: '1.5rem' }} className="font-bold">Your Commissioned Task</h3>
                                <p>&nbsp;</p>
                                <p className="indent-8">You are now acting as a Royal Physician within the Empress’s service, reviewing the screening results for three newborn citizens of Luminaria. The Empress herself demands your careful analysis to ensure that every infant receives proper care and guidance.</p>
                                <ol className="list-decimal list-inside space-y-2 indent-8">
                                    <li>Examine the recorded results presented in Table 2 of your research ledger below.</li>
                                    <li>Using your knowledge of genetics and biochemical function, answer the Part II Follow-Up Questions that follow.</li>
                                </ol>
                                
                                <table className="w-full caption-bottom text-sm border my-6">
                                    <caption className="mt-4 text-sm text-muted-foreground">Table 2. Test results of three newborn patients</caption>
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"></th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Normal Range</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient 1</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient 2</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient 3</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle">GALT protein activity (U/Hb)</td>
                                            <td className="p-4 align-middle">15.9 - 26.4</td>
                                            <td className="p-4 align-middle">20.2</td>
                                            <td className="p-4 align-middle">0.18</td>
                                            <td className="p-4 align-middle">18.4</td>
                                        </tr>
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle">Galactose level (mg/dl)</td>
                                            <td className="p-4 align-middle">0 - 4.3</td>
                                            <td className="p-4 align-middle">2.1</td>
                                            <td className="p-4 align-middle">235</td>
                                            <td className="p-4 align-middle">3.2</td>
                                        </tr>
                                    </tbody>
                                </table>
                                
                                <h3 className="text-2xl font-bold text-center">Part 2 - Questions</h3>
                                <p>&nbsp;</p>
                                <ol className="list-decimal list-inside space-y-4">
                                    <li>
                                        Based on the test results, which patient(s) most likely have galactosemia? For the patient(s) who likely have galactosemia, which gene should be analyzed during genetic testing?
                                        <Textarea placeholder="Your answer here..." className="mt-2" />
                                    </li>
                                    <li>
                                        What differences might be found in the gene, as compared to the gene in a person who does not have galactosemia?
                                        <Textarea placeholder="Your answer here..." className="mt-2" />
                                    </li>
                                    <li>
                                        What are the health benefits of putting the affected patient(s) on a low-galactose diet?
                                        <Textarea placeholder="Your answer here..." className="mt-2" />
                                    </li>
                                </ol>
                                <hr className="my-6" />
                                <h3 className="text-2xl font-bold text-center">Tutorial Videos from the Academy of Biological Sciences</h3>
                                <div className="flex justify-center flex-col items-center space-y-4">
                                <iframe width="560" height="315" src="https://www.youtube.com/embed/_9wnC5pta78?si=0RWZW-X2601mCYkK" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
                                <iframe width="560" height="315" src="https://www.youtube.com/embed/tfZfLDRu39c?si=GJGO7ql--ZzvT_ds" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-center gap-4">
                            <div className="text-center p-4 border-t border-dashed w-full">
                                <h4 className="font-bold">How to Save as PDF:</h4>
                                <ol className="list-decimal list-inside text-sm text-muted-foreground mt-2">
                                    <li>Click the "Save as PDF" button below.</li>
                                    <li>In the print window that opens, find the "Destination" or "Printer" setting.</li>
                                    <li>Change the destination to "Save as PDF".</li>
                                    <li>Include your name in the file name before saving.</li>
                                </ol>
                            </div>
                            <Button onClick={() => window.print()}>Save as PDF</Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
}
