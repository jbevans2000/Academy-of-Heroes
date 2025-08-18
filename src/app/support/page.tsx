
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, Mail } from "lucide-react";

export default function SupportPage() {
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
          <div className="text-center">
            <LifeBuoy className="h-16 w-16 mx-auto text-primary mb-4" />
            <h1 className="text-4xl font-bold font-headline">The Hero's Guild - Support Hall</h1>
            <p className="text-lg text-muted-foreground mt-2">
              We're here to help you on your quest.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Find answers to common questions about the Academy of Heroes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>My student forgot their password. What do I do?</AccordionTrigger>
                  <AccordionContent>
                    As a teacher, you have the authority to reset a student's password. Navigate to their profile on your main dashboard, where you will find the option to set a new password for them. The student can then log in with their new credentials.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Why is my class code not working?</AccordionTrigger>
                  <AccordionContent>
                    Please double-check the code with your teacher. The runes must be entered exactly as they were provided, including any hyphens. Class codes are case-sensitive. If problems persist, your teacher can verify the code from their dashboard.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Can I change my character's class?</AccordionTrigger>
                  <AccordionContent>
                    A hero's path, once chosen, is set in stone. The destiny you select upon creation (Guardian, Healer, or Mage) cannot be changed. To walk a new path, you must create a new hero, which will start with fresh progress.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send a Raven</CardTitle>
              <CardDescription>
                If the scrolls of knowledge here do not provide an answer, send a message to our scribes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <Mail className="h-8 w-8 text-primary" />
                <p className="text-muted-foreground">
                    For technical issues or other inquiries, contact our support guild at:
                </p>
                 <Button asChild>
                    <a href="mailto:support@academy-heroes.com">support@academy-heroes.com</a>
                </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
