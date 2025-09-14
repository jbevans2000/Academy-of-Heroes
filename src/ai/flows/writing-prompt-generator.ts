
'use server';
/**
 * @fileOverview A flow for generating writing prompts using AI.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the input schema for the writing prompt generator
const WritingPromptInputSchema = z.object({
  gradeLevel: z.string().describe('The grade level for the writing prompt, e.g., "5th Grade".'),
  promptType: z.enum(['Fiction', 'Non-Fiction']).describe('The type of writing prompt to generate.'),
  genreOrSubject: z.string().describe('The genre (for fiction) or subject (for non-fiction).'),
  specificTopic: z.string().optional().describe('An optional more specific topic for non-fiction prompts.'),
});

export type WritingPromptInput = z.infer<typeof WritingPromptInputSchema>;

// Define the prompt template
const writingPrompt = ai.definePrompt({
    name: 'writingPromptGenerator',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: WritingPromptInputSchema },
    output: { format: 'text' },
    prompt: `You are an expert curriculum designer specializing in creating engaging, grade-appropriate writing prompts. Generate a single, unique, and creative writing prompt based on the following criteria:

Grade Level: {{{gradeLevel}}}
Prompt Type: {{{promptType}}}
{{#ifEquals promptType 'Fiction'}}
Genre: {{{genreOrSubject}}}
{{else}}
Subject: {{{genreOrSubject}}}
{{/ifEquals}}
{{#if specificTopic}}
Specific Topic: {{{specificTopic}}}
{{/if}}

The prompt should be creative, thought-provoking, and suitable for a classroom setting. It should be presented as a single paragraph.
`,
});


// Define the main flow function
const generateWritingPromptFlow = ai.defineFlow(
  {
    name: 'generateWritingPromptFlow',
    inputSchema: WritingPromptInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await writingPrompt(input);
    return text;
  }
);

// Export a wrapper function to be called from the client
export async function generateWritingPrompt(input: WritingPromptInput): Promise<string> {
    return generateWritingPromptFlow(input);
}
