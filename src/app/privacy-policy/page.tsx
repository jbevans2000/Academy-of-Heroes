
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                <Link href="/" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Home
                    </Button>
                </Link>
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    <Card>
                        <CardHeader className="text-center">
                            <ScrollText className="h-16 w-16 mx-auto text-primary mb-4" />
                            <CardTitle className="text-4xl font-headline">The Oracle's Decree on Privacy</CardTitle>
                            <CardDescription>Last updated: August 2025</CardDescription>
                        </CardHeader>
                        <CardContent className="prose prose-lg max-w-none dark:prose-invert">
                            <p>Greetings, Hero. The Oracle values your trust and seeks to protect the knowledge you share. This decree outlines how we gather, protect, and use the information recorded within the realm of The Academy of Heroes.</p>
                            
                            <h3>The Knowledge We Gather</h3>
                            <p>To create your legend, we must record certain details:</p>
                            <ul>
                                <li><strong>Hero's Identity:</strong> Your chosen character name, student name, and the credentials (username/email and password) used to enter the realm.</li>
                                <li><strong>Classroom Allegiance:</strong> Information linking you to your teacher's specific class via the Class Code.</li>
                                <li><strong>Chronicles of Progress:</strong> Your deeds are recorded, including your level, XP, gold, quest progress, and battle responses. This allows your teacher to guide your journey.</li>
                                <li><strong>Magical Traces (Cookies):</strong> Like all modern scrying pools, our application uses small magical traces to remember your session and keep you logged in. These are essential for the realm's function.</li>
                            </ul>

                            <h3>How We Use This Knowledge</h3>
                            <p>Your information serves one purpose: to power your educational adventure. It allows:</p>
                            <ul>
                                <li>Your teacher to view your progress and manage the classroom game.</li>
                                <li>The system to calculate your rewards, level-ups, and battle outcomes.</li>
                                <li>Us to maintain and improve the security and functionality of the realm.</li>
                            </ul>
                            <p>We declare under solemn oath that your personal knowledge will never be sold to merchant guilds or shared with wandering bards for tales and songs.</p>

                             <h3>Protecting the Archives</h3>
                            <p>Our archives are protected by powerful enchantments (industry-standard security measures like encryption and secure cloud infrastructure). Access to sensitive information is restricted to the Grandmaster (your teacher) and the keepers of the Academy (our developers) for maintenance purposes only.</p>

                            <h3>Your Rights and Choices</h3>
                            <p>You have the right to request the removal of your legend from our chronicles. Such requests must be made through your teacher, who can initiate the process to delete your account. Upon deletion, your Hero's Identity and Chronicles of Progress will be permanently erased from our active archives.</p>
                            
                            <h3>Changes to This Decree</h3>
                            <p>The Oracle may, from time to time, issue new decrees. Should this scroll be updated, we will make all heroes and teachers aware of the changes upon their next entry into the realm.</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
