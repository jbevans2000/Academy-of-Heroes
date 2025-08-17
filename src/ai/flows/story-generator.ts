
'use server';
/**
 * @fileOverview A flow for generating fantasy stories for classroom quests.
 *
 * - generateStory - A function that calls the AI to generate story content and a title.
 * - StoryGeneratorInput - The input type for the generateStory function.
 * - StoryGeneratorOutput - The return type for the generateStory function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const StoryGeneratorInputSchema = z.object({
  gradeLevel: z.enum(['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade']),
  keyElements: z.string().optional().describe('A comma-separated list of key characters, items, or plot points to include in the story. Only used for standalone stories.'),
  mode: z.enum(['standalone', 'saga']),
  
  // Optional context for saga mode
  previousHubSummary: z.string().optional().describe("A summary of a previous quest hub's entire story, for providing long-term context."),
  currentHubSummary: z.string().optional().describe("A summary of the story so far within the current quest hub."),
  previousChapterStory: z.string().optional().describe("The full text of the immediately preceding chapter."),
});
export type StoryGeneratorInput = z.infer<typeof StoryGeneratorInputSchema>;

const StoryGeneratorOutputSchema = z.object({
  title: z.string().describe("A short, exciting, fantasy-themed chapter title that fits the story."),
  storyContent: z.string().describe("The generated story content, formatted as simple HTML with paragraph tags."),
});
export type StoryGeneratorOutput = z.infer<typeof StoryGeneratorOutputSchema>;

const storyPrompt = ai.definePrompt({
    name: 'storyPrompt',
    input: { schema: StoryGeneratorInputSchema },
    output: { schema: StoryGeneratorOutputSchema },
    prompt: `You are The Oracle, a master storyteller crafting an epic saga for a classroom of {{gradeLevel}} students. Your task is to write the next chapter of their adventure.

First, you must create a short, exciting, fantasy-themed chapter title that fits the story you are about to write.

Then, write the chapter's story content.

{{#if isSaga}}
    You are weaving a continuous tale. Use the following context to ensure the narrative flows logically.

    {{#if previousHubSummary}}
    **Summary of the Previous Saga:**
    {{{previousHubSummary}}}
    {{/if}}

    {{#if currentHubSummary}}
    **Summary of the Current Saga So Far:**
    {{{currentHubSummary}}}
    {{/if}}

    {{#if previousChapterStory}}
    **Full Text of the Previous Chapter:**
    {{{previousChapterStory}}}
    {{/if}}

    Write the next chapter in the saga. It must logically follow all the provided context.
{{else}}
    You are telling a standalone, self-contained story for a single lesson. The story should be a complete short adventure in one chapter.
    It must include these key elements: **{{keyElements}}**.
{{/if}}

The story must be engaging, age-appropriate for {{gradeLevel}}, and conclude in a way that is satisfying for a single chapter. Format the story content as simple HTML, with each paragraph wrapped in <p> tags.
`,
});

export async function generateStory(input: StoryGeneratorInput): Promise<StoryGeneratorOutput> {
  const {output} = await storyPrompt({
    ...input,
    isSaga: input.mode === 'saga',
  });
  if (!output) {
    throw new Error('The Oracle is silent. The AI failed to generate a story.');
  }
  return output;
}

const summaryPrompt = ai.definePrompt({
    name: 'summaryPrompt',
    input: { schema: z.object({ oldSummary: z.string().optional(), newChapter: z.string() }) },
    prompt: `You are a scribe, responsible for keeping the official history of a fantasy saga. Update the story summary with the events from the new chapter.

{{#if oldSummary}}
**Previous Summary:**
{{{oldSummary}}}
{{/if}}

**Newly Added Chapter:**
{{{newChapter}}}

Based on the new chapter, provide a new, concise, and updated summary of the entire saga so far. The summary should be a single paragraph. Do not add any introductory text like "Here is the new summary". Just provide the summary text.
`,
})

export async function generateSummary(oldSummary: string | undefined, newChapter: string): Promise<string> {
    const {text} = await summaryPrompt({ oldSummary, newChapter });
    return text;
}
