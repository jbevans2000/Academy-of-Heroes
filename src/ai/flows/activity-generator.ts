
'use server';
/**
 * @fileOverview A flow for generating random, fantasy-themed classroom activities.
 *
 * - generateActivity - A function that calls the AI to generate an activity.
 * - ActivityInput - The input type for the generateActivity function.
 * - Activity - The return type for the generateActivity function.
 */
import '@/ai/genkit'; // Ensure Genkit is initialized
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ActivityInputSchema = z.object({
  activityType: z.enum(['Mental', 'Physical']),
  gradeLevel: z.enum(['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade']),
});
export type ActivityInput = z.infer<typeof ActivityInputSchema>;

const ActivitySchema = z.object({
  title: z.string().describe('A short, catchy, fantasy-themed title for the activity (e.g., "Elven Riddles").'),
  description: z.string().describe('A brief, one or two sentence description of the activity for the teacher to announce to the class. For PHYSICAL tasks, this should include both the fantasy instructions for the students and a separate "Teacher Instructions" section explaining the real-world actions.'),
  documentContent: z.string().optional().describe('For MENTAL tasks, this should contain a document for the teacher to display or download, formatted in simple Markdown. For PHYSICAL tasks, this should be an empty string.'),
});
export type Activity = z.infer<typeof ActivitySchema>;

const activityPrompt = ai.definePrompt({
    name: 'activityPrompt',
    input: { schema: ActivityInputSchema },
    output: { schema: ActivitySchema },
    prompt: `You are a creative assistant for a teacher using a fantasy-themed classroom management game.

Generate a single, fun, and simple classroom activity appropriate for {{gradeLevel}} students. The activity should take 5-15 minutes and require minimal materials (paper, pencils, classroom objects).

The activity MUST be a {{activityType}} task.
- A Mental task should involve thinking, writing, drawing, or problem-solving.
- A Physical task should involve safe, simple movement or acting within a classroom setting.

The activity must have a clear fantasy or medieval theme (e.g., dragons, knights, potions, castles, magic).

If the task is 'Mental', you MUST generate content for the 'documentContent' field. This content should be a simple document (formatted in Markdown with headings, lists, etc.) that the teacher can either display on screen or print for the students. Examples: a list of riddles, a set of instructions for a creative writing prompt, a table for a code-breaking activity.
If the task is 'Physical', the 'documentContent' field MUST be an empty string.

For PHYSICAL tasks, the 'description' field MUST contain two parts separated by a markdown horizontal rule:
1.  The fun, fantasy-themed instructions for the teacher to announce to the students.
2.  A clear, simple "Teacher Instructions" section below it that explains the real-world actions students should perform (e.g., "Teacher Instructions: Have students stand up and stretch their arms to the ceiling, then touch their toes."). This part is for the teacher only.

Example of a Physical task description:
"Hark, young squires! You must mimic the mighty Golem of the Gray Mountains! Stand tall and stretch your arms to the sky like stony peaks, then bend down to touch the cavern floor!

---

**Teacher Instructions:** Have students stand up and do a simple stretch, reaching for the ceiling and then touching their toes."

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

export async function generateActivity(input: ActivityInput): Promise<Activity> {
  const {output} = await activityPrompt(input);
  return output!;
}
