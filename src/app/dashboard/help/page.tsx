
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";

export default function StudentHelpPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center">
            <LifeBuoy className="h-16 w-16 mx-auto text-primary mb-4" />
            <h1 className="text-4xl font-bold">Hero's Handbook</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Everything you need to know to succeed on your quest.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What are XP and Gold?</AccordionTrigger>
                  <AccordionContent>
                    <strong>XP (Experience Points)</strong> are what you earn for completing quests and battles. The more XP you get, the higher your Level becomes! <strong>Gold</strong> is the currency of the realm. Your teacher may award you Gold, which you can use to buy special items or powers in the future.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>What do HP and MP mean?</AccordionTrigger>
                  <AccordionContent>
                    <strong>HP (Hit Points)</strong> is your health. If you answer a question wrong in a Boss Battle, you might lose HP. If it reaches zero, you might be knocked out of the fight! <strong>MP (Magic Points)</strong> is your energy for using special powers. Each class (Mage, Guardian, Healer) has unique powers that cost MP to use.
                  </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-3">
                  <AccordionTrigger>How do I go on quests?</AccordionTrigger>
                  <AccordionContent>
                    From your dashboard, click the "Embark on Your Quest" button to open the World Map. From there, you can click on an unlocked area (a Hub) to see the chapters inside. Click on the next available chapter to read the story and see your teacher's lesson!
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>What is a Boss Battle?</AccordionTrigger>
                  <AccordionContent>
                    A Boss Battle is a live, real-time quiz for the whole class! When your teacher starts a battle, click the "Ready for Battle" button on your dashboard to join the waiting room. When the battle begins, a question will appear. Answer it as fast as you can! Correct answers damage the boss, while incorrect answers might hurt you.
                  </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-5">
                  <AccordionTrigger>How do I change my character's avatar?</AccordionTrigger>
                  <AccordionContent>
                    At this time, your character's avatar is chosen upon creation and cannot be changed. Choose wisely, hero!
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
           <div className="text-center">
             <Link href="/dashboard" passHref>
                <Button size="lg" variant="outline">
                    <ArrowLeft className="mr-2 h-5 w-5" /> Return to Dashboard
                </Button>
            </Link>
           </div>
        </div>
      </main>
    </div>
  );
}
