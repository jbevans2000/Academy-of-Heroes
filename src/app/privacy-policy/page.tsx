
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
                            <CardTitle className="text-4xl font-headline">Privacy Policy</CardTitle>
                            <CardDescription>Last updated: August 2025</CardDescription>
                        </CardHeader>
                        <CardContent className="prose prose-lg max-w-none dark:prose-invert">
                            <p>Welcome to The Academy of Heroes. This Privacy Policy explains how we collect, use, and protect information in relation to our services. Your privacy is important to us, and we are committed to protecting it.</p>
                            
                            <h3>Information We Collect</h3>
                            <p>To provide our services, we collect the following types of information:</p>
                            <ul>
                                <li><strong>Account Information:</strong> When a user registers, we collect their name, character name, and login credentials (either email/password or username/password).</li>
                                <li><strong>Classroom Information:</strong> We use a unique Class Code to associate student accounts with their respective teacher's classroom.</li>
                                <li><strong>Gameplay and Progress Data:</strong> We collect data generated through gameplay, such as a student's level, XP, gold, quest progress, and answers to in-game quizzes and battles. This information is essential for the educational and gamified aspects of the application.</li>
                                <li><strong>Usage Information (Cookies):</strong> We use cookies and similar technologies to maintain user sessions and ensure the functionality of our application. These are necessary for the service to work correctly.</li>
                            </ul>

                            <h3>How We Use Your Information</h3>
                            <p>The information we collect is used exclusively to provide and improve the service. Specifically, we use it to:</p>
                            <ul>
                                <li>Operate and maintain the application.</li>
                                <li>Allow teachers to view student progress and manage their classroom's game.</li>
                                <li>Enable the calculation of in-game rewards, level progression, and battle outcomes.</li>
                                <li>Improve the security, functionality, and performance of our platform.</li>
                            </ul>
                            <p>We do not sell your personal information to third parties or use it for advertising purposes.</p>

                             <h3>Data Security</h3>
                            <p>We implement industry-standard security measures, including encryption and secure cloud infrastructure, to protect your information from unauthorized access, disclosure, or alteration. Access to sensitive data is restricted to authorized personnel (such as your teacher and our developers for maintenance) only.</p>

                            <h3>Your Rights and Data Control</h3>
                            <p>You have rights over your personal data. A student's parent or legal guardian can request the deletion of their child's account by contacting the associated teacher. The teacher can then initiate the account deletion process through their dashboard, which will permanently remove the student's personal information and gameplay data from our active systems.</p>
                            
                            <h3>Changes to This Policy</h3>
                            <p>We may update this Privacy Policy from time to time. If we make significant changes, we will notify users through the application or by other means so you can review the changes. Your continued use of the service after such notification will constitute your acceptance of the new policy.</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
