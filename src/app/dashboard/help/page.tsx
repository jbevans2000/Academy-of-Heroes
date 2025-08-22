
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, Shield, Heart, Wand2 } from "lucide-react";
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
                    From your dashboard, click the "Change Avatar" button. As you gain levels, you will unlock new sets of avatars for your class. The Change Avatar page will show you all of the looks you have unlocked so far, grouped by the level at which you earned them. Select any unlocked avatar and click "Save New Avatar" to change your appearance.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Class Powers Explained</CardTitle>
                <CardDescription>All powers can only be used once per round during a Boss Battle.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="healer">
                        <AccordionTrigger className="text-xl font-headline"><Heart className="mr-2 h-5 w-5 text-green-500" />Healer Powers</AccordionTrigger>
                        <AccordionContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="h-1">
                                    <AccordionTrigger>Nature's Guidance (Lvl 1, 3 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>You call upon the spirits of nature to direct your path. One incorrect option on a multiple choice question will be revealed to you.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="h-2">
                                    <AccordionTrigger>Lesser Heal (Lvl 2, 3 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>You call upon the powers of life to soothe your party’s wounds! You can target up to 2 allies who are not at full health. The power will heal for 1d6 + your Level, divided among the targets.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="h-3">
                                    <AccordionTrigger>Solar Empowerment (Lvl 4, 8 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>You intertwine the light of the sun into the energies of up to 3 allied Mages. Their maximum hit points temporarily increase for the duration of the battle. This effect does not stack if cast on the same Mage multiple times.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="h-4">
                                    <AccordionTrigger>Enduring Spirit (Lvl 6, 10 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>You pierce the veil of reality and return an ally’s spirit to their body. This power targets one fallen ally (HP at 0) and restores them to 10% of their maximum HP.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="h-5">
                                    <AccordionTrigger>Focused Restoration (Lvl 8, 12 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>You point your healing energy towards a single ally, restoring a large amount of their health. The target must have 50% or less of their maximum HP remaining. The heal amount is 3d8 + your Level.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="h-6">
                                    <AccordionTrigger>Cosmic Divination (Lvl 10, 15 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>Peer into the future, allowing the team to vote on skipping the current question. If the vote passes, the round ends immediately. This power deals damage equal to your Level regardless of the vote outcome. It can only be used twice per battle by the entire party.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="h-7">
                                    <AccordionTrigger>Regeneration Field (Lvl 13, 35 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                         <p>Heals all living allies for 25% of your Level (rounded up). The healing only applies to allies who are not at maximum HP.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="h-8">
                                    <AccordionTrigger>Divine Sacrifice (Lvl 15, 5 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                         <p>Your HP falls to 0, but all players gain +5 Max HP, restore 10 HP, and get a 25% XP boost.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="mage">
                        <AccordionTrigger className="text-xl font-headline"><Wand2 className="mr-2 h-5 w-5 text-blue-500" />Mage Powers</AccordionTrigger>
                        <AccordionContent>
                             <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="m-1">
                                    <AccordionTrigger>Wildfire (Lvl 1, 3 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>You prepare a volatile spell. If your answer to the question is correct, the spell triggers, dealing an extra 2d6 + your Level in Power Damage to the boss.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="m-2">
                                    <AccordionTrigger>Psionic Aura (Lvl 2, 4 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>You call upon the leylines to recharge the arcane potential of up to two allies. Targets must be at or below 75% of their max MP. The power restores 1d6 + your Level in MP, divided among the targets.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="m-3">
                                    <AccordionTrigger>Sorcerer's Intuition (Lvl 5, 10 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>You call upon the psychic winds to enhance your knowledge. When you cast this, damage equal to 50% of your Level (rounded up) is immediately added to the team's Base Damage for the round. This damage is dealt regardless of whether your answer is correct. You can only use this power 3 times per battle.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="m-4">
                                    <AccordionTrigger>Psychic Flare (Lvl 7, 20 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>A teammate of your choice replenishes ALL of their magic points.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="m-5">
                                    <AccordionTrigger>Elemental Fusion (Lvl 9, 25 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                         <p>Your party scores DOUBLE base damage for all correct answers. (Max 1 use per battle)</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="m-6">
                                    <AccordionTrigger>Mage Shield (Lvl 11, 30 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                         <p>Shield 3 players of your choice, making them immune to damage for 3 rounds.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="m-7">
                                    <AccordionTrigger>Chaos Storm (Lvl 13, 40 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                         <p>Deals a massive 3d20 + your Level in damage. (Max 1 use per battle)</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="m-8">
                                    <AccordionTrigger>Arcane Sacrifice (Lvl 15, 5 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                         <p>Your HP falls to zero, but all other players have their power slots restored and gain a 25% XP bonus.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="guardian">
                        <AccordionTrigger className="text-xl font-headline"><Shield className="mr-2 h-5 w-5 text-amber-500" />Guardian Powers</AccordionTrigger>
                        <AccordionContent>
                             <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="g-1">
                                    <AccordionTrigger>Guard (Lvl 1, 8 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>Shield 3 players this round, redirecting a portion of the damage to themselves.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="g-2">
                                    <AccordionTrigger>Intercept (Lvl 3, 10 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                         <p>Answer a question on a teammate's behalf. A correct answer deals 5 base damage to the boss.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="g-3">
                                    <AccordionTrigger>Absorb (Lvl 5, 15 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>Soak an amount of damage for the party that is TRIPLE your current level.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="g-4">
                                    <AccordionTrigger>Berserker Strike (Lvl 7, 18 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>Roll 1d20. On 11+, deal that much damage + your level. On 1-10, you take 5 damage.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="g-5">
                                    <AccordionTrigger>Arcane Redirect (Lvl 9, 20 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>Causes all damage done by Wildfires to be tripled this round.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="g-6">
                                    <AccordionTrigger>Zen Shield (Lvl 11, 25 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>Shields the entire team from one instance of damage from the boss.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="g-7">
                                    <AccordionTrigger>Inspiring Strike (Lvl 13, 30 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>Inspires allies, causing TRIPLE base damage for the party on a hit. (1 use per battle)</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="g-8">
                                    <AccordionTrigger>Sacrifice (Lvl 15, 5 MP)</AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none">
                                        <p>Your HP drops to 0, but all allies receive a 50% XP bonus for the battle.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
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
