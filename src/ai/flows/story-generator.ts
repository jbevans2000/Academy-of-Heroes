
'use server';
/**
 * @fileOverview An AI flow for generating generic fantasy quest chapters.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the output schema for the structured response
const StoryGeneratorOutputSchema = z.object({
  title: z.string().describe('A creative, fantasy-themed title for the chapter.'),
  storyContent: z.string().describe('A 4-5 paragraph story written in the second person ("You..."). The story should be generic, not use proper names, and present a fantasy-based objective for the hero to complete. The output should be formatted as an HTML string with paragraphs wrapped in <p> tags.'),
});

export type StoryGeneratorOutput = z.infer<typeof StoryGeneratorOutputSchema>;

// Define the prompt template
const storyPrompt = ai.definePrompt({
    name: 'storyGeneratorPrompt',
    model: 'googleai/gemini-1.5-flash',
    output: { schema: StoryGeneratorOutputSchema },
    prompt: `You are a master storyteller specializing in short, engaging fantasy quests for an educational game.

Generate a single, generic quest chapter.

Follow these rules strictly:
1.  **Perspective:** Write the entire story in the second person (e.g., "You enter the forest...", "You see a strange glow...").
2.  **Content:** The story must be 4-5 paragraphs long. It should describe a simple, fantasy-based objective for the hero to complete (e.g., find an artifact, decipher a riddle, follow a mysterious map).
3.  **No Specifics:** Do not use any proper names for people, places, or items. Keep it generic (e.g., "the old man," "the dark forest," "the glowing sword").
4.  **Output Format:** Provide a creative, fantasy-themed title for the chapter. The story content itself must be formatted as an HTML string, with each paragraph wrapped in \`<p>\` tags.
`,
});

// Define the main flow function
const generateStoryFlow = ai.defineFlow(
  {
    name: 'generateStoryFlow',
    outputSchema: StoryGeneratorOutputSchema,
  },
  async () => {
    const { output } = await storyPrompt();
    if (!output) {
        throw new Error("The AI failed to generate a valid story.");
    }
    return output;
  }
);

// Export a wrapper function to be called from the client
export async function generateStory(): Promise<StoryGeneratorOutput> {
    return generateStoryFlow();
}
