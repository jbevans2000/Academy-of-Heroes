
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gavel, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsOfServicePage() {
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
                            <Gavel className="h-16 w-16 mx-auto text-primary mb-4" />
                            <CardTitle className="text-4xl font-headline">The Luminarian Pact</CardTitle>
                            <CardDescription>Terms of Service for The Academy of Heroes</CardDescription>
                        </CardHeader>
                        <CardContent className="prose prose-lg max-w-none dark:prose-invert">
                            <p>By creating a hero and entering the realm of The Academy of Heroes, you agree to abide by this sacred pact. This pact governs your conduct and ensures the realm remains a place of learning and adventure for all.</p>
                            
                            <h3>1. Your Hero's Identity (Account)</h3>
                            <p>You are responsible for safeguarding your login credentials. Do not share your password with others. The actions taken by your hero are your responsibility. Accounts are intended for individual use by a single student within their designated class.</p>

                            <h3>2. Code of Conduct</h3>
                            <p>All heroes must conduct themselves with honor. You agree not to:</p>
                            <ul>
                                <li>Use the platform for any unlawful purpose or to harass, abuse, or harm another person.</li>
                                <li>Attempt to disrupt the realm through cheating, exploiting bugs, or using unauthorized scripts.</li>
                                <li>Post any content that is offensive, inappropriate, or violates your school's code of conduct. The chat is a tool for collaboration, not conflict.</li>
                                <li>Impersonate another hero or a teacher.</li>
                            </ul>

                            <h3>3. The Role of the Teacher (Grandmaster)</h3>
                            <p>Your teacher is the Grandmaster of your classroom instance. They have the authority to manage their students, award or revoke points, and oversee all classroom activities. We are not responsible for the content (quests, battles, etc.) created by your teacher.</p>
                            
                            <h3>4. Termination of Service</h3>
                            <p>We reserve the right to banish any hero (suspend or terminate an account) who violates this pact. Your teacher also has the right to remove you from their class for academic or disciplinary reasons. If you wish to leave the Academy, you may request your teacher to delete your account.</p>

                            <h3>5. The Realm's Integrity (Disclaimer of Warranty)</h3>
                            <p>The realm is provided "as is," without warranty of any kind. While our mages and engineers work tirelessly, we cannot guarantee the realm will be free from glitches or dragon attacks (downtime).</p>

                            <h3>6. Amendments to the Pact</h3>
                            <p>This pact may be updated as the realm grows and evolves. We will notify all users of significant changes. Continued use of the platform after such changes constitutes acceptance of the new pact.</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
