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
            <h1 className="text-4xl font-bold">Support Center</h1>
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
                  <AccordionTrigger>How do I reset my password?</AccordionTrigger>
                  <AccordionContent>
                    [Placeholder: Explain the password reset process here. For example, "If you are a student, please ask your teacher to help you reset your password. Teachers can use the 'Forgot Password' link on the teacher login page."]
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Why is my class code not working?</AccordionTrigger>
                  <AccordionContent>
                    [Placeholder: Explain common issues with class codes. For example, "Please double-check the code with your teacher. Make sure you are entering it exactly as it was provided, including any hyphens."]
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Can I change my character's class?</AccordionTrigger>
                  <AccordionContent>
                    [Placeholder: Explain character class changes. For example, "Once a character has been created, its class cannot be changed. You will need to create a new character, which will start with fresh progress."]
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
              <CardDescription>
                If you can't find the answer you're looking for, please reach out to us.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <Mail className="h-8 w-8 text-primary" />
                <p className="text-muted-foreground">
                    [Placeholder: Provide your support email address or contact instructions here.]
                </p>
                 <Button asChild>
                    <a href="mailto:support@example.com">Email Support</a>
                </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
