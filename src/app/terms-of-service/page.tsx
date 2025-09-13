
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
                            <CardTitle className="text-4xl font-headline">Terms of Service</CardTitle>
                            <CardDescription>Last Updated: August 2025</CardDescription>
                        </CardHeader>
                        <CardContent className="prose prose-lg max-w-none dark:prose-invert">
                            <p>Welcome to The Academy of Heroes. These Terms of Service ("Terms") govern your access to and use of our application and services. By creating an account or using our platform, you agree to be bound by these Terms.</p>
                            
                            <h3>1. User Accounts</h3>
                            <p>You are responsible for maintaining the confidentiality of your account login information, including your password. You are responsible for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. Accounts are intended for individual use by a single student within their designated class, as managed by their teacher.</p>

                            <h3>2. Code of Conduct</h3>
                            <p>You agree not to use the platform to:</p>
                            <ul>
                                <li>Engage in any activity that is unlawful, harmful, threatening, abusive, or harassing.</li>
                                <li>Attempt to disrupt the integrity or performance of the service by cheating, exploiting software bugs, or using unauthorized automated scripts.</li>
                                <li>Post or transmit any content that is inappropriate, offensive, or violates your school's acceptable use policies.</li>
                                <li>Impersonate another person, student, or teacher.</li>
                            </ul>
                            <p>Violation of this Code of Conduct may result in the suspension or termination of your account.</p>

                            <h3>3. Role of the Teacher</h3>
                            <p>Your teacher acts as the administrator for your classroom's instance of the game. They have the ability to manage student accounts within their class, view progress, award or deduct in-game currency/points, and customize educational content. We are not responsible for the specific content (e.g., quests, battle questions) created by individual teachers.</p>
                            
                            <h3>4. Account Termination</h3>
                            <p>We reserve the right to suspend or terminate your account at our discretion if you violate these Terms. Your teacher also has the right to remove you from their class for academic or disciplinary reasons, which may result in the deactivation of your account for that class.</p>

                            <h3>5. Disclaimer of Warranties</h3>
                            <p>The service is provided on an "as is" and "as available" basis, without any warranties of any kind, express or implied. We do not guarantee that the service will be uninterrupted, secure, or free from errors or bugs.</p>
                            
                            <h3>6. Limitation of Liability</h3>
                            <p>To the fullest extent permitted by law, The Academy of Heroes shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, resulting from your use of the service.</p>

                            <h3>7. Changes to the Terms</h3>
                            <p>We may modify these Terms from time to time. We will provide notice of significant changes, and your continued use of the platform after such changes have been made will constitute your acceptance of the new Terms.</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
