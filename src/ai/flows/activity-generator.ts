
'use server';
/**
 * @fileOverview A flow for generating random, fantasy-themed classroom activities.
 *
 * - generateActivity - A function that calls the AI to generate an activity.
 * - Activity - The output type for the generated activity.
 */
import '@/ai/genkit'; // Ensure Genkit is initialized
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ActivitySchema = z.object({
  title: z.string().describe('A short, catchy, fantasy-themed title for the activity (e.g., "Design a Coat of Arms").'),
  description: z.string().describe('A brief, one or two sentence description of the activity for the teacher to announce to the class.'),
});
export type Activity = z.infer<typeof ActivitySchema>;

const activityPrompt = ai.definePrompt({
    name: 'activityPrompt',
    output: { schema: ActivitySchema },
    prompt: `You are a creative assistant for a teacher using a fantasy-themed classroom management game.

Generate a single, fun, and simple classroom activity suitable for children aged 8-12. The activity should take 5-15 minutes and require minimal materials (paper, pencils, classroom objects).

The activity must have a clear fantasy or medieval theme (e.g., dragons, knights, potions, castles, magic).

Do not repeat activities from this list:
- Design a Coat of Arms
- Draw a Mythical Creature
- Map a Treasure Island
- Write a Potion Recipe
- Invent a New Spell
- Describe a Dragon's Lair
- Fantasy Charades
- Walk Like A...
- Build a Castle
- Create a Paper-Plate Shield
- Wizard's Wand Crafting
- Create a Kingdom Law
`,
});

export async function generateActivity(): Promise<Activity> {
  const {output} = await activityPrompt();
  return output!;
}
